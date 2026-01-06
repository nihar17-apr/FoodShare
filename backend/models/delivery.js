const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
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
    vehicleType: {
        type: String,
        required: true
    },
    licenseNumber: {
        type: String,
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: "Available"
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

module.exports = mongoose.model("Delivery", deliverySchema);
