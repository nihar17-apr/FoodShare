const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");

router.get("/restaurants", restaurantController.getAllVerified);
router.post("/add-restaurant", restaurantController.addRestaurant);
router.put("/verify-restaurant/:id", restaurantController.verifyRestaurant);
router.delete("/delete-restaurant/:id", restaurantController.deleteRestaurant);
router.get("/admin/restaurants", restaurantController.getAdminRestaurants);

module.exports = router;
