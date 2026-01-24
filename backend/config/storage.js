const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const LOCAL_DB_PATH = path.join(__dirname, "../../db.json");
const MONGODB_URI = process.env.MONGODB_URI;

let systemStatus = "Initializing...";
let memoryDB = {
    restaurants: [],
    acceptors: [],
    deliveryPersons: [],
    activityLogs: []
};

// Load initial data
if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
        const data = fs.readFileSync(LOCAL_DB_PATH, "utf8");
        memoryDB = { ...memoryDB, ...JSON.parse(data) };
        console.log("📂 History loaded from db.json");
    } catch (err) { }
}

const commitData = () => {
    try {
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memoryDB, null, 2));
    } catch (e) { }
};

const connectDB = () => {
    if (MONGODB_URI) {
        mongoose
            .connect(MONGODB_URI)
            .then(() => {
                systemStatus = "Connected to MongoDB Atlas (Persistent Mode)";
            })
            .catch((err) => {
                systemStatus = "Cloud Error: " + err.message;
            });
    } else {
        systemStatus = "Offline Mode (Local Backup Active)";
    }
};

const isLive = () => mongoose.connection.readyState === 1;

module.exports = {
    memoryDB,
    commitData,
    connectDB,
    isLive,
    systemStatus,
};
