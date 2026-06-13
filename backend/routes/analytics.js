const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const { protect, authorize } = require('../middleware/auth');

// GET /api/analytics
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchQuery = {};

    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

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

    // Format output
    // Mapping days of week: 1 = Sunday, 2 = Monday...
    const daysMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    
    res.json({
      peakHours: peakHours.map(p => ({ hour: `${p._id}:00`, count: p.count })),
      waitTimeTrends: waitTimeTrends.map(w => ({ date: w._id, avgWaitTime: Math.round(w.avgWaitTime) })),
      doctorEfficiency: doctorEfficiency.map(d => ({ doctorName: d.doctorName, patientsServed: d.patientsServed })),
      volumeByDay: volumeByDay.map(v => ({ day: daysMap[v._id], count: v.count })),
      visitPurposes: visitPurposes.map(v => ({ purpose: v._id || 'Other', count: v.count }))
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Server Error calculating analytics' });
  }
});

module.exports = router;
