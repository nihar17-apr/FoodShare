const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");

router.get("/admin/activities", activityController.getAllActivities);
router.delete("/delete-activity/:id", activityController.deleteActivity);

module.exports = router;
