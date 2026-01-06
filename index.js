const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Models
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const LOCAL_DB = path.join(__dirname, "db.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- DATABASE CONNECTION ---
let dbStatus = "Connecting...";

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      dbStatus = "Connected to MongoDB Atlas (Persistent)";
      console.log("✅ LIVE DATABASE CONNECTED: Data will be saved forever.");
    })
    .catch(err => {
      dbStatus = "Connection Failed: " + err.message;
      console.error("❌ DATABASE ERROR:", err);
    });
} else {
  dbStatus = "Offline Mode (Saves locally only)";
  console.warn("⚠️ NO CLOUD DATABASE: Data will save to db.json on your computer only.");
}

const isConnected = () => mongoose.connection.readyState === 1;

// --- LOCAL DATA BACKUP ---
let memoryDB = { restaurants: [], acceptors: [], deliveryPersons: [], activityLogs: [] };
if (fs.existsSync(LOCAL_DB)) {
  try {
    memoryDB = JSON.parse(fs.readFileSync(LOCAL_DB, "utf8"));
  } catch (e) { }
}

const saveLocal = () => {
  try { fs.writeFileSync(LOCAL_DB, JSON.stringify(memoryDB, null, 2)); } catch (e) { }
};

/* ===============================
   RESTAURANT PORTAL (Permanent)
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;

    const data = {
      name, email, phone, location, description,
      items: [{ food, quantity: Number(quantity), category }],
      isVerified: false,
      membership: membership || "Basic",
      createdAt: new Date()
    };

    let savedData;
    if (isConnected()) {
      savedData = await new Restaurant(data).save();
      await new Activity({
        actorType: "Restaurant",
        actorName: name,
        actorEmail: email,
        action: "Registered with Food To Need",
        details: `Food: ${food}, Quantity: ${quantity}, Plan: ${membership}`,
        timestamp: new Date()
      }).save();
    } else {
      savedData = { _id: "local_" + Date.now(), ...data };
      memoryDB.restaurants.push(savedData);
      memoryDB.activityLogs.push({ actorType: "Restaurant", actorName: name, action: "Registered (Local Only)", timestamp: new Date() });
      saveLocal();
    }

    res.status(201).json({ success: true, message: "Details Saved Permanently", data: savedData, database: dbStatus });
  } catch (err) {
    res.status(500).json({ error: "Storage Error: " + err.message });
  }
});

/* ===============================
   ADMIN DATA (FETCHING HISTORY)
================================ */
app.get("/admin/db-status", (req, res) => res.json({ status: dbStatus }));

app.get("/admin/restaurants", async (req, res) => {
  if (isConnected()) return res.json(await Restaurant.find().sort({ createdAt: -1 }));
  res.json(memoryDB.restaurants.slice().reverse());
});

app.get("/admin/activities", async (req, res) => {
  if (isConnected()) return res.json(await Activity.find().sort({ timestamp: -1 }));
  res.json(memoryDB.activityLogs.slice().reverse());
});

// Verification/Deletion 
app.put("/verify-restaurant/:id", async (req, res) => {
  if (isConnected()) {
    const d = await Restaurant.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    return res.json({ success: true, data: d });
  }
  const item = memoryDB.restaurants.find(x => x._id === req.params.id);
  if (item) item.isVerified = true;
  saveLocal();
  res.json({ success: true, data: item });
});

// Admin Auth
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
app.post("/verify-admin", (req, res) => {
  if (req.body.adminId === ADMIN_ID && req.body.password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 System Live at http://localhost:${PORT}`));
