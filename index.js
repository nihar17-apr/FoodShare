const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   IN-MEMORY STORAGE
================================ */
let restaurants = [];
let acceptors = [];
let activityLogs = [];

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
app.post("/add-restaurant", (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description } = req.body;

    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const restaurant = {
      _id: Date.now().toString(),
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
      membership: req.body.membership || "Basic",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    restaurants.push(restaurant);

    // Log activity
    activityLogs.push({
      _id: Date.now().toString(),
      actorType: "Restaurant",
      actorName: name,
      actorEmail: email,
      action: "Submitted Food Donation",
      details: `Food: ${food}, Quantity: ${quantity}, Category: ${category || 'N/A'}`,
      timestamp: new Date()
    });

    res.status(201).json({ message: "✅ Restaurant added successfully", data: restaurant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ACCEPTOR PORTAL
================================ */
app.post("/add-acceptor", (req, res) => {
  try {
    const { name, email, phone, location, food, quantity } = req.body;

    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const acceptor = {
      _id: Date.now().toString(),
      name,
      email,
      phone,
      location,
      food,
      quantity: parseInt(quantity),
      isVerified: false,
      rating: 0,
      membership: req.body.membership || "Basic",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    acceptors.push(acceptor);

    // Log activity
    activityLogs.push({
      _id: Date.now().toString(),
      actorType: "Acceptor",
      actorName: name,
      actorEmail: email,
      action: "Requested Food",
      details: `Food: ${food}, Quantity: ${quantity}`,
      timestamp: new Date()
    });

    res.status(201).json({ message: "✅ Acceptor added successfully", data: acceptor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   PUBLIC ROUTES (Verified Only)
================================ */
app.get("/restaurants", (req, res) => {
  res.json(restaurants.filter(r => r.isVerified));
});

app.get("/acceptors", (req, res) => {
  res.json(acceptors.filter(a => a.isVerified));
});

/* ===============================
   ADMIN ROUTES
================================ */
app.get("/admin/restaurants", (req, res) => {
  res.json(restaurants);
});

app.get("/admin/acceptors", (req, res) => {
  res.json(acceptors);
});

app.get("/admin/activities", (req, res) => {
  const sorted = [...activityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sorted);
});

app.get("/get-restaurant/:id", (req, res) => {
  const r = restaurants.find(x => x._id === req.params.id);
  if (!r) return res.status(404).json({ error: "Restaurant not found" });
  res.json(r);
});

app.get("/get-acceptor/:id", (req, res) => {
  const a = acceptors.find(x => x._id === req.params.id);
  if (!a) return res.status(404).json({ error: "Acceptor not found" });
  res.json(a);
});

/* ===============================
   VERIFY ROUTES
================================ */
app.put("/verify-restaurant/:id", (req, res) => {
  const r = restaurants.find(x => x._id === req.params.id);
  if (r) {
    r.isVerified = true;
    r.updatedAt = new Date();
  }
  res.json({ message: "✅ Restaurant verified", data: r });
});

app.put("/verify-acceptor/:id", (req, res) => {
  const a = acceptors.find(x => x._id === req.params.id);
  if (a) {
    a.isVerified = true;
    a.updatedAt = new Date();
  }
  res.json({ message: "✅ Acceptor verified", data: a });
});

/* ===============================
   DELETE ROUTES
================================ */
app.delete("/delete-restaurant/:id", (req, res) => {
  const restaurant = restaurants.find(x => x._id === req.params.id);
  restaurants = restaurants.filter(x => x._id !== req.params.id);
  res.json({ message: "✅ Restaurant deleted", data: restaurant });
});

app.delete("/delete-acceptor/:id", (req, res) => {
  const acceptor = acceptors.find(x => x._id === req.params.id);
  acceptors = acceptors.filter(x => x._id !== req.params.id);
  res.json({ message: "✅ Acceptor deleted", data: acceptor });
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
