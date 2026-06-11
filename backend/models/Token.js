const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenNumber: {
    type: Number,
    required: true,
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
  },
  sex: {
    type: String,
    required: [true, 'Sex is required'],
    enum: ['Male', 'Female', 'Other'],
  },
  maritalStatus: {
    type: String,
    required: [true, 'Marital status is required'],
    enum: ['Single', 'Married', 'Divorced', 'Widowed'],
  },
  visitPurpose: {
    type: String,
    required: [true, 'Visit purpose is required'],
  },
  reason: {
    type: String,
    trim: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  estimatedTimeMins: {
    type: Number,
    default: 10,
  },
  date: {
    type: String,
    required: true, // YYYY-MM-DD
  },
  status: {
    type: String,
    enum: ['waiting', 'serving', 'completed', 'skipped', 'cancelled'],
    default: 'waiting',
  },
  isPriority: {
    type: Boolean,
    default: false,
  },
  calledAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
}, { timestamps: true });

// Prevent duplicate token numbers per doctor per day
tokenSchema.index({ doctorId: 1, date: 1, tokenNumber: 1 }, { unique: true });

module.exports = mongoose.model('Token', tokenSchema);
