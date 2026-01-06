const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: "",
    trim: true
  },
  items: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      food: String,
      quantity: Number,
      category: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  isVerified: {
    type: Boolean,
    default: false
  },
  membership: {
    type: String,
    enum: ["Basic", "Silver", "Gold"],
    default: "Basic"
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
