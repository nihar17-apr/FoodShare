const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  adminId: String,
  password: String
});

module.exports = mongoose.model("Admin", adminSchema);
