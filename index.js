const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB } = require("./backend/config/storage");
const seedData = require("./backend/middleware/seed");

// Import Routes
const restaurantRoutes = require("./backend/routes/restaurantRoutes");
const acceptorRoutes = require("./backend/routes/acceptorRoutes");
const activityRoutes = require("./backend/routes/activityRoutes");
const adminRoutes = require("./backend/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 8080;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", restaurantRoutes);
app.use("/", acceptorRoutes);
app.use("/", activityRoutes);
app.use("/", adminRoutes);

// SPA Fallback
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Seed Data
setTimeout(seedData, 5000);

app.listen(PORT, () => console.log(`🚀 Server navigating at http://localhost:${PORT}`));
