const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🚀 CATalism DB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Database Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;