const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// ✅ middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ PUT THIS LINE HERE
app.use(express.static("public"));

// ===============================
// ROUTES BELOW
// ===============================
app.get("/", (req, res) => {
  res.send("🍽 FoodShare Backend Running on PORT 3000");
});
