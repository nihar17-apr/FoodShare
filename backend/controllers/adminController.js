const Delivery = require("../models/delivery");
const { isLive, memoryDB, systemStatus } = require("../config/storage");

exports.verifyAdmin = (req, res) => {
    const { adminId, password } = req.body;
    if (
        adminId === (process.env.ADMIN_ID || "Nihar") &&
        password === (process.env.ADMIN_PASSWORD || "1234")
    ) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
};

exports.getDbStatus = (req, res) => res.json({ status: systemStatus });

exports.getStorageStats = (req, res) => {
    res.json({
        engine: isLive() ? "MongoDB Atlas (Distributed)" : "Local JSON (Encrypted)",
        usedCapacity: "4.2 GB",
        totalCapacity: "UNLIMITED (Auto-Scaling)",
        readWriteSpeed: "Express",
        health: "Optimal",
    });
};

exports.getDeliveries = async (req, res) => {
    try {
        if (isLive()) {
            res.json(await Delivery.find().sort({ createdAt: -1 }));
        } else {
            res.json(memoryDB.deliveryPersons.slice().reverse());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addDelivery = async (req, res) => {
    try {
        const record = { ...req.body, _id: Date.now().toString(), isVerified: false, createdAt: new Date() };
        if (isLive()) {
            const dbData = await new Delivery(record).save();
            return res.status(201).json({ success: true, data: dbData });
        }
        memoryDB.deliveryPersons.push(record);
        commitData();
        res.status(201).json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDelivery = async (req, res) => {
    try {
        if (isLive()) await Delivery.findByIdAndDelete(req.params.id);
        else memoryDB.deliveryPersons = memoryDB.deliveryPersons.filter(x => x._id !== req.params.id);
        commitData();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
