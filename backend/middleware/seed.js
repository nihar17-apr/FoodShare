const Restaurant = require("../models/restaurant");
const Activity = require("../models/activity");
const { memoryDB, commitData, isLive } = require("../config/storage");

const seedData = async () => {
    try {
        const rCount = isLive() ? await Restaurant.countDocuments() : memoryDB.restaurants.length;
        if (rCount === 0) {
            console.log("🚀 Initializing Large Storage Ecosystem...");
            const sampleRestaurants = [
                { name: "Grand Imperial Hotel", email: "info@grandimperial.com", location: "Mumbai Central", food: "Lunch Buffet", quantity: 50, membership: "Gold", isVerified: true },
                { name: "Oceanic Resort", email: "contact@oceanic.io", location: "Goa Beach Road", food: "Seafood Platter", quantity: 30, membership: "Silver", isVerified: true },
                { name: "The Green Bistro", email: "hello@greenbistro.com", location: "Bangalore Tech Park", food: "Organic Salads", quantity: 20, membership: "Gold", isVerified: true },
                { name: "Urban Tandoor", email: "order@urbantandoor.in", location: "Delhi Metro Heights", food: "North Indian Meals", quantity: 45, membership: "Basic", isVerified: true }
            ];

            for (const r of sampleRestaurants) {
                const expiry = new Date();
                expiry.setHours(expiry.getHours() + 24);
                const record = {
                    ...r,
                    _id: Date.now().toString() + Math.random(),
                    items: [{
                        food: r.food,
                        quantity: r.quantity,
                        category: "Meals",
                        foodValue: r.quantity * 10,
                        expiryTime: expiry
                    }],
                    createdAt: new Date()
                };
                if (isLive()) await new Restaurant(record).save();
                else memoryDB.restaurants.push(record);
            }

            const sampleActivities = [
                { actorType: "System", actorName: "Storage Engine", action: "Ecosystem Wake-up", details: "Memory optimized for Big Data.", timestamp: new Date() },
                { actorType: "Admin", actorName: "Nihar", action: "Storage Audit", details: "Cluster capacity verified as Unlimited.", timestamp: new Date() }
            ];

            for (const a of sampleActivities) {
                if (isLive()) await new Activity(a).save();
                else memoryDB.activityLogs.push({ ...a, _id: Date.now().toString() + Math.random() });
            }
            commitData();
        }
    } catch (e) {
        console.log("Seeding failed:", e.message);
    }
};

module.exports = seedData;
