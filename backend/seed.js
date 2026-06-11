require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
        console.log(`Admin user already exists: ${adminEmail}`);
    } else {
        await User.create({
            name: 'Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
        });
        console.log(`Admin user created: ${adminEmail}`);
    }

    await mongoose.disconnect();
    console.log('Seed complete');
};

seed().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
