const dns = require("dns");
const mongoose = require("mongoose");

// Force Node.js to use reliable public DNS servers (Google & Cloudflare)
// to prevent 'querySrv ECONNREFUSED' when resolving MongoDB Atlas SRV records.
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);
} catch (err) {
  console.warn("Could not set custom DNS servers:", err.message);
}

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
