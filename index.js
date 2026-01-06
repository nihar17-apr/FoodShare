const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Initialize DB file if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    restaurants: [],
    acceptors: [],
    deliveryPersons: [],
    activityLogs: []
  }, null, 2));
}

// Helper functions for JSON DB
function readDB() {
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Admin credentials
const ADMIN_ID = process.env.ADMIN_ID || "Nihar";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

/* ===============================
   HOME ROUTE
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   RESTAURANT PORTAL
================================ */
app.post("/add-restaurant", (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, category, description, membership } = req.body;
    if (!name || !email || !phone || !location || !food || !quantity) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const db = readDB();
    const restaurant = {
      _id: Date.now().toString(),
      name, email, phone, location, description,
      items: [{ food, quantity: parseInt(quantity), category }],
      isVerified: false,
      rating: 0,
      membership: membership || "Basic",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.restaurants.push(restaurant);
    db.activityLogs.push({
      _id: Date.now().toString(),
      actorType: "Restaurant",
      actorName: name,
      actorEmail: email,
      action: "Submitted Food Donation",
      details: `Food: ${food}, Quantity: ${quantity}`,
      timestamp: new Date()
    });

    writeDB(db);
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
    const { name, email, phone, location, food, quantity, membership } = req.body;
    const db = readDB();
    const acceptor = {
      _id: Date.now().toString(),
      name, email, phone, location, food,
      quantity: parseInt(quantity),
      isVerified: false,
      rating: 0,
      membership: membership || "Basic",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.acceptors.push(acceptor);
    db.activityLogs.push({
      _id: Date.now().toString(),
      actorType: "Acceptor",
      actorName: name,
      actorEmail: email,
      action: "Requested Food",
      details: `Food: ${food}, Quantity: ${quantity}`,
      timestamp: new Date()
    });

    writeDB(db);
    res.status(201).json({ message: "✅ Acceptor added successfully", data: acceptor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   DELIVERY PORTAL
================================ */
app.post("/add-delivery", (req, res) => {
  try {
    const { name, email, phone, location, vehicleType, licenseNumber } = req.body;
    const db = readDB();
    const delivery = {
      _id: Date.now().toString(),
      name, email, phone, location, vehicleType, licenseNumber,
      isVerified: false,
      status: "Available",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.deliveryPersons.push(delivery);
    db.activityLogs.push({
      _id: Date.now().toString(),
      actorType: "Delivery",
      actorName: name,
      actorEmail: email,
      action: "Registered for Delivery",
      details: `Vehicle: ${vehicleType}`,
      timestamp: new Date()
    });

    writeDB(db);
    res.status(201).json({ message: "✅ Delivery person added successfully", data: delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   ADMIN ROUTES
================================ */
app.get("/restaurants", (req, res) => {
  const db = readDB();
  res.json(db.restaurants.filter(r => r.isVerified));
});

app.get("/acceptors", (req, res) => {
  const db = readDB();
  res.json(db.acceptors.filter(a => a.isVerified));
});

app.get("/admin/restaurants", (req, res) => res.json(readDB().restaurants));
app.get("/admin/acceptors", (req, res) => res.json(readDB().acceptors));
app.get("/admin/deliveries", (req, res) => res.json(readDB().deliveryPersons));
app.get("/admin/activities", (req, res) => {
  const logs = readDB().activityLogs;
  res.json(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.put("/verify-restaurant/:id", (req, res) => {
  const db = readDB();
  const r = db.restaurants.find(x => x._id === req.params.id);
  if (r) { r.isVerified = true; r.updatedAt = new Date(); }
  writeDB(db);
  res.json({ message: "✅ Restaurant verified", data: r });
});

app.put("/verify-acceptor/:id", (req, res) => {
  const db = readDB();
  const a = db.acceptors.find(x => x._id === req.params.id);
  if (a) { a.isVerified = true; a.updatedAt = new Date(); }
  writeDB(db);
  res.json({ message: "✅ Acceptor verified", data: a });
});

app.put("/verify-delivery/:id", (req, res) => {
  const db = readDB();
  const d = db.deliveryPersons.find(x => x._id === req.params.id);
  if (d) { d.isVerified = true; d.updatedAt = new Date(); }
  writeDB(db);
  res.json({ message: "✅ Delivery person verified", data: d });
});

app.delete("/delete-restaurant/:id", (req, res) => {
  let db = readDB();
  const item = db.restaurants.find(x => x._id === req.params.id);
  db.restaurants = db.restaurants.filter(x => x._id !== req.params.id);
  writeDB(db);
  res.json({ message: "✅ Deleted", data: item });
});

app.delete("/delete-acceptor/:id", (req, res) => {
  let db = readDB();
  const item = db.acceptors.find(x => x._id === req.params.id);
  db.acceptors = db.acceptors.filter(x => x._id !== req.params.id);
  writeDB(db);
  res.json({ message: "✅ Deleted", data: item });
});

app.delete("/delete-delivery/:id", (req, res) => {
  let db = readDB();
  const item = db.deliveryPersons.find(x => x._id === req.params.id);
  db.deliveryPersons = db.deliveryPersons.filter(x => x._id !== req.params.id);
  writeDB(db);
  res.json({ message: "✅ Deleted", data: item });
});

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
    res.json({ success: true, admin: { adminId: ADMIN_ID } });
  } else {
    res.status(401).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
