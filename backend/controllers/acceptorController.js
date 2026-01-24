const Acceptor = require("../models/acceptor");
const Restaurant = require("../models/restaurant");
const Activity = require("../models/activity");
const { memoryDB, commitData, isLive } = require("../config/storage");

exports.getAllVerified = async (req, res) => {
    try {
        if (isLive()) return res.json(await Acceptor.find({ isVerified: true }));
        res.json(memoryDB.acceptors.filter((a) => a.isVerified));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addAcceptor = async (req, res) => {
    try {
        const { name, email, phone, location, food, quantity, membership } = req.body;
        const record = {
            _id: Date.now().toString(),
            name,
            email,
            phone,
            location,
            food,
            quantity: Number(quantity),
            isVerified: false,
            membership: membership || "Basic",
            createdAt: new Date(),
        };

        if (isLive()) {
            const dbData = await new Acceptor(record).save();
            await new Activity({
                actorType: "Acceptor",
                actorName: name,
                actorEmail: email,
                action: "Requested Food",
                details: `${quantity} portions of ${food}`,
                timestamp: new Date(),
            }).save();
            return res.status(201).json({ success: true, data: dbData });
        }

        memoryDB.acceptors.push(record);
        memoryDB.activityLogs.push({
            _id: Date.now().toString(),
            actorType: "Acceptor",
            actorName: name,
            actorEmail: email,
            action: "Requested Food",
            details: `${quantity} portions of ${food}`,
            timestamp: new Date(),
        });
        commitData();
        res.status(201).json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifyAcceptor = async (req, res) => {
    try {
        let acceptorRecord;
        if (isLive()) {
            acceptorRecord = await Acceptor.findById(req.params.id);
            if (!acceptorRecord) return res.status(404).json({ error: "Acceptor not found" });
        } else {
            acceptorRecord = memoryDB.acceptors.find((x) => x._id === req.params.id);
            if (!acceptorRecord) return res.status(404).json({ error: "Acceptor not found" });
        }

        const requestedFood = acceptorRecord.food.toLowerCase();
        const requestedQty = acceptorRecord.quantity;
        let matched = false;
        let matchDetails = "No matching fresh verified food found.";
        let pricingInfo = null;

        if (isLive()) {
            const restaurants = await Restaurant.find({ isVerified: true });
            for (let rest of restaurants) {
                let item = rest.items.find(
                    (i) =>
                        i.food.toLowerCase() === requestedFood &&
                        i.quantity >= requestedQty &&
                        new Date(i.expiryTime) > new Date()
                );
                if (item) {
                    const unitValue = item.foodValue / (item.quantity || 1);
                    const totalActualValue = unitValue * requestedQty;
                    pricingInfo = {
                        actualValue: totalActualValue,
                        restaurantPayout: totalActualValue * 0.1,
                        acceptorCost: totalActualValue * 0.2,
                        platformProfit: totalActualValue * 0.1,
                    };

                    item.quantity -= requestedQty;
                    await rest.save();
                    matched = true;
                    matchDetails = `Matched with ${rest.name
                        }. Payout: ${pricingInfo.restaurantPayout.toFixed(
                            2
                        )}, Cost: ${pricingInfo.acceptorCost.toFixed(2)}`;
                    break;
                }
            }
            acceptorRecord.isVerified = true;
            await acceptorRecord.save();
            await new Activity({
                actorType: "System",
                actorName: "Pricing Engine",
                action: "Matched & Priced",
                details: `Acceptor ${acceptorRecord.name} matched. ${matchDetails}`,
                timestamp: new Date(),
            }).save();
        } else {
            const verifiedRests = memoryDB.restaurants.filter((r) => r.isVerified);
            for (let rest of verifiedRests) {
                let item = rest.items.find(
                    (i) =>
                        i.food.toLowerCase() === requestedFood &&
                        i.quantity >= requestedQty &&
                        new Date(i.expiryTime) > new Date()
                );
                if (item) {
                    const unitValue = item.foodValue / (item.quantity || 1);
                    const totalActualValue = unitValue * requestedQty;
                    pricingInfo = {
                        actualValue: totalActualValue,
                        restaurantPayout: totalActualValue * 0.1,
                        acceptorCost: totalActualValue * 0.2,
                        platformProfit: totalActualValue * 0.1,
                    };

                    item.quantity -= requestedQty;
                    matched = true;
                    matchDetails = `Matched with ${rest.name
                        }. Payout: ${pricingInfo.restaurantPayout.toFixed(
                            2
                        )}, Cost: ${pricingInfo.acceptorCost.toFixed(2)}`;
                    break;
                }
            }
            acceptorRecord.isVerified = true;
            memoryDB.activityLogs.push({
                actorType: "System",
                actorName: "Pricing Engine",
                action: "Matched & Priced",
                details: `Acceptor ${acceptorRecord.name} matched. ${matchDetails}`,
                timestamp: new Date(),
            });
            commitData();
        }
        res.json({
            success: true,
            data: acceptorRecord,
            matchInfo: matchDetails,
            pricing: pricingInfo,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteAcceptor = async (req, res) => {
    try {
        if (isLive()) await Acceptor.findByIdAndDelete(req.params.id);
        else memoryDB.acceptors = memoryDB.acceptors.filter((x) => x._id !== req.params.id);
        commitData();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAdminAcceptors = async (req, res) => {
    try {
        if (isLive()) {
            res.json(await Acceptor.find().sort({ createdAt: -1 }));
        } else {
            res.json(memoryDB.acceptors.slice().reverse());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
