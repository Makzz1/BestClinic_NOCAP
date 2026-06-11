const express = require('express');
const Doctor = require('../models/Doctor');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors - List all doctors (any authenticated user)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.query.active === 'true' ? { isActive: true } : {};
    const doctors = await Doctor.find(filter).sort({ name: 1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/doctors/public - Get active doctors for display/booking
router.get('/public', async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/doctors/:id/status - Toggle active status (doctor only)
router.put('/:id/status', protect, authorize('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    
    // Ensure the doctor is updating their own profile
    if (doctor.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    doctor.isActive = req.body.isActive;
    await doctor.save();
    
    const io = req.app.get('io');
    if (io) {
      io.emit('doctor:update');
    }

    res.json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const User = require('../models/User');

// POST /api/doctors - Add doctor (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, specialization, roomNumber, email, password } = req.body;
    
    // Check if email is already taken
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create User first
    const user = await User.create({
      name,
      email,
      password,
      role: 'doctor'
    });

    // Create Doctor linked to User
    const doctor = await Doctor.create({ 
      name, 
      specialization, 
      roomNumber,
      userId: user._id
    });
    
    res.status(201).json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/doctors/:id - Update doctor (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/doctors/:id - Deactivate doctor (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const io = req.app.get('io');
    if (io) {
      io.emit('doctor:update');
    }

    res.json({ message: 'Doctor deactivated', doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
