const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Models
const Restaurant = require("./backend/models/restaurant");
const Acceptor = require("./backend/models/acceptor");
const Delivery = require("./backend/models/delivery");
const Activity = require("./backend/models/activity");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
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

if (fs.existsSync(LOCAL_DB_PATH)) {
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, "utf8");
    memoryDB = { ...memoryDB, ...JSON.parse(data) };
    console.log("📂 History loaded from db.json");
  } catch (err) { }
}

const commitData = () => {
  try { fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memoryDB, null, 2)); } catch (e) { }
};

// --- DB CONNECTION ---
let systemStatus = "Initializing...";
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => { systemStatus = "Connected to MongoDB Atlas (Persistent Mode)"; })
    .catch(err => { systemStatus = "Cloud Error: " + err.message; });
} else {
  systemStatus = "Offline Mode (Local Backup Active)";
}

const isLive = () => mongoose.connection.readyState === 1;

/* ===============================
   CORE LOGIC: AUTO-ALLOCATION (Real World)
================================ */

// Handle Restaurant Submission
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
      await new Activity({ actorType: "Restaurant", actorName: name, action: "Donated Food", details: `${quantity} portions of ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbData });
    }

    memoryDB.restaurants.push(record);
    memoryDB.activityLogs.push({ actorType: "Restaurant", actorName: name, action: "Donated Food", details: `${quantity} portions of ${food}`, timestamp: new Date() });
    commitData();
    res.status(201).json({ success: true, data: record, status: systemStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Handle Acceptor Submission
app.post("/add-acceptor", async (req, res) => {
  try {
    const { name, email, phone, location, food, quantity, membership } = req.body;
    const record = { _id: Date.now().toString(), name, email, phone, location, food, quantity: Number(quantity), isVerified: false, membership: membership || "Basic", createdAt: new Date() };

    if (isLive()) {
      const dbData = await new Acceptor(record).save();
      await new Activity({ actorType: "Acceptor", actorName: name, action: "Requested Food", details: `${quantity} portions of ${food}`, timestamp: new Date() }).save();
      return res.status(201).json({ success: true, data: dbData });
    }

    memoryDB.acceptors.push(record);
    memoryDB.activityLogs.push({ actorType: "Acceptor", actorName: name, action: "Requested Food", details: `${quantity} portions of ${food}`, timestamp: new Date() });
    commitData();
    res.status(201).json({ success: true, data: record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ===============================
   ADMIN APPROVAL (Real-World Deduction Logic)
================================ */

// Verify Restaurant
app.put("/verify-restaurant/:id", async (req, res) => {
  try {
    if (isLive()) {
      const data = await Restaurant.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
      return res.json({ success: true, data });
    }
    const item = memoryDB.restaurants.find(x => x._id === req.params.id);
    if (item) item.isVerified = true;
    commitData();
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify Acceptor & Deduct Inventory
app.put("/verify-acceptor/:id", async (req, res) => {
  try {
    let acceptorRecord;
    if (isLive()) {
      acceptorRecord = await Acceptor.findById(req.params.id);
      if (!acceptorRecord) return res.status(404).json({ error: "Acceptor not found" });
    } else {
      acceptorRecord = memoryDB.acceptors.find(x => x._id === req.params.id);
      if (!acceptorRecord) return res.status(404).json({ error: "Acceptor not found" });
    }

    const requestedFood = acceptorRecord.food.toLowerCase();
    const requestedQty = acceptorRecord.quantity;
    let matched = false;
    let matchDetails = "No matching verified restaurant found.";

    // Real World Logic: Deduct from available verified restaurant portions
    if (isLive()) {
      const restaurants = await Restaurant.find({ isVerified: true });
      for (let rest of restaurants) {
        let item = rest.items.find(i => i.food.toLowerCase() === requestedFood && i.quantity >= requestedQty);
        if (item) {
          item.quantity -= requestedQty;
          await rest.save();
          matched = true;
          matchDetails = `Matched with ${rest.name}. Deducted ${requestedQty} portions. Remaining: ${item.quantity}`;
          break;
        }
      }
      acceptorRecord.isVerified = true;
      await acceptorRecord.save();
      await new Activity({ actorType: "System", actorName: "Allocation Engine", action: "Matched Food", details: `Acceptor ${acceptorRecord.name} matched. ${matchDetails}`, timestamp: new Date() }).save();
    } else {
      const verifiedRests = memoryDB.restaurants.filter(r => r.isVerified);
      for (let rest of verifiedRests) {
        let item = rest.items.find(i => i.food.toLowerCase() === requestedFood && i.quantity >= requestedQty);
        if (item) {
          item.quantity -= requestedQty;
          matched = true;
          matchDetails = `Matched with ${rest.name}. Deducted ${requestedQty} portions. Remaining: ${item.quantity}`;
          break;
        }
      }
      acceptorRecord.isVerified = true;
      memoryDB.activityLogs.push({ actorType: "System", actorName: "Allocation Engine", action: "Matched Food", details: `Acceptor ${acceptorRecord.name} matched. ${matchDetails}`, timestamp: new Date() });
      commitData();
    }

    res.json({ success: true, data: acceptorRecord, matchInfo: matchDetails });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ===============================
   OTHER ROUTES
================================ */
app.post("/add-delivery", async (req, res) => {
  try {
    const d = req.body;
    if (isLive()) {
      const dbData = await new Delivery({ ...d, isVerified: false, status: "Available" }).save();
      return res.json({ success: true, data: dbData });
    }
    const record = { _id: Date.now().toString(), ...d, isVerified: false, status: "Available", createdAt: new Date() };
    memoryDB.deliveryPersons.push(record);
    commitData();
    res.json({ success: true, data: record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/admin/db-status", (req, res) => res.json({ status: systemStatus }));
app.get("/admin/restaurants", async (req, res) => isLive() ? res.json(await Restaurant.find().sort({ createdAt: -1 })) : res.json(memoryDB.restaurants.slice().reverse()));
app.get("/admin/acceptors", async (req, res) => isLive() ? res.json(await Acceptor.find().sort({ createdAt: -1 })) : res.json(memoryDB.acceptors.slice().reverse()));
app.get("/admin/activities", async (req, res) => isLive() ? res.json(await Activity.find().sort({ timestamp: -1 })) : res.json(memoryDB.activityLogs.slice().reverse()));
app.get("/admin/deliveries", async (req, res) => isLive() ? res.json(await Delivery.find().sort({ createdAt: -1 })) : res.json(memoryDB.deliveryPersons.slice().reverse()));

app.delete("/delete-restaurant/:id", async (req, res) => {
  if (isLive()) await Restaurant.findByIdAndDelete(req.params.id);
  else memoryDB.restaurants = memoryDB.restaurants.filter(x => x._id !== req.params.id);
  commitData();
  res.json({ success: true });
});

app.post("/verify-admin", (req, res) => {
  const { adminId, password } = req.body;
  if (adminId === (process.env.ADMIN_ID || "Nihar") && password === (process.env.ADMIN_PASSWORD || "1234")) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 FoodToNeed System Live`));
