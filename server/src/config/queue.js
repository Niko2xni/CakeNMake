const { Queue } = require("bullmq");
const Redis = require("ioredis");

const connection = new Redis(process.env.REDIS_URL);

const blueprintQueue = new Queue(
  "blueprint",
  { connection }
);

module.exports = blueprintQueue;
