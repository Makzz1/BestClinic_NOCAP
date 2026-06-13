const express = require('express');
const Token = require('../models/Token');
const Doctor = require('../models/Doctor');
const { protect, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

const { getDoctorQueueStatus, getToday } = require('../services/queueService');

// GET /api/queue/status - All doctors' queue status
router.get('/status', protect, async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true });
    const statuses = await Promise.all(
      doctors.map(async (doc) => ({
        doctor: doc,
        queue: await getDoctorQueueStatus(doc._id),
      }))
    );
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/queue/display - Public display status (no auth)
router.get('/display', async (req, res) => {
  try {
    const doctors = await Doctor.find(); // Fetch all doctors
    const statuses = await Promise.all(
      doctors.map(async (doc) => ({
        doctor: doc,
        queue: await getDoctorQueueStatus(doc._id),
      }))
    );
    
    // Only show inactive doctors if they still have patients to serve
    const filteredStatuses = statuses.filter(s => 
      s.doctor.isActive || s.queue.serving || s.queue.waiting.length > 0
    );
    
    res.json(filteredStatuses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/queue/:doctorId - Single doctor queue status
router.get('/:doctorId', protect, async (req, res) => {
  try {
    const status = await getDoctorQueueStatus(req.params.doctorId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/queue/:doctorId/next - Call next token
router.post('/:doctorId/next', protect, authorize('doctor'), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = getToday();

    // Verify doctor is pulling for themselves
    const doc = await Doctor.findOne({ _id: doctorId, userId: req.user._id });
    if (!doc) return res.status(403).json({ message: 'Not authorized for this queue' });

    // Check if there is already a serving token
    const currentServing = await Token.findOne({ doctorId, date: today, status: 'serving' });
    if (currentServing) {
      return res.status(400).json({ message: 'Finish or skip the current patient before calling next.' });
    }

    // Get next waiting token
    const nextToken = await Token.findOneAndUpdate(
      { doctorId, date: today, status: 'waiting' },
      { status: 'serving', calledAt: new Date() },
      { new: true, sort: { isPriority: -1, tokenNumber: 1 } }
    );

    // Get updated queue status
    const queueStatus = await getDoctorQueueStatus(doctorId);

    // Email trigger logic: Send email to the 3rd person in the active queue
    if (queueStatus.waiting && queueStatus.waiting.length >= 2) {
      const thirdPerson = queueStatus.waiting[1];
      if (thirdPerson.email) {
        emailService.sendQueueUpdateEmail(
          thirdPerson.email,
          thirdPerson.patientName,
          thirdPerson.tokenNumber,
          doc.name,
          thirdPerson.estimatedWaitMins
        );
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.json({
      calledToken: nextToken,
      queue: queueStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/queue/:doctorId/call/:tokenId - Call specific token
router.post('/:doctorId/call/:tokenId', protect, authorize('doctor'), async (req, res) => {
  try {
    const { doctorId, tokenId } = req.params;
    const today = getToday();

    // Verify doctor is pulling for themselves
    const doc = await Doctor.findOne({ _id: doctorId, userId: req.user._id });
    if (!doc) return res.status(403).json({ message: 'Not authorized for this queue' });

    // Check if there is already a serving token
    const currentServing = await Token.findOne({ doctorId, date: today, status: 'serving' });
    if (currentServing) {
      return res.status(400).json({ message: 'Finish or skip the current patient before calling next.' });
    }

    // Get specific waiting token
    const calledToken = await Token.findOneAndUpdate(
      { _id: tokenId, doctorId, date: today, status: 'waiting' },
      { status: 'serving', calledAt: new Date() },
      { new: true }
    );

    if (!calledToken) {
      return res.status(404).json({ message: 'Waiting token not found' });
    }

    // Get updated queue status
    const queueStatus = await getDoctorQueueStatus(doctorId);

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.json({
      calledToken,
      queue: queueStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/queue/:doctorId/complete - Complete current token
router.post('/:doctorId/complete', protect, authorize('doctor'), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = getToday();

    const doc = await Doctor.findOne({ _id: doctorId, userId: req.user._id });
    if (!doc) return res.status(403).json({ message: 'Not authorized for this queue' });

    const { prescription, instructions } = req.body;

    const completedToken = await Token.findOneAndUpdate(
      { doctorId, date: today, status: 'serving' },
      { 
        status: 'completed', 
        completedAt: new Date(),
        ...(prescription && { prescription }),
        ...(instructions && { instructions })
      },
      { new: true }
    );

    if (completedToken && (prescription || instructions)) {
      emailService.sendPrescriptionEmail(
        completedToken.email,
        completedToken.patientName,
        completedToken.tokenNumber,
        doc.name,
        prescription,
        instructions
      );
    }

    const queueStatus = await getDoctorQueueStatus(doctorId);

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.json({ queue: queueStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/queue/:doctorId/skip - Skip current token
router.post('/:doctorId/skip', protect, authorize('doctor'), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = getToday();

    const doc = await Doctor.findOne({ _id: doctorId, userId: req.user._id });
    if (!doc) return res.status(403).json({ message: 'Not authorized for this queue' });

    // Simply mark the current serving patient as skipped.
    // The doctor must manually call the next patient.
    await Token.findOneAndUpdate(
      { doctorId, date: today, status: 'serving' },
      { status: 'waiting', $unset: { calledAt: 1 } }
    );

    const queueStatus = await getDoctorQueueStatus(doctorId);

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.json({ queue: queueStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/queue/estimate/:tokenId - Update estimate time
router.patch('/estimate/:tokenId', protect, async (req, res) => {
  try {
    const { adjustment, absoluteValue } = req.body;

    const token = await Token.findById(req.params.tokenId);
    if (!token) return res.status(404).json({ message: 'Token not found' });

    if (absoluteValue !== undefined) {
      token.estimatedTimeMins = Math.max(0, absoluteValue);
    } else if (adjustment !== undefined) {
      token.estimatedTimeMins = Math.max(0, token.estimatedTimeMins + adjustment);
    }

    await token.save();

    const queueStatus = await getDoctorQueueStatus(token.doctorId);

    const io = req.app.get('io');
    if (io) {
      io.emit('estimate:update', {
        tokenId: token._id,
        doctorId: token.doctorId,
        newEstimate: token.estimatedTimeMins,
        queue: queueStatus,
      });
    }

    res.json({ token, queue: queueStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/queue/:doctorId/cancel/:tokenId - Cancel a waiting token
router.post('/:doctorId/cancel/:tokenId', protect, async (req, res) => {
  try {
    const { doctorId, tokenId } = req.params;
    const today = getToday();

    const token = await Token.findOneAndUpdate(
      { _id: tokenId, doctorId, date: today, status: 'waiting' },
      { status: 'cancelled', completedAt: new Date() },
      { new: true }
    );

    if (!token) {
      return res.status(404).json({ message: 'Waiting token not found' });
    }

    const queueStatus = await getDoctorQueueStatus(doctorId);

    const io = req.app.get('io');
    if (io) {
      io.emit('queue:update', { doctorId, ...queueStatus });
    }

    res.json({
      cancelledToken: token,
      queue: queueStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
