const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI; // Cloud Connection String
const LOCAL_DB_PATH = path.join(__dirname, "db.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- PERSISTENCE ENGINE ---
let memoryDB = {
  restaurants: [],
  acceptors: [],
  deliveryPersons: [],
  activityLogs: []
};

// 📂 LOAD HISTORY: Check if we have previous data saved on the computer
if (fs.existsSync(LOCAL_DB_PATH)) {
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    // Merge with defaults to ensure all arrays exist
    memoryDB = { ...memoryDB, ...parsed };
    console.log("📂 HISTORY LOADED: Found previous data in db.json");
  } catch (err) {
    console.warn("⚠️ Data recovery failed, starting fresh.");
  }
}

// 💾 SAVE HISTORY: Function to lock data into the folder permanently
const commitData = () => {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memoryDB, null, 2));
  } catch (e) {
    // This fails on Vercel read-only, which is fine if Cloud DB is used.
  }
};

// --- DATABASE CONNECTION ---
let systemStatus = "Initializing...";

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      systemStatus = "Connected to MongoDB Atlas (Cloud Storage Active)";
      console.log("✅ CLOUD CONNECTED: Data is now 100% Permanent.");
    })
    .catch(err => {
      systemStatus = "Cloud Error: " + err.message;
      console.error("❌ CLOUD FAILED:", err);
    });
} else {
  systemStatus = "Offline Mode (Saves to local db.json)";
  console.warn("⚠️ OFFLINE: Data will stay on this computer only.");
}

// Models
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

const isLive = () => mongoose.connection.readyState === 1;

/* ===============================
   RESTAURANT PORTAL
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;
    const record = {
      _id: Date.now().toString(),
      name, email, phone, location, description,
      items: [{ food, quantity: Number(quantity), category }],
      isVerified: false,
      membership: membership || "Basic",
      createdAt: new Date()
    };

    if (isLive()) {
      const dbData = await new Restaurant(record).save();
      await new Activity({ actorType: "Restaurant", actorName: name, actorEmail: email, action: "Donation Submitted", details: `Food: ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbData });
    }

    // 💾 Save to db.json backup
    memoryDB.restaurants.push(record);
    memoryDB.activityLogs.push({ actorType: "Restaurant", actorName: name, action: "Donation Submitted (Local Mode)", timestamp: new Date() });
    commitData();
    res.status(201).json({ success: true, data: record, status: systemStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ===============================
   ACCEPTOR PORTAL
================================ */
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;
    const record = { _id: Date.now().toString(), name, email, phone, location, food, quantity: Number(quantity), isVerified: false, membership: membership || "Basic", createdAt: new Date() };

    if (isLive()) {
      const dbData = await new Acceptor(record).save();
      await new Activity({ actorType: "Acceptor", actorName: name, actorEmail: email, action: "Food Requested", details: `Food: ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbData });
    }

    memoryDB.acceptors.push(record);
    commitData();
    res.status(201).json({ success: true, data: record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ===============================
   DELIVERY PORTAL
================================ */
app.post("/add-delivery", async (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;
    const record = { _id: Date.now().toString(), name, email, phone, location, vehicleType, licenseNumber, isVerified: false, status: "Available", createdAt: new Date() };

    if (isLive()) {
      const dbData = await new Delivery(record).save();
      return res.status(201).json({ success: true, data: dbData });
    }

    memoryDB.deliveryPersons.push(record);
    commitData();
    res.status(201).json({ success: true, data: record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ===============================
   ADMIN ACTIONS (History)
================================ */
app.get("/admin/db-status", (req, res) => res.json({ status: systemStatus }));

app.get("/admin/restaurants", async (req, res) => {
  if (isLive()) return res.json(await Restaurant.find().sort({ createdAt: -1 }));
  res.json(memoryDB.restaurants.slice().reverse());
});

app.get("/admin/activities", async (req, res) => {
  if (isLive()) return res.json(await Activity.find().sort({ timestamp: -1 }));
  res.json(memoryDB.activityLogs.slice().reverse());
});

app.get("/admin/acceptors", async (req, res) => {
  if (isLive()) return res.json(await Acceptor.find().sort({ createdAt: -1 }));
  res.json(memoryDB.acceptors.slice().reverse());
});

app.get("/admin/deliveries", async (req, res) => {
  if (isLive()) return res.json(await Delivery.find().sort({ createdAt: -1 }));
  res.json(memoryDB.deliveryPersons.slice().reverse());
});

// Verification logic
app.put("/verify-restaurant/:id", async (req, res) => {
  if (isLive()) return res.json({ success: true, data: await Restaurant.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }) });
  const item = memoryDB.restaurants.find(x => x._id === req.params.id);
  if (item) item.isVerified = true;
  commitData();
  res.json({ success: true, data: item });
});

// Generic Delete
app.delete("/delete-restaurant/:id", async (req, res) => {
  if (isLive()) await Restaurant.findByIdAndDelete(req.params.id);
  else memoryDB.restaurants = memoryDB.restaurants.filter(x => x._id !== req.params.id);
  commitData();
  res.json({ success: true });
});

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  const AID = process.env.ADMIN_ID || "Nihar";
  const APW = process.env.ADMIN_PASSWORD || "1234";
  if (adminId === AID && password === APW) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 System Ready at http://localhost:${PORT}`));
