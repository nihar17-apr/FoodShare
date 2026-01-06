const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join("/tmp", "db.json"); // Use /tmp for Vercel (non-persistent but won't crash)

// Hybrid Storage Object
let memoryDB = {
  restaurants: [],
  acceptors: [],
  deliveryPersons: [],
  activityLogs: []
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// --- DATABASE LOGIC ---
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

  // Define Schemas if using MongoDB
  const schemaOptions = { timestamps: true };
  const Restaurant = mongoose.models.Restaurant || mongoose.model("Restaurant", new mongoose.Schema({
    name: String, email: String, phone: String, location: String, description: String,
    items: Array, isVerified: Boolean, rating: Number, membership: String
  }, schemaOptions));

  const Acceptor = mongoose.models.Acceptor || mongoose.model("Acceptor", new mongoose.Schema({
    name: String, email: String, phone: String, location: String, food: String,
    quantity: Number, isVerified: Boolean, rating: Number, membership: String
  }, schemaOptions));

  const Delivery = mongoose.models.Delivery || mongoose.model("Delivery", new mongoose.Schema({
    name: String, email: String, phone: String, location: String,
    vehicleType: String, licenseNumber: String, isVerified: Boolean, status: String
  }, schemaOptions));

  const Activity = mongoose.models.Activity || mongoose.model("Activity", new mongoose.Schema({
    actorType: String, actorName: String, actorEmail: String, action: String, details: String, timestamp: Date
  }));

  // Map Routes to MongoDB
  app.post("/add-restaurant", async (req, res) => {
    try {
      const restaurant = new Restaurant({ ...req.body, items: [{ food: req.body.food, quantity: req.body.quantity, category: req.body.category }], isVerified: false, rating: 0, membership: req.body.membership || "Basic" });
      await restaurant.save();
      await new Activity({ actorType: "Restaurant", actorName: req.body.name, actorEmail: req.body.email, action: "Submitted Food Donation", details: `Food: ${req.body.food}`, timestamp: new Date() }).save();
      res.status(201).json({ success: true, data: restaurant });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // ... (Other MongoDB routes omitted for brevity but they follow the same pattern)
} else {
  // Use Local File / Memory Fallback (Safe for Vercel)
  console.log("⚠️ No MONGODB_URI found. Using temporary file storage.");

  function getDB() {
    try {
      if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) { }
    return memoryDB;
  }

  function saveDB(data) {
    memoryDB = data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      // Ignore write errors on read-only environments like Vercel
    }
  }

  app.post("/add-restaurant", (req, res) => {
    const db = getDB();
    const item = { _id: Date.now().toString(), ...req.body, isVerified: false, createdAt: new Date() };
    db.restaurants.push(item);
    db.activityLogs.push({ actorType: "Restaurant", actorName: req.body.name, action: "Submitted Donation", timestamp: new Date() });
    saveDB(db);
    res.json({ success: true, data: item });
  });
}

// Basic Admin Routes (Working with either DB)
app.get("/admin/activities", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const logs = await mongoose.model("Activity").find().sort({ timestamp: -1 });
    res.json(logs);
  } else {
    res.json(memoryDB.activityLogs.reverse());
  }
});

app.get("/admin/restaurants", async (req, res) => {
  if (mongoose.connection.readyState === 1) res.json(await mongoose.model("Restaurant").find());
  else res.json(memoryDB.restaurants);
});

// Admin credentials
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
