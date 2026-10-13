require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const app = require('./app');
const initializeSocketServer = require('./realtime/socketServer');
const { startReservationEmailWorker } = require('./services/reservationEmailWorker');

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initializeSocketServer(httpServer, app);

connectDB().then(async () => {
  try {
    const Platform = require('./models/Platform');
    await Platform.updateMany(
      { $or: [{ slug: 'mamshie-bakery' }, { name: 'Mamshie Bakery' }] },
      { $set: { name: 'AH TINAPS BAKESHOP' } }
    );
  } catch (err) {
    console.warn('[Startup] Platform migration notice:', err.message);
  }
  // The partial unique index enforces one open request even under concurrency.
  await require('./models/SupportRequest').init();
  startReservationEmailWorker();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exitCode = 1;
});
