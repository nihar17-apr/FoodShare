const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let restaurants = [];
let acceptors = [];

// Home
app.get("/", (req, res) => {
  res.send("🍽 FoodShare Backend Running");
});

// Restaurant submits food
app.post("/add-restaurant", (req, res) => {
  restaurants.push(req.body);
  res.json({ message: "Restaurant data added" });
});

// Acceptor submits request (default status = Pending)
app.post("/add-acceptor", (req, res) => {
  req.body.status = "Pending";
  acceptors.push(req.body);
  res.json({ message: "Acceptor request added" });
});

// Admin fetches acceptors
app.get("/acceptors", (req, res) => {
  res.json(acceptors);
});

// Admin approves / rejects acceptor
app.post("/acceptor-status", (req, res) => {
  const { index, status } = req.body;
  acceptors[index].status = status;
  res.json({ message: "Status updated" });
});

// MATCHING LOGIC
app.get("/matches/:food", (req, res) => {
  const food = req.params.food.toLowerCase();
  const matched = restaurants.filter(r =>
    r.food.toLowerCase() === food
  );
  res.json(matched);
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
