const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
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
  }
}, { timestamps: true });

// Optimize lookups by phone number (Unique constraint automatically adds an index)

module.exports = mongoose.model('Patient', patientSchema);
