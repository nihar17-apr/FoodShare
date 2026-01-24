const Restaurant = require("../models/restaurant");
const Activity = require("../models/activity");
const { memoryDB, commitData, isLive, systemStatus } = require("../config/storage");

exports.getAllVerified = async (req, res) => {
    try {
        if (isLive()) return res.json(await Restaurant.find({ isVerified: true }));
        res.json(memoryDB.restaurants.filter((r) => r.isVerified));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addRestaurant = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            location,
            food,
            quantity,
            category,
            description,
            membership,
            foodValue,
            expiryHours,
        } = req.body;
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + Number(expiryHours || 6));

        const record = {
            _id: Date.now().toString(),
            name,
            email,
            phone,
            location,
            description,
            items: [
                {
                    food,
                    quantity: Number(quantity),
                    category,
                    foodValue: Number(foodValue || 100),
                    expiryTime: expiryDate,
                },
            ],
            isVerified: false,
            membership: membership || "Basic",
            createdAt: new Date(),
        };

        if (isLive()) {
            const dbData = await new Restaurant(record).save();
            await new Activity({
                actorType: "Restaurant",
                actorName: name,
                actorEmail: email,
                action: "Donated Food",
                details: `${quantity} portions of ${food} (Val: ${foodValue})`,
                timestamp: new Date(),
            }).save();
            return res.status(201).json({ success: true, data: dbData });
        }

        memoryDB.restaurants.push(record);
        memoryDB.activityLogs.push({
            _id: Date.now().toString(),
            actorType: "Restaurant",
            actorName: name,
            actorEmail: email,
            action: "Donated Food",
            details: `${quantity} portions of ${food} (Val: ${foodValue})`,
            timestamp: new Date(),
        });
        commitData();
        res.status(201).json({ success: true, data: record, status: systemStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifyRestaurant = async (req, res) => {
    try {
        if (isLive()) {
            const data = await Restaurant.findByIdAndUpdate(
                req.params.id,
                { isVerified: true },
                { new: true }
            );
            return res.json({ success: true, data });
        }
        const item = memoryDB.restaurants.find((x) => x._id === req.params.id);
        if (item) item.isVerified = true;
        commitData();
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteRestaurant = async (req, res) => {
    try {
        if (isLive()) await Restaurant.findByIdAndDelete(req.params.id);
        else memoryDB.restaurants = memoryDB.restaurants.filter((x) => x._id !== req.params.id);
        commitData();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAdminRestaurants = async (req, res) => {
    try {
        if (isLive()) {
            res.json(await Restaurant.find().sort({ createdAt: -1 }));
        } else {
            res.json(memoryDB.restaurants.slice().reverse());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
