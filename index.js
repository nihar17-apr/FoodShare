const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI; // No default to avoid crashing on Vercel

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- MEMORY STORAGE (Fallback if DB is offline) ---
let memoryDB = {
  restaurants: [],
  acceptors: [],
  deliveryPersons: [],
  activityLogs: []
};

// Database Connection Logic
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(err => console.error("❌ Database Connection Error:", err));
} else {
  console.warn("⚠️ No MONGODB_URI found. Running with temporary in-memory storage.");
}

// Models
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

// Helper to check if DB is connected
const isDBConnected = () => mongoose.connection.readyState === 1;

/* ===============================
   RESTAURANT ROUTES
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;
    const data = {
      name, email, phone, location, description,
      items: [{ food, quantity: parseInt(quantity), category }],
      isVerified: false,
      membership: membership || "Basic",
      createdAt: new Date()
    };

    if (isDBConnected()) {
      const restaurant = new Restaurant(data);
      await restaurant.save();
      await new Activity({ actorType: "Restaurant", actorName: name, actorEmail: email, action: "Submitted Donation", details: `Food: ${food}`, timestamp: new Date() }).save();
      res.status(201).json({ success: true, data: restaurant });
    } else {
      const item = { _id: Date.now().toString(), ...data };
      memoryDB.restaurants.push(item);
      memoryDB.activityLogs.push({ actorType: "Restaurant", actorName: name, action: "Submitted Donation", timestamp: new Date() });
      res.status(201).json({ success: true, data: item, warning: "Offline Mode: Data not saved permanently" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/restaurants", async (req, res) => {
  if (isDBConnected()) res.json(await Restaurant.find({ isVerified: true }));
  else res.json(memoryDB.restaurants.filter(r => r.isVerified));
});

/* ===============================
   ACCEPTOR ROUTES
================================ */
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;
    const data = { name, email, phone, location, food, quantity: parseInt(quantity), isVerified: false, membership: membership || "Basic", createdAt: new Date() };

    if (isDBConnected()) {
      const acceptor = new Acceptor(data);
      await acceptor.save();
      await new Activity({ actorType: "Acceptor", actorName: name, actorEmail: email, action: "Requested Food", details: `Food: ${food}`, timestamp: new Date() }).save();
      res.status(201).json({ success: true, data: acceptor });
    } else {
      const item = { _id: Date.now().toString(), ...data };
      memoryDB.acceptors.push(item);
      memoryDB.activityLogs.push({ actorType: "Acceptor", actorName: name, action: "Requested Food", timestamp: new Date() });
      res.status(201).json({ success: true, data: item });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/acceptors", async (req, res) => {
  if (isDBConnected()) res.json(await Acceptor.find({ isVerified: true }));
  else res.json(memoryDB.acceptors.filter(a => a.isVerified));
});

/* ===============================
   DELIVERY ROUTES
================================ */
app.post("/add-delivery", async (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;
    const data = { name, email, phone, location, vehicleType, licenseNumber, isVerified: false, status: "Available", createdAt: new Date() };

    if (isDBConnected()) {
      const d = new Delivery(data);
      await d.save();
      await new Activity({ actorType: "Delivery", actorName: name, actorEmail: email, action: "Registered", timestamp: new Date() }).save();
      res.status(201).json({ success: true, data: d });
    } else {
      const item = { _id: Date.now().toString(), ...data };
      memoryDB.deliveryPersons.push(item);
      res.status(201).json({ success: true, data: item });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ===============================
   ADMIN ROUTES
================================ */
app.get("/admin/restaurants", async (req, res) => {
  if (isDBConnected()) res.json(await Restaurant.find().sort({ createdAt: -1 }));
  else res.json(memoryDB.restaurants);
});

app.get("/admin/activities", async (req, res) => {
  if (isDBConnected()) res.json(await Activity.find().sort({ timestamp: -1 }));
  else res.json(memoryDB.activityLogs.slice().reverse());
});

app.get("/admin/acceptors", async (req, res) => {
  if (isDBConnected()) res.json(await Acceptor.find().sort({ createdAt: -1 }));
  else res.json(memoryDB.acceptors);
});

app.get("/admin/deliveries", async (req, res) => {
  if (isDBConnected()) res.json(await Delivery.find().sort({ createdAt: -1 }));
  else res.json(memoryDB.deliveryPersons);
});

// Admin Auth
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

// Fallback to Home
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
