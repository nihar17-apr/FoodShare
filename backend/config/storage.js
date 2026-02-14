const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

/**
 * Modern Database Connection Manager
 * Using Mongoose for MongoDB Atlas - The industry standard for NoSQL
 */

const MONGODB_URI = process.env.MONGODB_URI;

// In-memory fallback if no DB connection (for development flexibility)
let memoryDB = {
    restaurants: [],
    acceptors: [],
    deliveryPersons: [],
    activityLogs: []
};

const connectDB = async () => {
    if (!MONGODB_URI) {
        console.warn("⚠️ MONGODB_URI not found in environment variables.");
        console.info("💡 Falling back to In-Memory storage (Non-persistent).");
        return;
    }

    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            // Modern Mongoose options are mostly default now
        });
        console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`❌ Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    }
};

const isLive = () => mongoose.connection.readyState === 1;

module.exports = {
    connectDB,
    isLive,
    memoryDB,
    systemStatus: isLive() ? "Connected" : "Offline / Memory Mode"
};
