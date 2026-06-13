const express = require('express');
const mongoose = require('mongoose');
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { getDoctorQueueStatus, getToday } = require('../services/queueService');

const router = express.Router();

// POST /api/patients - Add patient and generate token
router.post('/', protect, async (req, res) => {
  try {
    const {
      patientName, email, phone, age, sex, maritalStatus,
      visitPurpose, reason, doctorId, estimatedTimeMins, isPriority
    } = req.body;

    const today = getToday();

    // 1. Check for existing active token FIRST to prevent duplicates and wasted token numbers
    let patient = await Patient.findOne({ phone });
    if (patient) {
      const activeToken = await Token.findOne({
        phone,
        doctorId,
        date: today,
        status: { $in: ['waiting', 'serving'] }
      });
      if (activeToken) {
        return res.status(400).json({ message: 'Patient is already in the queue for this doctor today.' });
      }

      // Update existing patient's details with latest info
      patient.patientName = patientName;
      if (email) patient.email = email;
      patient.age = age;
      patient.sex = sex;
      if (maritalStatus) patient.maritalStatus = maritalStatus;
      await patient.save();
    } else {
      // Create new patient
      patient = await Patient.create({
        patientName, phone, email, age, sex, maritalStatus
      });
    }

    // 2. Get next token number for today (Atomic increment)
    const counterId = `tokens_${today}_${doctorId}`;
    let counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    let tokenNumber = counter.seq;

    // Failsafe: Sync counter if there are already patients created before the Counter model was added
    const lastToken = await Token.findOne({ doctorId, date: today })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
      
    if (lastToken && lastToken.tokenNumber >= tokenNumber) {
      tokenNumber = lastToken.tokenNumber + 1;
      await Counter.findByIdAndUpdate(counterId, { seq: tokenNumber });
    }

    const token = await Token.create({
      tokenNumber,
      patientId: patient._id,
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
      
      const queueStatus = await getDoctorQueueStatus(doctorId);
      // Also emit queue update so the clients instantly pull the new serving/waiting state
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/patients/public-lookup/:phone - Public route to fetch patient details for self-registration
router.get('/public-lookup/:phone', async (req, res) => {
  try {
    const patient = await Patient.findOne({ phone: req.params.phone }).select('patientName email phone age sex maritalStatus');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/patients/search - Search patient by phone
router.get('/search', protect, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const patient = await Patient.findOne({ phone });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Fetch visit history
    const tokens = await Token.find({ phone: phone })
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, createdAt: -1 });

    res.json({ patient, history: tokens });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const { startDate, endDate, doctor, page = 1, limit = 10 } = req.query;
    
    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // Build matching filter
    const filter = {};
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
    if (doctor) {
      filter.doctorId = new mongoose.Types.ObjectId(doctor);
    }

    // 1. Calculate global stats using MongoDB Aggregation
    const statsPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
          totalWaitTimeMs: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "completed"] }, { $ne: ["$calledAt", null] }] },
                { $subtract: ["$calledAt", "$createdAt"] },
                0
              ]
            }
          },
          completedWithCallTime: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$status", "completed"] }, { $ne: ["$calledAt", null] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const statsResult = await Token.aggregate(statsPipeline);
    
    let stats = { total: 0, completed: 0, skipped: 0, avgWait: 0 };
    if (statsResult.length > 0) {
      const r = statsResult[0];
      const avgWaitMins = r.completedWithCallTime > 0 
        ? (r.totalWaitTimeMs / r.completedWithCallTime) / 60000 
        : 0;
      
      stats = {
        total: r.total,
        completed: r.completed,
        skipped: r.skipped,
        avgWait: avgWaitMins
      };
    }

    // 2. Fetch paginated data
    // We don't want $match on ObjectIds to fail on normal queries, so ensure the basic filter works
    // Actually, Mongoose handles casting for `.find()` automatically, but we used `.aggregate()` above which needs manual casting if we used string. 
    // Wait, let's fix the basic find filter to just use the raw strings to be safe with Mongoose
    const findFilter = {};
    if (startDate && endDate) findFilter.date = { $gte: startDate, $lte: endDate };
    if (doctor) findFilter.doctorId = doctor;

    const totalRecords = stats.total; // Already calculated from aggregation
    const totalPages = Math.ceil(totalRecords / limitNum);

    const tokens = await Token.find(findFilter)
      .populate('doctorId', 'name specialization')
      .sort({ date: -1, tokenNumber: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      stats,
      data: tokens,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/patients/:id - Edit patient details
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      patientName, email, phone, age, sex, maritalStatus,
      visitPurpose, reason, estimatedTimeMins, isPriority
    } = req.body;

    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const hadEmail = !!token.email;
    const newEmailProvided = email && email.trim() !== '';

    if (patientName !== undefined) token.patientName = patientName;
    if (email !== undefined) token.email = email;
    if (phone !== undefined) token.phone = phone;
    if (age !== undefined) token.age = age;
    if (sex !== undefined) token.sex = sex;
    if (maritalStatus !== undefined) token.maritalStatus = maritalStatus;
    if (visitPurpose !== undefined) token.visitPurpose = visitPurpose;
    if (reason !== undefined) token.reason = reason;
    if (estimatedTimeMins !== undefined) token.estimatedTimeMins = estimatedTimeMins;
    if (isPriority !== undefined) token.isPriority = isPriority;

    await token.save();
    
    const populated = await Token.findById(token._id).populate('doctorId', 'name specialization roomNumber');
    
    if (!hadEmail && newEmailProvided) {
      const today = getToday();
      const activeCount = await Token.countDocuments({
        doctorId: token.doctorId,
        date: today,
        status: { $in: ['waiting', 'serving'] }
      });
      
      const activeTokens = await Token.find({
        doctorId: token.doctorId,
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
        email, 
        token.patientName, 
        token.tokenNumber, 
        populated.doctorId.name, 
        totalWait,
        activeCount
      );
    }
    
    // Emit socket update
    const io = req.app.get('io');
    if (io) {
      const queueStatus = await getDoctorQueueStatus(token.doctorId);
      io.emit('queue:update', { doctorId: token.doctorId, ...queueStatus });
    }

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
