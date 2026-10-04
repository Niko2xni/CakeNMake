require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const app = require('./app');
const initializeSocketServer = require('./realtime/socketServer');

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initializeSocketServer(httpServer, app);

connectDB().then(async () => {
  // The partial unique index enforces one open request even under concurrency.
  await require('./models/SupportRequest').init();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exitCode = 1;
});
