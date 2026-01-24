const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/verify-admin", adminController.verifyAdmin);
router.get("/admin/db-status", adminController.getDbStatus);
router.get("/admin/storage-stats", adminController.getStorageStats);
router.get("/admin/deliveries", adminController.getDeliveries);

module.exports = router;
