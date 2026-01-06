const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
// Important: Use path.join to ensure correct mapping on Vercel
app.use(express.static(path.join(__dirname, "public")));

// --- IN-MEMORY FALLBACK ---
// This prevents the 500 error if MongoDB is missing on Vercel
let memoryDB = {
  restaurants: [],
  acceptors: [],
  deliveryPersons: [],
  activityLogs: []
};

// Database Connection
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));
} else {
  console.warn("⚠️ No MONGODB_URI found. All data will be temporary (RAM only).");
}

// Models (Safe for serverless environments)
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

// Helper to check DB status
const isConnected = () => mongoose.connection.readyState === 1;

/* ===============================
   PUBLIC ROUTES
================================ */
app.get("/restaurants", async (req, res) => {
  try {
    if (isConnected()) {
      const data = await Restaurant.find({ isVerified: true });
      return res.json(data);
    }
    res.json(memoryDB.restaurants.filter(r => r.isVerified));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
});

app.get("/acceptors", async (req, res) => {
  try {
    if (isConnected()) {
      const data = await Acceptor.find({ isVerified: true });
      return res.json(data);
    }
    res.json(memoryDB.acceptors.filter(a => a.isVerified));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch acceptors" });
  }
});

/* ===============================
   POST HANDLERS (With persistence)
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;
    const newRecord = {
      name, email, phone, location, description,
      items: [{ food, quantity: parseInt(quantity || 0), category }],
      isVerified: false,
      membership: membership || "Basic",
      createdAt: new Date()
    };

    if (isConnected()) {
      const dbRecord = new Restaurant(newRecord);
      await dbRecord.save();
      await new Activity({ actorType: "Restaurant", actorName: name, actorEmail: email, action: "Submitted Donation", details: `Food: ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbRecord });
    }

    // Memory fallback
    const memRecord = { _id: Date.now().toString(), ...newRecord };
    memoryDB.restaurants.push(memRecord);
    memoryDB.activityLogs.push({ actorType: "Restaurant", actorName: name, action: "Submitted Donation", timestamp: new Date() });
    res.status(201).json({ success: true, data: memRecord, note: "Saved to temporary memory" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;
    const newRecord = { name, email, phone, location, food, quantity: parseInt(quantity || 0), isVerified: false, membership: membership || "Basic", createdAt: new Date() };

    if (isConnected()) {
      const dbRecord = new Acceptor(newRecord);
      await dbRecord.save();
      await new Activity({ actorType: "Acceptor", actorName: name, actorEmail: email, action: "Requested Food", details: `Food: ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbRecord });
    }

    const memRecord = { _id: Date.now().toString(), ...newRecord };
    memoryDB.acceptors.push(memRecord);
    res.status(201).json({ success: true, data: memRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/add-delivery", async (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;
    const newRecord = { name, email, phone, location, vehicleType, licenseNumber, isVerified: false, status: "Available", createdAt: new Date() };

    if (isConnected()) {
      const dbRecord = new Delivery(newRecord);
      await dbRecord.save();
      return res.status(201).json({ success: true, data: dbRecord });
    }

    const memRecord = { _id: Date.now().toString(), ...newRecord };
    memoryDB.deliveryPersons.push(memRecord);
    res.status(201).json({ success: true, data: memRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ADMIN ACTIONS
================================ */
app.get("/admin/restaurants", async (req, res) => {
  if (isConnected()) return res.json(await Restaurant.find().sort({ createdAt: -1 }));
  res.json(memoryDB.restaurants);
});

app.get("/admin/acceptors", async (req, res) => {
  if (isConnected()) return res.json(await Acceptor.find().sort({ createdAt: -1 }));
  res.json(memoryDB.acceptors);
});

app.get("/admin/activities", async (req, res) => {
  if (isConnected()) return res.json(await Activity.find().sort({ timestamp: -1 }));
  res.json(memoryDB.activityLogs.slice().reverse());
});

app.get("/admin/deliveries", async (req, res) => {
  if (isConnected()) return res.json(await Delivery.find().sort({ createdAt: -1 }));
  res.json(memoryDB.deliveryPersons);
});

// Admin Verification (ID Check)
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

/* ===============================
   HOME & CATCH-ALL
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 FoodShare System Live at http://localhost:${PORT}`);
});

module.exports = app;
