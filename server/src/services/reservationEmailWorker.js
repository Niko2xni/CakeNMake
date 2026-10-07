const { processPendingReservationConfirmations } = require('./reservationEmailService');

const DEFAULT_INTERVAL_MS = 60 * 1000;

function configuredInterval(value) {
  const interval = Number(value);
  return Number.isSafeInteger(interval) && interval >= 10 * 1000 ? interval : DEFAULT_INTERVAL_MS;
}

function startReservationEmailWorker({
  processPending = processPendingReservationConfirmations,
  intervalMs = configuredInterval(process.env.RESERVATION_EMAIL_RETRY_INTERVAL_MS),
} = {}) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processPending();
    } catch (error) {
      console.error('[ReservationEmail] Retry worker failed:', error.message);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => { void run(); }, intervalMs);
  timer.unref?.();
  return { run, stop: () => clearInterval(timer) };
}

module.exports = { startReservationEmailWorker, configuredInterval };
