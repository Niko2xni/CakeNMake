const express = require("express");
const cors = require("cors");
const designRoutes = require("./routes/designRoutes");
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require('./routes/accountRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const cakeAiRoutes = require('./routes/cakeAi.routes');
const { corsOptions } = require('./config/origins');

const app = express();

if (process.env.NODE_ENV === 'production') {
    // Render terminates HTTPS at its proxy. Trust the first proxy so OTP rate
    // limits use the originating client IP instead of one shared proxy IP.
    app.set('trust proxy', 1);
}

app.use(cors(corsOptions));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/blueprint-submissions', require('./routes/blueprintSubmissionRoutes'));
app.use('/api/cake-ai', express.json({ limit: '650kb' }));
app.use(express.json({ limit: '25mb' }));

app.get("/", (req, res) => {
    res.send("CakeNMake API Running");
});

// Design routes
app.use("/api/designs", designRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/moderation', require('./routes/moderationRoutes'));
app.use('/api/cake-ai', cakeAiRoutes);

const reservationRoutes = require('./routes/reservationRoutes');
app.use('/api/bakery/reservations', reservationRoutes);
app.use('/api/reservations', require('./routes/publicReservationRoutes'));

const pricingRoutes = require('./routes/pricingRoutes');
app.use('/api/bakery/pricing', pricingRoutes);
const publicPricingRoutes = require('./routes/publicPricingRoutes');
app.use('/api/pricing', publicPricingRoutes);

const transactionRoutes = require('./routes/transactionRoutes');
app.use('/api/bakery/transactions', transactionRoutes);
app.use('/api/bakery/blueprints', require('./routes/bakeryBlueprintRoutes'));
app.use('/api/bakery/billing', require('./routes/billingRoutes'));
app.use('/api/bakery/employees', require('./routes/employeeRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/bakery/templates', require('./routes/templateRoutes'));
app.use('/api/system', require('./routes/systemRoutes'));
app.use(require('./middleware/bodyErrors'));

module.exports = app;
