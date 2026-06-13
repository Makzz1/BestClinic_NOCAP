const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Token = require('./models/Token');
const Doctor = require('./models/Doctor');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const doctor = await Doctor.findOne();
    if (!doctor) {
      console.log('No doctor found in DB. Please create a doctor first.');
      process.exit(1);
    }

    const tokens = [];
    const purposes = ['Checkup', 'Follow-up', 'Consultation', 'Prescription', 'Other'];
    const sexes = ['Male', 'Female'];
    
    const today = new Date();
    
    // Generate 250 realistic past tokens
    for (let i = 0; i < 250; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysAgo);
      
      // Random hour between 8 AM and 6 PM
      targetDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      
      const calledAt = new Date(targetDate);
      // Wait time between 5 and 50 minutes (averages out)
      calledAt.setMinutes(calledAt.getMinutes() + 5 + Math.floor(Math.random() * 45));
      
      const completedAt = new Date(calledAt);
      // Service time 10 mins
      completedAt.setMinutes(completedAt.getMinutes() + 10);

      tokens.push({
        tokenNumber: 5000 + i, // High arbitrary number to avoid conflicts with real tokens
        patientName: `Simulated Patient ${i}`,
        email: `sim${i}@test.com`,
        phone: '1234567890',
        age: 20 + Math.floor(Math.random() * 50),
        sex: sexes[Math.floor(Math.random() * sexes.length)],
        visitPurpose: purposes[Math.floor(Math.random() * purposes.length)],
        doctorId: doctor._id,
        date: targetDate.toISOString().split('T')[0],
        status: 'completed',
        createdAt: targetDate,
        calledAt: calledAt,
        completedAt: completedAt,
      });
    }

    await Token.insertMany(tokens);
    console.log('Successfully inserted 250 dummy historical tokens for analytics visualization!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
