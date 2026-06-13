const Token = require('../models/Token');

const getToday = () => new Date().toISOString().split('T')[0];

// Helper: build queue status for a doctor
async function getDoctorQueueStatus(doctorId) {
  const today = getToday();

  const serving = await Token.findOne({
    doctorId, date: today, status: 'serving',
  }).select('-__v');

  const waiting = await Token.find({
    doctorId, date: today, status: 'waiting',
  }).sort({ isPriority: -1, tokenNumber: 1 }).select('-__v');

  const completedCount = await Token.countDocuments({
    doctorId, date: today, status: 'completed',
  });

  const skippedCount = await Token.countDocuments({
    doctorId, date: today, status: 'skipped',
  });

  // Calculate cumulative wait times for waiting patients
  let cumulativeWait = serving ? serving.estimatedTimeMins : 0;
  const waitingWithTimes = waiting.map((t) => {
    const obj = t.toObject();
    obj.estimatedWaitMins = cumulativeWait;
    cumulativeWait += t.estimatedTimeMins;
    return obj;
  });

  return {
    doctorId,
    serving,
    waiting: waitingWithTimes,
    stats: {
      waitingCount: waiting.length,
      completedCount,
      skippedCount,
      totalToday: waiting.length + completedCount + skippedCount + (serving ? 1 : 0),
    },
  };
}

module.exports = {
  getDoctorQueueStatus,
  getToday,
};
