require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const app = require('./app');
const initializeSocketServer = require('./realtime/socketServer');

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initializeSocketServer(httpServer, app);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
