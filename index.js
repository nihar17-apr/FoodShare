const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   IN-MEMORY STORAGE
================================ */
let restaurants = [];
let acceptors = [];

/* ===============================
   HOME ROUTE
================================ */
app.get("/", (req, res) => {
  res.send("🍽 FoodShare Backend Running on PORT 3000");
});

/* ===============================
   RESTAURANT PORTAL
================================ */
app.post("/add-restaurant", (req, res) => {
  const restaurant = {
    _id: Date.now().toString(),
    name: req.body.name,
    location: req.body.location,
    items: req.body.items || [
      {
        food: req.body.food,
        quantity: req.body.quantity
      }
    ],
    isVerified: false,
    createdAt: new Date()
  };

  restaurants.push(restaurant);
  res.json({ success: true });
});

/* ===============================
   ACCEPTOR PORTAL
================================ */
app.post("/add-acceptor", (req, res) => {
  const acceptor = {
    _id: Date.now().toString(),
    name: req.body.name,
    location: req.body.location,
    food: req.body.food,
    quantity: req.body.quantity,
    isVerified: false,
    createdAt: new Date()
  };

  acceptors.push(acceptor);
  res.json({ success: true });
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
  if (r) r.isVerified = true;
  res.json({ success: true });
});

app.put("/verify-acceptor/:id", (req, res) => {
  const a = acceptors.find(x => x._id === req.params.id);
  if (a) a.isVerified = true;
  res.json({ success: true });
});

/* ===============================
   DELETE ROUTES
================================ */
app.delete("/delete-restaurant/:id", (req, res) => {
  restaurants = restaurants.filter(x => x._id !== req.params.id);
  res.json({ success: true });
});

app.delete("/delete-acceptor/:id", (req, res) => {
  acceptors = acceptors.filter(x => x._id !== req.params.id);
  res.json({ success: true });
});

/* ===============================
   SERVER START
================================ */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
