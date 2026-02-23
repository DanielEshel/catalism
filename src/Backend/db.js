// db.js
const mongoose = require("mongoose");
require("dotenv").config(); // Loads the variables from your .env file

const connectDB = async () => {
  try {
    // Uses the cloud URI instead of a local 'mongodb://localhost:27017' string
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🚀 MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
