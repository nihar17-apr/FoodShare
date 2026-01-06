const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Import Models
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodshare";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Admin credentials
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

/* ===============================
   HOME ROUTE - Serve index.html
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   RESTAURANT PORTAL
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;

    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const restaurant = new Restaurant({
      name,
      email,
      phone,
      location,
      description,
      items: [{
        food,
        quantity: parseInt(quantity),
        category
      }],
      isVerified: false,
      rating: 0,
      membership: membership || "Basic"
    });

    await restaurant.save();

    // Log activity
    const activity = new Activity({
      actorType: "Restaurant",
      actorName: name,
      actorEmail: email,
      action: "Submitted Food Donation",
      details: `Food: ${food}, Quantity: ${quantity}, Category: ${category || 'N/A'}`
    });
    await activity.save();

    res.status(201).json({ message: "✅ Restaurant added successfully", data: restaurant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ACCEPTOR PORTAL
================================ */
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;

    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const acceptor = new Acceptor({
      name,
      email,
      phone,
      location,
      food,
      quantity: parseInt(quantity),
      isVerified: false,
      rating: 0,
      membership: membership || "Basic"
    });

    await acceptor.save();

    // Log activity
    const activity = new Activity({
      actorType: "Acceptor",
      actorName: name,
      actorEmail: email,
      action: "Requested Food",
      details: `Food: ${food}, Quantity: ${quantity}`
    });
    await activity.save();

    res.status(201).json({ message: "✅ Acceptor added successfully", data: acceptor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   DELIVERY PORTAL
================================ */
app.post("/add-delivery", async (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;

    if (!name || !email || !phone || !location || !vehicleType) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const deliveryPerson = new Delivery({
      name,
      email,
      phone,
      location,
      vehicleType,
      licenseNumber,
      isVerified: false,
      status: "Available"
    });

    await deliveryPerson.save();

    // Log activity
    const activity = new Activity({
      actorType: "Delivery",
      actorName: name,
      actorEmail: email,
      action: "Registered for Delivery",
      details: `Vehicle: ${vehicleType}`
    });
    await activity.save();

    res.status(201).json({ message: "✅ Delivery person added successfully", data: deliveryPerson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   PUBLIC ROUTES (Verified Only)
================================ */
app.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isVerified: true });
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/acceptors", async (req, res) => {
  try {
    const acceptors = await Acceptor.find({ isVerified: true });
    res.json(acceptors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ADMIN ROUTES
================================ */
app.get("/admin/restaurants", async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/acceptors", async (req, res) => {
  try {
    const acceptors = await Acceptor.find().sort({ createdAt: -1 });
    res.json(acceptors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/activities", async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/deliveries", async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/get-restaurant/:id", async (req, res) => {
  try {
    const r = await Restaurant.findById(req.params.id);
    if (!r) return res.status(404).json({ error: "Restaurant not found" });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/get-acceptor/:id", async (req, res) => {
  try {
    const a = await Acceptor.findById(req.params.id);
    if (!a) return res.status(404).json({ error: "Acceptor not found" });
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/get-delivery/:id", async (req, res) => {
  try {
    const d = await Delivery.findById(req.params.id);
    if (!d) return res.status(404).json({ error: "Delivery person not found" });
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   VERIFY ROUTES
================================ */
app.put("/verify-restaurant/:id", async (req, res) => {
  try {
    const r = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, updatedAt: new Date() },
      { new: true }
    );
    res.json({ message: "✅ Restaurant verified", data: r });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/verify-acceptor/:id", async (req, res) => {
  try {
    const a = await Acceptor.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, updatedAt: new Date() },
      { new: true }
    );
    res.json({ message: "✅ Acceptor verified", data: a });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/verify-delivery/:id", async (req, res) => {
  try {
    const d = await Delivery.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, updatedAt: new Date() },
      { new: true }
    );
    res.json({ message: "✅ Delivery person verified", data: d });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   DELETE ROUTES
================================ */
app.delete("/delete-restaurant/:id", async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Restaurant deleted", data: restaurant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/delete-acceptor/:id", async (req, res) => {
  try {
    const acceptor = await Acceptor.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Acceptor deleted", data: acceptor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/delete-delivery/:id", async (req, res) => {
  try {
    const dp = await Delivery.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Delivery person deleted", data: dp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ADMIN AUTHENTICATION
================================ */
app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;

  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
    res.json({
      message: "✅ Admin verified",
      success: true,
      admin: { adminId: ADMIN_ID }
    });
  } else {
    res.status(401).json({
      error: "Invalid credentials",
      success: false
    });
  }
});

/* ===============================
   SERVER START
================================ */
app.listen(PORT, () => {
  console.log(`🚀 FoodShare Backend running at http://localhost:${PORT}`);
});

// Export for Vercel
module.exports = app;
