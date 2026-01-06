const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodshare";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection (Persistent Storage)
// This ensures history is never lost unless manually deleted by admin.
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Database Connected: History will be stored permanently."))
  .catch(err => console.error("❌ Database Connection Error:", err));

// Models (Separated for clean code)
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

/* ===============================
   RESTAURANT ROUTES
================================ */
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;

    const restaurant = new Restaurant({
      name, email, phone, location, description,
      items: [{ food, quantity: parseInt(quantity), category }],
      isVerified: false,
      membership: membership || "Basic"
    });
    await restaurant.save();

    await new Activity({
      actorType: "Restaurant",
      actorName: name,
      actorEmail: email,
      action: "Submitted Food Donation",
      details: `Food: ${food}, Quantity: ${quantity}`
    }).save();

    res.status(201).json({ success: true, message: "✅ Restaurant added successfully", data: restaurant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/restaurants", async (req, res) => {
  const data = await Restaurant.find({ isVerified: true });
  res.json(data);
});

/* ===============================
   ACCEPTOR ROUTES
================================ */
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;

    const acceptor = new Acceptor({
      name, email, phone, location, food,
      quantity: parseInt(quantity),
      isVerified: false,
      membership: membership || "Basic"
    });
    await acceptor.save();

    await new Activity({
      actorType: "Acceptor",
      actorName: name,
      actorEmail: email,
      action: "Requested Food",
      details: `Food: ${food}, Quantity: ${quantity}`
    }).save();

    res.status(201).json({ success: true, message: "✅ Acceptor added successfully", data: acceptor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/acceptors", async (req, res) => {
  const data = await Acceptor.find({ isVerified: true });
  res.json(data);
});

/* ===============================
   DELIVERY ROUTES
================================ */
app.post("/add-delivery", async (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;

    const delivery = new Delivery({
      name, email, phone, location, vehicleType, licenseNumber,
      isVerified: false,
      status: "Available"
    });
    await delivery.save();

    await new Activity({
      actorType: "Delivery",
      actorName: name,
      actorEmail: email,
      action: "Registered for Delivery",
      details: `Vehicle: ${vehicleType}`
    }).save();

    res.status(201).json({ success: true, message: "✅ Delivery person added successfully", data: delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ADMIN ACTIONS (Persistence Management)
================================ */

// Fetch all for admin dashboard
app.get("/admin/restaurants", async (req, res) => res.json(await Restaurant.find().sort({ createdAt: -1 })));
app.get("/admin/acceptors", async (req, res) => res.json(await Acceptor.find().sort({ createdAt: -1 })));
app.get("/admin/deliveries", async (req, res) => res.json(await Delivery.find().sort({ createdAt: -1 })));
app.get("/admin/activities", async (req, res) => res.json(await Activity.find().sort({ timestamp: -1 })));

// Verification
app.put("/verify-restaurant/:id", async (req, res) => {
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  res.json({ success: true, data: r });
});

app.put("/verify-acceptor/:id", async (req, res) => {
  const a = await Acceptor.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  res.json({ success: true, data: a });
});

app.put("/verify-delivery/:id", async (req, res) => {
  const d = await Delivery.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  res.json({ success: true, data: d });
});

// Deletion (History Management)
app.delete("/delete-restaurant/:id", async (req, res) => {
  await Restaurant.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Removed from database" });
});

app.delete("/delete-acceptor/:id", async (req, res) => {
  await Acceptor.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Removed from database" });
});

app.delete("/delete-delivery/:id", async (req, res) => {
  await Delivery.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Removed from database" });
});

app.delete("/delete-activity/:id", async (req, res) => {
  await Activity.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Log entry deleted" });
});

// Admin Auth
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Welcome Admin" });
  } else {
    res.status(401).json({ success: false, error: "Invalid Credentials" });
  }
});

// Fallback to Home
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 FoodToNeed Backend running at http://localhost:${PORT}`));
