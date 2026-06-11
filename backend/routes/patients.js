const express = require('express');
const Token = require('../models/Token');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper: get today's date string
const getToday = () => new Date().toISOString().split('T')[0];

// POST /api/patients - Add patient and generate token
router.post('/', protect, async (req, res) => {
  try {
    const {
      patientName, email, phone, age, sex, maritalStatus,
      visitPurpose, reason, doctorId, estimatedTimeMins, isPriority
    } = req.body;

    const today = getToday();

    // Get next token number for today
    const lastToken = await Token.findOne({ date: today })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    const tokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

    const token = await Token.create({
      tokenNumber,
      patientName,
      email,
      phone,
      age,
      sex,
      maritalStatus,
      visitPurpose,
      reason: reason || null,
      doctorId,
      estimatedTimeMins: estimatedTimeMins || 10,
      date: today,
      isPriority: isPriority || false,
    });

    const populated = await Token.findById(token._id).populate('doctorId', 'name specialization roomNumber');

    // Email trigger logic: Send registration email if email is provided
    if (email) {
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
      
      // Calculate estimated wait time before this patient
      let totalWait = 0;
      for (const t of activeTokens) {
        if (t._id.toString() !== token._id.toString()) {
          totalWait += t.estimatedTimeMins;
        }
      }
      
      emailService.sendRegistrationEmail(
        email, 
        patientName, 
        tokenNumber, 
        populated.doctorId.name, 
        totalWait,
        activeCount
      );
    }

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.emit('patient:added', {
        token: populated,
        doctorId: doctorId,
      });
      // Also emit queue update so the clients instantly pull the new serving/waiting state
      io.emit('queue:update', { doctorId });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/patients - List patients (filter by doctor, date, status)
router.get('/', protect, async (req, res) => {
  try {
    const { doctor, date, status } = req.query;
    const filter = { date: date || getToday() };
    if (doctor) filter.doctorId = doctor;
    if (status) filter.status = status;

    const tokens = await Token.find(filter)
      .populate('doctorId', 'name specialization roomNumber')
      .sort({ tokenNumber: 1 });

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/patients/history - Get historical data (for reports)
router.get('/history', protect, async (req, res) => {
  try {
    const { startDate, endDate, doctor } = req.query;
    const filter = {};
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
    if (doctor) filter.doctorId = doctor;

    const tokens = await Token.find(filter)
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, tokenNumber: 1 });

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
