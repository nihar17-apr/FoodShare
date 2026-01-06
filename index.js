const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const LOCAL_DB = path.join(__dirname, "db.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- PERSISTENCE ENGINE ---
let memoryDB = { restaurants: [], acceptors: [], deliveryPersons: [], activityLogs: [] };

// Initialize Local JSON DB if it exists
if (fs.existsSync(LOCAL_DB)) {
  try {
    const data = fs.readFileSync(LOCAL_DB, "utf8");
    memoryDB = JSON.parse(data);
    console.log("📂 Loaded local data from db.json");
  } catch (err) {
    console.warn("⚠️ Could not read db.json, using fresh memory.");
  }
}

// Helper to save data (Only works locally)
const persistLocally = () => {
  try {
    fs.writeFileSync(LOCAL_DB, JSON.stringify(memoryDB, null, 2));
  } catch (e) {
    // Silently fail on Vercel (read-only environment)
  }
};

// Database Connection
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Successfully connected to MongoDB Atlas (Cloud Database)"))
    .catch(err => console.error("❌ MongoDB Atlas Connection Error:", err));
} else {
  console.warn("⚠️ MONGODB_URI not found. Details will be saved locally in 'db.json'.");
}

// Models
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

const isConnected = () => mongoose.connection.readyState === 1;

/* ===============================
   RESTAURANT ROUTES
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;
    const record = {
      name, email, phone, location, description,
      items: [{ food, quantity: parseInt(quantity || 0), category }],
      isVerified: false,
      membership: membership || "Basic",
      createdAt: new Date()
    };

    if (isConnected()) {
      const dbRecord = new Restaurant(record);
      await dbRecord.save();
      await new Activity({ actorType: "Restaurant", actorName: name, actorEmail: email, action: "Submitted Donation", details: `Food: ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbRecord });
    }

    const memRecord = { _id: Date.now().toString(), ...record };
    memoryDB.restaurants.push(memRecord);
    memoryDB.activityLogs.push({ _id: Date.now().toString(), actorType: "Restaurant", actorName: name, action: "Submitted Donation", details: `Food: ${food}`, timestamp: new Date() });
    persistLocally();
    res.status(201).json({ success: true, data: memRecord });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/restaurants", async (req, res) => {
  if (isConnected()) return res.json(await Restaurant.find({ isVerified: true }));
  res.json(memoryDB.restaurants.filter(r => r.isVerified));
});

/* ===============================
   ACCEPTOR ROUTES
================================ */
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;
    const record = { name, email, phone, location, food, quantity: parseInt(quantity || 0), isVerified: false, membership: membership || "Basic", createdAt: new Date() };

    if (isConnected()) {
      const dbRecord = new Acceptor(record);
      await dbRecord.save();
      await new Activity({ actorType: "Acceptor", actorName: name, actorEmail: email, action: "Requested Food", details: `Food: ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbRecord });
    }

    const memRecord = { _id: Date.now().toString(), ...record };
    memoryDB.acceptors.push(memRecord);
    persistLocally();
    res.status(201).json({ success: true, data: memRecord });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/acceptors", async (req, res) => {
  if (isConnected()) return res.json(await Acceptor.find({ isVerified: true }));
  res.json(memoryDB.acceptors.filter(a => a.isVerified));
});

/* ===============================
   DELIVERY ROUTES
================================ */
app.post("/add-delivery", async (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;
    const record = { name, email, phone, location, vehicleType, licenseNumber, isVerified: false, status: "Available", createdAt: new Date() };

    if (isConnected()) {
      const dbRecord = new Delivery(record);
      await dbRecord.save();
      return res.status(201).json({ success: true, data: dbRecord });
    }

    const memRecord = { _id: Date.now().toString(), ...record };
    memoryDB.deliveryPersons.push(memRecord);
    persistLocally();
    res.status(201).json({ success: true, data: memRecord });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

/* ===============================
   VERIFICATION & DELETION
================================ */
app.put("/verify-restaurant/:id", async (req, res) => {
  if (isConnected()) return res.json({ success: true, data: await Restaurant.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }) });
  const item = memoryDB.restaurants.find(x => x._id === req.params.id);
  if (item) item.isVerified = true;
  persistLocally();
  res.json({ success: true, data: item });
});

app.delete("/delete-restaurant/:id", async (req, res) => {
  if (isConnected()) await Restaurant.findByIdAndDelete(req.params.id);
  else memoryDB.restaurants = memoryDB.restaurants.filter(x => x._id !== req.params.id);
  persistLocally();
  res.json({ success: true });
});

app.delete("/delete-activity/:id", async (req, res) => {
  if (isConnected()) await Activity.findByIdAndDelete(req.params.id);
  else memoryDB.activityLogs = memoryDB.activityLogs.filter(x => x._id !== req.params.id);
  persistLocally();
  res.json({ success: true });
});

// Admin Auth
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

app.post("/verify-admin", (req, res) => {
  if (req.body.adminId === ADMIN_ID && req.body.password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 System Live at http://localhost:${PORT}`));

module.exports = app;
