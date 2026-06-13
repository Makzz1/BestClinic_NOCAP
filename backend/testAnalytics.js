const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
const Token = require('./models/Token');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  try {
    const matchQuery = {};

    const [
      peakHours,
      waitTimeTrends,
      doctorEfficiency,
      volumeByDay,
      visitPurposes
    ] = await Promise.all([
      // 1. Peak Hours Heatmap
      Token.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $hour: { date: "$createdAt", timezone: "UTC" } }, // In production, might need specific timezone
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // 2. Average Wait Time Trends
      Token.aggregate([
        { $match: { ...matchQuery, status: "completed", calledAt: { $exists: true } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            avgWaitTime: {
              $avg: {
                $divide: [{ $subtract: ["$calledAt", "$createdAt"] }, 60000] // milliseconds to minutes
              }
            }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // 3. Doctor Efficiency
      Token.aggregate([
        { $match: { ...matchQuery, status: "completed" } },
        {
          $group: {
            _id: "$doctorId",
            patientsServed: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "doctors",
            localField: "_id",
            foreignField: "_id",
            as: "doctor"
          }
        },
        { $unwind: "$doctor" },
        {
          $project: {
            doctorName: "$doctor.name",
            patientsServed: 1
          }
        }
      ]),

      // 4. Patient Volume by Day of Week
      Token.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // 5. Visit Purposes
      Token.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$visitPurpose",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);
    
    console.log('Success');
    console.log('Peak:', peakHours.length);
  } catch (err) {
    console.error('Aggregation Error:', err);
  }
  process.exit(0);
}

test();
