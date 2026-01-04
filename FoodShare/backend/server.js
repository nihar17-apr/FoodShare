const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Restaurant = require("./models/restaurant");
const Acceptor = require("./models/acceptor");
const Admin = require("./models/admin");
const ActivityLog = require("./models/activityLog");

const app = express();

/* =========================
   🔧 MIDDLEWARE
   ========================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

/* =========================
   🔗 MONGODB CONNECTION
   ========================= */
let mongoConnected = false;

mongoose.connect("mongodb://localhost:27017/foodshare", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    mongoConnected = true;
    console.log("✅ MongoDB Connected");
  })
  .catch(err => {
    mongoConnected = false;
    console.log("⚠️ MongoDB unavailable - using in-memory storage");
  });

// Fallback in-memory storage
let inMemoryRestaurants = [];
let inMemoryAcceptors = [];
let inMemoryActivityLogs = [];

// Admin credentials are configurable via environment variables in CI/production.
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

/* =========================
   🏠 BACKEND HOME ROUTE
   ========================= */
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "../public/index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Fallback status page when no static index is available
  res.send(`
    <h1>🍽 Food To Need – Backend Running</h1>
    <p>Server is working successfully.</p>
    <p>Database: ${mongoConnected ? "✅ MongoDB" : "⚠️ In-Memory"}</p>

    <h3>Available Portals</h3>
    <ul>
      <li><a href="/restaurant.html" target="_blank">🏨 Restaurant Portal</a></li>
      <li><a href="/acceptor.html" target="_blank">🏠 Acceptor Portal</a></li>
      <li><a href="/admin.html" target="_blank">👨‍💼 Admin Dashboard</a></li>
    </ul>
  `);
});

/* =========================
   🍽 RESTAURANT APIs
   ========================= */

