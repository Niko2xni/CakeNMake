/**
 * Maintenance and update scheduling utilities.
 *
 * Daily scheduled update commits at 10:00 PM Manila time (UTC+8).
 * Payment cutoff starts 30 minutes before 10:00 PM (at 9:30 PM Manila time)
 * and lasts until the update window completes (10:05 PM Manila time).
 */

/**
 * Checks if the given date is within 30 minutes prior to 10:00 PM Manila time
 * or during the 10:00 PM update completion window.
 * Manila time is UTC+8.
 * Window: 21:30 to 22:05 Manila time.
 *
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isWithinThirtyMinutePaymentCutoff(now = new Date()) {
  const manilaMs = now.getTime() + 8 * 60 * 60 * 1000;
  const manilaDate = new Date(manilaMs);
  const hours = manilaDate.getUTCHours();
  const minutes = manilaDate.getUTCMinutes();
  return (hours === 21 && minutes >= 30) || (hours === 22 && minutes < 5);
}
