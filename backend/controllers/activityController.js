const Activity = require("../models/activity");
const { memoryDB, commitData, isLive } = require("../config/storage");

exports.getAllActivities = async (req, res) => {
    try {
        if (isLive()) {
            res.json(await Activity.find().sort({ timestamp: -1 }));
        } else {
            res.json(memoryDB.activityLogs.slice().reverse());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteActivity = async (req, res) => {
    try {
        if (isLive()) await Activity.findByIdAndDelete(req.params.id);
        else memoryDB.activityLogs = memoryDB.activityLogs.filter((x) => x._id !== req.params.id);
        commitData();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
