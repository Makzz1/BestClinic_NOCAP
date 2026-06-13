const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Token = require('../models/Token');
const Patient = require('../models/Patient');
const PatientRequest = require('../models/PatientRequest');
const Counter = require('../models/Counter');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

function getPastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

async function reseed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB.");

    console.log("Clearing existing Tokens, Patients, Requests, and Counters...");
    await Token.deleteMany({});
    await Patient.deleteMany({});
    await PatientRequest.deleteMany({});
    await Counter.deleteMany({});

    console.log("Fetching doctors...");
    const doctors = await Doctor.find({});
    if (!doctors.length) {
      console.error("No doctors found. Please run regular seed script or register doctors first.");
      process.exit(1);
    }

    const today = getToday();

    // Helper to generate a random number between min and max
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const firstNames = ["John", "Jane", "Bob", "Alice", "Michael", "Sarah", "David", "Emily", "James", "Emma", "Robert", "Olivia", "William", "Sophia", "Joseph", "Isabella"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez"];
    const statuses = ["Single", "Married", "Divorced", "Widowed"];
    const genders = ["Male", "Female", "Other"];

    let patientsData = [];
    
    // Add the 3 known patients for easy testing
    patientsData.push({
      patientName: "John Doe", phone: "9876543210", email: "john@example.com", age: 35, sex: "Male", maritalStatus: "Married"
    });
    patientsData.push({
      patientName: "Jane Smith", phone: "9876543211", email: "jane@example.com", age: 28, sex: "Female", maritalStatus: "Single"
    });
    patientsData.push({
      patientName: "Bob Wilson", phone: "9876543212", email: "bob@example.com", age: 45, sex: "Male", maritalStatus: "Divorced"
    });

    // Generate 27 more random patients
    for (let i = 0; i < 27; i++) {
      const fName = firstNames[randomInt(0, firstNames.length - 1)];
      const lName = lastNames[randomInt(0, lastNames.length - 1)];
      patientsData.push({
        patientName: `${fName} ${lName}`,
        phone: `98765${randomInt(10000, 99999)}`,
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`,
        age: randomInt(18, 80),
        sex: genders[randomInt(0, 2)],
        maritalStatus: statuses[randomInt(0, 3)]
      });
    }

    console.log(`Seeding ${patientsData.length} persistent Patients...`);
    const createdPatients = await Patient.insertMany(patientsData);

    console.log("Seeding historical visits for analytics...");
    
    let tokenSeq = 1;
    let tokensToInsert = [];

    const visitPurposes = ["General Checkup", "Follow-up", "Fever/Cold", "Vaccination", "Consultation", "Emergency"];

    for (const patient of createdPatients) {
      // Give each patient 5 to 10 past visits scattered over the last 30 days
      const numVisits = randomInt(5, 10);
      for(let i=0; i<numVisits; i++) {
        // Randomly assign each visit to any of the doctors
        const doc = doctors[randomInt(0, doctors.length - 1)];
        
        // Random days ago between 1 and 30
        const daysAgo = randomInt(1, 30);
        const dateStr = getPastDate(daysAgo);
        
        // Random hour between 8 and 18 (8 AM to 6 PM)
        const hour = randomInt(8, 18);
        const min = randomInt(0, 59);
        const createdAt = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00Z`);
        
        // Random wait time between 5 and 45 minutes
        const waitMins = randomInt(5, 45);
        const calledAt = new Date(createdAt.getTime() + waitMins * 60000);
        
        // Random treatment time between 5 and 20 minutes
        const treatMins = randomInt(5, 20);
        const updatedAt = new Date(calledAt.getTime() + treatMins * 60000);

        const purpose = visitPurposes[randomInt(0, visitPurposes.length - 1)];

        tokensToInsert.push({
          tokenNumber: tokenSeq++,
          patientName: patient.patientName,
          phone: patient.phone,
          email: patient.email,
          age: patient.age,
          sex: patient.sex,
          maritalStatus: patient.maritalStatus,
          visitPurpose: purpose,
          reason: `Routine visit for ${purpose}`,
          doctorId: doc._id,
          estimatedTimeMins: treatMins,
          date: dateStr,
          status: 'completed',
          patientId: patient._id,
          prescription: "Standard meds as prescribed",
          instructions: "Rest and drink fluids",
          createdAt: createdAt,
          updatedAt: updatedAt,
          calledAt: calledAt
        });
      }
      
      // Also give everyone a visit today (Waiting)
      const docToday = doctors[randomInt(0, doctors.length - 1)];
      const createdAtToday = new Date();
      tokensToInsert.push({
        tokenNumber: tokenSeq++,
        patientName: patient.patientName,
        phone: patient.phone,
        email: patient.email,
        age: patient.age,
        sex: patient.sex,
        maritalStatus: patient.maritalStatus,
        visitPurpose: "Follow-up",
        reason: "Checking progress",
        doctorId: docToday._id,
        estimatedTimeMins: 10,
        date: today,
        status: 'waiting',
        patientId: patient._id,
        createdAt: createdAtToday,
        updatedAt: createdAtToday
      });
    }

    // Insert directly into MongoDB to bypass Mongoose's timestamps override
    await Token.collection.insertMany(tokensToInsert);

    // Set counters for today for all doctors
    for (const doc of doctors) {
      await Counter.create({
        _id: `tokens_${today}_${doc._id}`,
        seq: tokenSeq
      });
    }

    console.log("✅ Seed complete! You can now test 'We Remember You' with phones: 9876543210, 9876543211, 9876543212");
    console.log("Analytics should now show historical data.");
    process.exit(0);
  } catch (error) {
    console.error("Error reseeding:", error);
    process.exit(1);
  }
}

reseed();