// Add new restaurant
app.post("/add-restaurant", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description } = req.body;

    // Validation
    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (mongoConnected) {
      const newRestaurant = new Restaurant({
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
        isVerified: false
      });

      const savedRestaurant = await newRestaurant.save();

      // Log activity
      const logEntry = new ActivityLog({
        actorType: "Restaurant",
        actorName: name,
        actorEmail: email,
        action: "Submitted Food Donation",
        details: `Food: ${food}, Quantity: ${quantity}, Category: ${category || 'N/A'}`
      });
      await logEntry.save();

      res.status(201).json({ message: "✅ Restaurant added successfully", data: savedRestaurant });
    } else {
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
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryRestaurants.push(restaurant);

      // Log activity (in-memory)
      inMemoryActivityLogs.push({
        _id: Date.now().toString(),
        actorType: "Restaurant",
        actorName: name,
        actorEmail: email,
        action: "Submitted Food Donation",
        details: `Food: ${food}, Quantity: ${quantity}, Category: ${category || 'N/A'}`,
        timestamp: new Date()
      });

      res.status(201).json({ message: "✅ Restaurant added successfully", data: restaurant });
    }
  } catch (err) {
    console.error("Error adding restaurant:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all restaurants (public view - verified only)
app.get("/restaurants", async (req, res) => {
  try {
    let verified;
    if (mongoConnected) {
      verified = await Restaurant.find({ isVerified: true });
    } else {
      verified = inMemoryRestaurants.filter(r => r.isVerified);
    }
    res.json(verified);
  } catch (err) {
    console.error("Error fetching restaurants:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all restaurants (admin view - all including unverified)
app.get("/admin/restaurants", async (req, res) => {
  try {
    let all;
    if (mongoConnected) {
      all = await Restaurant.find();
    } else {
      all = inMemoryRestaurants;
    }
    res.json(all);
  } catch (err) {
    console.error("Error fetching admin restaurants:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single restaurant
app.get("/get-restaurant/:id", async (req, res) => {
  try {
    let restaurant;
    if (mongoConnected) {
      restaurant = await Restaurant.findById(req.params.id);
    } else {
      restaurant = inMemoryRestaurants.find(r => r._id === req.params.id);
    }
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (err) {
    console.error("Error fetching restaurant:", err);
    res.status(500).json({ error: err.message });
  }
});

// Verify restaurant
app.put("/verify-restaurant/:id", async (req, res) => {
  try {
    let restaurant;
    if (mongoConnected) {
      restaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        { isVerified: true, updatedAt: new Date() },
        { new: true }
      );
    } else {
      restaurant = inMemoryRestaurants.find(r => r._id === req.params.id);
      if (restaurant) {
        restaurant.isVerified = true;
        restaurant.updatedAt = new Date();
      }
    }
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    res.json({ message: "✅ Restaurant verified", data: restaurant });
  } catch (err) {
    console.error("Error verifying restaurant:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete restaurant
app.delete("/delete-restaurant/:id", async (req, res) => {
  try {
    let restaurant;
    if (mongoConnected) {
      restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    } else {
      const index = inMemoryRestaurants.findIndex(r => r._id === req.params.id);
      if (index !== -1) {
        restaurant = inMemoryRestaurants.splice(index, 1)[0];
      }
    }
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    res.json({ message: "✅ Restaurant deleted", data: restaurant });
  } catch (err) {
    console.error("Error deleting restaurant:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🏠 ACCEPTOR APIs
   ========================= */

// Add new acceptor
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity } = req.body;

    // Validation
    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (mongoConnected) {
      const newAcceptor = new Acceptor({
        name,
        email,
        phone,
        location,
        food,
        quantity: parseInt(quantity),
        isVerified: false
      });

      const savedAcceptor = await newAcceptor.save();

      // Log activity
      const logEntry = new ActivityLog({
        actorType: "Acceptor",
        actorName: name,
        actorEmail: email,
        action: "Requested Food",
        details: `Food: ${food}, Quantity: ${quantity}`
      });
      await logEntry.save();

      res.status(201).json({ message: "✅ Acceptor added successfully", data: savedAcceptor });
    } else {
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
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryAcceptors.push(acceptor);

      // Log activity (in-memory)
      inMemoryActivityLogs.push({
        _id: Date.now().toString(),
        actorType: "Acceptor",
        actorName: name,
        actorEmail: email,
        action: "Requested Food",
        details: `Food: ${food}, Quantity: ${quantity}`,
        timestamp: new Date()
      });

      res.status(201).json({ message: "✅ Acceptor added successfully", data: acceptor });
    }
  } catch (err) {
    console.error("Error adding acceptor:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all acceptors (public view - verified only)
app.get("/acceptors", async (req, res) => {
  try {
    let verified;
    if (mongoConnected) {
      verified = await Acceptor.find({ isVerified: true });
    } else {
      verified = inMemoryAcceptors.filter(a => a.isVerified);
    }
    res.json(verified);
  } catch (err) {
    console.error("Error fetching acceptors:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all acceptors (admin view - all including unverified)
app.get("/admin/acceptors", async (req, res) => {
  try {
    let all;
    if (mongoConnected) {
      all = await Acceptor.find();
    } else {
      all = inMemoryAcceptors;
    }
    res.json(all);
  } catch (err) {
    console.error("Error fetching admin acceptors:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single acceptor
app.get("/get-acceptor/:id", async (req, res) => {
  try {
    let acceptor;
    if (mongoConnected) {
      acceptor = await Acceptor.findById(req.params.id);
    } else {
      acceptor = inMemoryAcceptors.find(a => a._id === req.params.id);
    }
    if (!acceptor) {
      return res.status(404).json({ error: "Acceptor not found" });
    }
    res.json(acceptor);
  } catch (err) {
    console.error("Error fetching acceptor:", err);
    res.status(500).json({ error: err.message });
  }
});

// Verify acceptor
app.put("/verify-acceptor/:id", async (req, res) => {
  try {
    let acceptor;
    if (mongoConnected) {
      acceptor = await Acceptor.findByIdAndUpdate(
        req.params.id,
        { isVerified: true, updatedAt: new Date() },
        { new: true }
      );
    } else {
      acceptor = inMemoryAcceptors.find(a => a._id === req.params.id);
      if (acceptor) {
        acceptor.isVerified = true;
        acceptor.updatedAt = new Date();
      }
    }
    if (!acceptor) {
      return res.status(404).json({ error: "Acceptor not found" });
    }
    res.json({ message: "✅ Acceptor verified", data: acceptor });
  } catch (err) {
    console.error("Error verifying acceptor:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete acceptor
app.delete("/delete-acceptor/:id", async (req, res) => {
  try {
    let acceptor;
    if (mongoConnected) {
      acceptor = await Acceptor.findByIdAndDelete(req.params.id);
    } else {
      const index = inMemoryAcceptors.findIndex(a => a._id === req.params.id);
      if (index !== -1) {
        acceptor = inMemoryAcceptors.splice(index, 1)[0];
      }
    }
    if (!acceptor) {
      return res.status(404).json({ error: "Acceptor not found" });
    }
    res.json({ message: "✅ Acceptor deleted", data: acceptor });
  } catch (err) {
    console.error("Error deleting acceptor:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   �‍💼 ADMIN AUTHENTICATION
   ========================= */

// Admin login verification
app.post("/verify-admin", (req, res) => {
  try {
    const { adminId, password } = req.body;

    // Use configurable admin credentials (see ADMIN_ID / ADMIN_PASSWORD env vars)
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
  } catch (err) {
    console.error("Error verifying admin:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   📜 ACTIVITY LOG APIs
   ========================= */

// Get all activity logs (admin view)
app.get("/admin/activities", async (req, res) => {
  try {
    let logs;
    if (mongoConnected) {
      logs = await ActivityLog.find().sort({ timestamp: -1 });
    } else {
      logs = [...inMemoryActivityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    res.json(logs);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   �🚀 SERVER START (ALWAYS LAST)
   ========================= */
app.listen(5000, () => {
  console.log("🚀 Backend running at http://localhost:5000");
});
