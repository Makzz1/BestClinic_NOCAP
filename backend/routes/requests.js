const express = require('express');
const PatientRequest = require('../models/PatientRequest');
const Token = require('../models/Token');
const Patient = require('../models/Patient');
const Counter = require('../models/Counter');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { getDoctorQueueStatus, getToday } = require('../services/queueService');

const router = express.Router();

// POST /api/requests - Public route to create a patient request
router.post('/', async (req, res) => {
  try {
    const {
      patientName, email, phone, age, sex, maritalStatus,
      visitPurpose, reason, doctorId
    } = req.body;

    const today = getToday();

    // Prevent duplicate pending requests for the same phone number today
    const existingRequest = await PatientRequest.findOne({ phone, date: today, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ message: 'A request with this phone number is already pending for today.' });
    }

    // Optional: Prevent if they already have an active token for today
    const activeToken = await Token.findOne({ phone, date: today, status: { $in: ['waiting', 'serving'] } });
    if (activeToken) {
      return res.status(400).json({ message: 'Patient is already in the queue for today.' });
    }

    const request = await PatientRequest.create({
      patientName,
      email,
      phone,
      age,
      sex,
      maritalStatus,
      visitPurpose,
      reason,
      doctorId,
      date: today,
    });

    const populated = await PatientRequest.findById(request._id).populate('doctorId', 'name specialization');

    // Alert receptionists
    const io = req.app.get('io');
    if (io) {
      io.emit('request:new', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/requests - Get all pending requests
router.get('/', protect, async (req, res) => {
  try {
    const today = getToday();
    const requests = await PatientRequest.find({ date: today, status: 'pending' })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: 1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/requests/:id/approve - Approve a request and generate a token
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const request = await PatientRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    const today = getToday();
    const doctorId = request.doctorId;

    // Generate Token Number
    const counterId = `tokens_${today}_${doctorId}`;
    let counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    let tokenNumber = counter.seq;

    const lastToken = await Token.findOne({ doctorId, date: today })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
      
    if (lastToken && lastToken.tokenNumber >= tokenNumber) {
      tokenNumber = lastToken.tokenNumber + 1;
      await Counter.findByIdAndUpdate(counterId, { seq: tokenNumber });
    }

    // Upsert Patient record to save history and ensure they are recognized next time
    const patientRecord = await Patient.findOneAndUpdate(
      { phone: request.phone },
      {
        patientName: request.patientName,
        age: request.age,
        sex: request.sex,
        email: request.email,
        maritalStatus: request.maritalStatus
      },
      { new: true, upsert: true }
    );

    // Create Token
    const token = await Token.create({
      tokenNumber,
      patientName: request.patientName,
      email: request.email,
      phone: request.phone,
      age: request.age,
      sex: request.sex,
      maritalStatus: request.maritalStatus,
      visitPurpose: request.visitPurpose,
      reason: request.reason,
      doctorId: request.doctorId,
      estimatedTimeMins: 10,
      date: today,
      patientId: patientRecord._id, // Link to the permanent record
    });

    // Mark request as approved
    request.status = 'approved';
    await request.save();

    const populated = await Token.findById(token._id).populate('doctorId', 'name specialization roomNumber');

    // Email trigger
    if (request.email) {
      const activeCount = await Token.countDocuments({
        doctorId,
        date: today,
        status: { $in: ['waiting', 'serving'] }
      });
      
      const activeTokens = await Token.find({
        doctorId,
        date: today,
        status: { $in: ['waiting', 'serving'] }
      }).select('estimatedTimeMins');
      
      let totalWait = 0;
      for (const t of activeTokens) {
        if (t._id.toString() !== token._id.toString()) {
          totalWait += t.estimatedTimeMins;
        }
      }
      
      emailService.sendRegistrationEmail(
        request.email, 
        request.patientName, 
        tokenNumber, 
        populated.doctorId.name, 
        totalWait,
        activeCount
      );
    }

    // Emit updates
    const io = req.app.get('io');
    if (io) {
      io.emit('patient:added', { token: populated, doctorId });
      io.emit('request:update'); // Tell UI to refresh pending requests
      const queueStatus = await getDoctorQueueStatus(doctorId);
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/requests/:id/reject - Reject a request
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const request = await PatientRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    request.status = 'rejected';
    await request.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('request:update');
    }

    res.json({ message: 'Request rejected' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
