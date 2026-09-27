const mongoose = require("mongoose");
const configureDns = require('./dns');

// Force Node.js to use reliable public DNS servers (Google & Cloudflare)
// to prevent 'querySrv ECONNREFUSED' when resolving MongoDB Atlas SRV records.
configureDns();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
