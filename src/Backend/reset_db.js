const mongoose = require('mongoose');
const { User, Game, Action } = require('./models/Schemas');

// Replace with your actual connection string from db.js or .env
const MONGO_URI = 'mongodb://localhost:27017/catalism'; 

const reset = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('🔌 Connected to DB...');

        await User.deleteMany({});
        console.log('❌ Users deleted.');

        await Game.deleteMany({});
        console.log('❌ Games deleted.');

        await Action.deleteMany({});
        console.log('❌ Actions/Logs deleted.');

        console.log('✨ Database Cleaned!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

reset();