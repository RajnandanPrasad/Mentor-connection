require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkMentors() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "mentorconnect",
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const totalUsers = await User.countDocuments();
    console.log('Total users in database:', totalUsers);

    const mentors = await User.find({ role: 'mentor' });
    console.log('Total mentors:', mentors.length);

    if (mentors.length > 0) {
      console.log('\nMentor details:');
      mentors.forEach(mentor => {
        console.log('\n-------------------');
        console.log('Name:', mentor.name);
        console.log('Email:', mentor.email);
        console.log('Role:', mentor.role);
        console.log('Mentor Profile:', mentor.mentorProfile);
      });
    } else {
      console.log('No mentors found in the database');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMentors(); 