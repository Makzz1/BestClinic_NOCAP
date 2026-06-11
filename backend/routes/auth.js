const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      let doctorId = null;
      if (user.role === 'doctor') {
        const doc = await Doctor.findOne({ userId: user._id });
        if (doc) doctorId = doc._id;
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorId,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    let doctorId = null;
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      if (doc) doctorId = doc._id;
    }
    const userData = req.user.toObject();
    if (doctorId) userData.doctorId = doctorId;
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
