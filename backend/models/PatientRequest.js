const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
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
    enum: ['Prefer not to say', 'Single', 'Married', 'Divorced', 'Widowed'],
  },
  visitPurpose: {
    type: String,
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
  date: {
    type: String,
    required: true, // YYYY-MM-DD
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  }
}, { timestamps: true });

// Optimize querying for pending requests by date and status
requestSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('PatientRequest', requestSchema);
