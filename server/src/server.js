require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(5000, () => {
        console.log("Server running on port 5000");
    });
})
.catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
});

const reservationRoutes = require('./routes/reservationRoutes');
app.use('/api/bakery/reservations', reservationRoutes);

const pricingRoutes = require('./routes/pricingRoutes');
app.use('/api/bakery/pricing', pricingRoutes);

const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/bakery/transactions', transactionRoutes);