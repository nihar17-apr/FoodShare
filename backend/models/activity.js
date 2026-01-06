const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    actorType: {
        type: String,
        required: true
    },
    actorName: {
        type: String,
        required: true
    },
    actorEmail: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
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

module.exports = mongoose.model("Activity", activitySchema);
