const mongoose = require('mongoose');
require('dotenv').config({path: '../.env'});
const Token = require('./models/Token');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const matchQuery = {
    createdAt: {
      $gte: new Date('2026-05-13'),
      $lte: new Date('2026-06-12T23:59:59.999Z')
    }
  };
  const count = await Token.countDocuments(matchQuery);
  console.log('Count:', count);
  process.exit(0);
}
test();
