const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  actorType: {
    type: String,
    required: true,
    enum: ["Restaurant", "Acceptor"]
  },
  actorName: {
    type: String,
    required: true,
    trim: true
  },
  actorEmail: {
    type: String,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    default: ""
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
