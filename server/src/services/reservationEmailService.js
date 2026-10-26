const { randomUUID } = require('node:crypto');
const { createAuthEmailDelivery } = require('./authEmailDelivery');
const User = require('../models/User');
const Platform = require('../models/Platform');
const Reservation = require('../models/Reservation');

const DELIVERY_LEASE_MS = 2 * 60 * 1000;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_MAX_MS = 6 * 60 * 60 * 1000;

function formatPesos(amount) {
  const num = Number(amount || 0);
  return Number.isFinite(num)
    ? num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
}

function formatDate(date) {
  if (!date) return 'Scheduled Date';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function safeHeader(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function buildEmailContent({
  orderRef = 'CONFIRMED',
  customerName,
  designName,
  bakeryName = 'AH TINAPS BAKESHOP',
  deliveryDate,
  totalPrice,
  downPayment,
  remainingBalance,
  paymentReference,
  isDownPaymentPaid = true,
  status = 'Confirmed',
}) {
  const displayBakeryName = (!bakeryName || bakeryName === 'Mamshie Bakery')
    ? 'AH TINAPS BAKESHOP'
    : bakeryName;
  const subject = `Reservation Confirmation: ${safeHeader(designName)} - CakeNMake`;
  const downPaymentNote = isDownPaymentPaid ? '(Paid)' : '(Pending verification)';
  const balanceNote = '(Due 48h before baking)';
  const statusDisplay = isDownPaymentPaid ? 'Confirmed' : (status || 'Pending Down Payment');

  const text = `Hello ${customerName},

Thank you for sending your cake design to ${displayBakeryName}! We have received your reservation request and recorded your order specifications.

Reservation Details:
• Order Reference: #${orderRef}
• Design: "${designName}"
• Bakery: ${displayBakeryName}
• Delivery/Pickup Date: ${deliveryDate}
• Total Estimated Price: ₱${totalPrice}
• ${isDownPaymentPaid ? 'Down Payment (50%):' : 'Required Down Payment:'} ₱${downPayment} ${downPaymentNote}
${paymentReference ? `• Payment Reference: ${paymentReference}\n` : ''}• Remaining Balance: ₱${remainingBalance} ${balanceNote}
• Status: ${statusDisplay}

----------------------------------------------------
🧾 ORDER PICKUP SLIP (Optional for collection)
Order Reference: #${orderRef}
Cake: "${designName}"
Bakery Store: ${displayBakeryName}
Scheduled Date: ${deliveryDate}
Down Payment: ₱${downPayment} ${downPaymentNote}
Remaining Balance on Pickup: ₱${remainingBalance}
(Showing this slip is optional. You can simply show this email, mention your order reference, or state your name at the counter.)
----------------------------------------------------

Important Note:
Please note that while your reservation is confirmed, cake production will only begin once the whole payment for the cake is done.

${isDownPaymentPaid
    ? 'Your reservation has been confirmed with your 50% down payment. You can chat directly with the bakery staff in your CakeNMake dashboard to discuss custom cake details, settle the remaining balance prior to baking, and coordinate fulfillment.'
    : 'Your reservation has been created in CakeNMake. You can chat directly with the bakery staff in your dashboard to arrange payment, discuss details, and coordinate delivery.'}

Thank you,
The CakeNMake Team`;

  const values = Object.fromEntries(Object.entries({
    subject, orderRef, customerName, designName, bakeryName: displayBakeryName, deliveryDate, totalPrice, downPayment, remainingBalance, paymentReference: paymentReference || '', statusDisplay, downPaymentNote, balanceNote,
  }).map(([key, value]) => [key, escapeHtml(value)]));

  const statusColor = isDownPaymentPaid ? '#16a34a' : '#ea580c';
  const downPaymentColor = isDownPaymentPaid ? '#16a34a' : '#e11d48';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${values.subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdf8f9; color: #1f2937; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fee2e2;">
    <tr><td style="background: linear-gradient(135deg, #ec4899, #f43f5e, #fb923c); padding: 28px 32px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎂 CakeNMake</h1><p style="color: #ffffff; margin: 6px 0 0; font-size: 14px;">Reservation Confirmation</p></td></tr>
    <tr><td style="padding: 32px;">
      <p style="font-size: 16px; margin: 0 0 16px; color: #374151;">Hello <strong>${values.customerName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #4b5563;">Thank you for sending your cake design to <strong>${values.bakeryName}</strong>! We have received your reservation request and recorded your order specifications.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; margin-bottom: 24px;"><tr><td style="padding: 20px;">
        <h2 style="font-size: 15px; margin: 0 0 14px; color: #9f1239;">Reservation Summary</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #6b7280; width: 45%;">Order Reference:</td><td style="color: #111827; font-weight: 600; font-family: monospace;">#${values.orderRef}</td></tr>
          <tr><td style="color: #6b7280;">Cake Design:</td><td style="color: #111827; font-weight: 600;">${values.designName}</td></tr>
          <tr><td style="color: #6b7280;">Bakery:</td><td style="color: #111827; font-weight: 600;">${values.bakeryName}</td></tr>
          <tr><td style="color: #6b7280;">Delivery / Pickup:</td><td style="color: #111827; font-weight: 600;">${values.deliveryDate}</td></tr>
          <tr><td style="color: #6b7280;">Total Estimated Price:</td><td style="color: #111827; font-weight: 600;">₱${values.totalPrice}</td></tr>
          <tr><td style="color: #6b7280;">${isDownPaymentPaid ? 'Down Payment (50%):' : 'Required Down Payment:'}</td><td style="color: ${downPaymentColor}; font-weight: 700;">₱${values.downPayment} <span style="font-size: 11px; font-weight: normal; color: ${isDownPaymentPaid ? '#16a34a' : '#6b7280'};">${values.downPaymentNote}</span></td></tr>
          ${values.paymentReference ? `<tr><td style="color: #6b7280;">Payment Reference:</td><td style="color: #4b5563; font-family: monospace; font-size: 12px;">${values.paymentReference}</td></tr>` : ''}
          <tr><td style="color: #6b7280;">Remaining Balance:</td><td style="color: #111827; font-weight: 600;">₱${values.remainingBalance} <span style="font-size: 11px; font-weight: normal; color: #6b7280;">${values.balanceNote}</span></td></tr>
          <tr><td style="color: #6b7280;">Status:</td><td style="color: ${statusColor}; font-weight: 600;">${values.statusDisplay}</td></tr>
        </table>
      </td></tr></table>

      <!-- Optional Digital Pickup Slip -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 2px dashed #f43f5e; border-radius: 12px; margin-bottom: 24px;">
        <tr><td style="padding: 18px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 14px; font-weight: 700; color: #e11d48;">🧾 Order Pickup Slip</td>
              <td style="text-align: right; font-size: 11px; color: #6b7280; font-family: monospace;">Ref: #${values.orderRef}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #6b7280; margin: 8px 0 12px; line-height: 1.5;">
            Showing this slip is <strong>completely optional</strong> when claiming your cake. You can simply show this email, mention your order reference, or state your name at the counter.
          </p>
          <div style="background-color: #fdf2f8; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.6;">
            <div><strong>Cake:</strong> ${values.designName}</div>
            <div><strong>Bakery:</strong> ${values.bakeryName}</div>
            <div><strong>Pickup Date:</strong> ${values.deliveryDate}</div>
            <div><strong>Down Payment Paid:</strong> ₱${values.downPayment}</div>
            <div style="color: #9f1239; font-weight: 700;"><strong>Balance on Pickup:</strong> ₱${values.remainingBalance}</div>
          </div>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 24px;">
        <tr><td style="padding: 14px 16px;">
          <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #92400e;">
            ⚠️ Important Production Policy
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #78350f;">
            While your reservation is confirmed, please note that <strong>cake production will only begin once the whole payment for your cake is done</strong>.
          </p>
        </td></tr>
      </table>
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
        <h3 style="font-size: 13px; color: #374151; margin: 0 0 8px;">Next Steps</h3>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">
          ${isDownPaymentPaid
    ? 'The bakery staff will review your 3D cake design specifications. Remember that cake production will begin once full payment is completed. You can message the bakery directly through your <strong>CakeNMake Chats</strong> to coordinate remaining balance details and finalize fulfillment arrangements.'
    : 'The bakery staff will review your 3D cake design specifications. You can message the bakery directly through your <strong>CakeNMake Chats</strong> to coordinate down payment options and finalize delivery arrangements.'}
        </p>
      </div>
      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5; margin: 0;">If you have any questions, please reach out directly through the CakeNMake chat.</p>
    </td></tr>
    <tr><td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;"><p style="margin: 0;">CakeNMake &bull; Your 3D Custom Cake Design Platform</p></td></tr>
  </table>
</body>
</html>`.trim();
  return { subject, text, html };
}

function buildBalancePaidEmailContent({
  orderRef = 'CONFIRMED',
  customerName,
  designName,
  bakeryName = 'AH TINAPS BAKESHOP',
  deliveryDate,
  totalPrice,
  amountPaid,
  paymentReference,
  status = 'In Production',
}) {
  const displayBakeryName = (!bakeryName || bakeryName === 'Mamshie Bakery')
    ? 'AH TINAPS BAKESHOP'
    : bakeryName;
  const subject = `Balance Payment Received: ${safeHeader(designName)} (In Production) - CakeNMake`;

  const text = `Hello ${customerName},

Great news! We have received your remaining balance payment of ₱${amountPaid} for your cake design "${designName}".

Payment & Order Details:
• Order Reference: #${orderRef}
• Design: "${designName}"
• Bakery: ${displayBakeryName}
• Delivery/Pickup Date: ${deliveryDate}
• Payment Reference: ${paymentReference || 'N/A'}
• Balance Paid: ₱${amountPaid}
• Total Price: ₱${totalPrice} (Fully Paid)
• Order Status: ${status}

Production Update:
Your cake is now officially IN PRODUCTION! Our bakers at ${displayBakeryName} have commenced preparation for your order. We will keep you posted as your cake is baked, decorated, and prepared for pickup.

----------------------------------------------------
🧾 ORDER PICKUP SLIP (Optional for collection)
Order Reference: #${orderRef}
Cake: "${designName}"
Bakery Store: ${displayBakeryName}
Scheduled Date: ${deliveryDate}
Total Paid: ₱${totalPrice} (Fully Paid)
Status: ${status}
(Showing this slip is optional. You can simply show this email, mention your order reference, or state your name at the counter.)
----------------------------------------------------

Thank you for choosing CakeNMake!

Warm regards,
The CakeNMake Team & ${displayBakeryName}`;

  const values = Object.fromEntries(Object.entries({
    subject, orderRef, customerName, designName, bakeryName: displayBakeryName, deliveryDate, totalPrice, amountPaid, paymentReference: paymentReference || 'N/A', status,
  }).map(([key, value]) => [key, escapeHtml(value)]));

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${values.subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdf8f9; color: #1f2937; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fee2e2;">
    <tr><td style="background: linear-gradient(135deg, #10b981, #059669, #0d9488); padding: 28px 32px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎂 CakeNMake</h1><p style="color: #ffffff; margin: 6px 0 0; font-size: 14px;">Balance Paid &bull; Order In Production!</p></td></tr>
    <tr><td style="padding: 32px;">
      <p style="font-size: 16px; margin: 0 0 16px; color: #374151;">Hello <strong>${values.customerName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #4b5563;">Great news! We have received your remaining balance payment of <strong style="color: #059669;">₱${values.amountPaid}</strong> for <strong>"${values.designName}"</strong>. Your order is now fully settled and officially in production!</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; margin-bottom: 24px;"><tr><td style="padding: 20px;">
        <h2 style="font-size: 15px; margin: 0 0 14px; color: #065f46;">Payment Receipt & Status</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #6b7280; width: 45%;">Order Reference:</td><td style="color: #111827; font-weight: 600; font-family: monospace;">#${values.orderRef}</td></tr>
          <tr><td style="color: #6b7280;">Cake Design:</td><td style="color: #111827; font-weight: 600;">${values.designName}</td></tr>
          <tr><td style="color: #6b7280;">Bakery:</td><td style="color: #111827; font-weight: 600;">${values.bakeryName}</td></tr>
          <tr><td style="color: #6b7280;">Pickup / Delivery:</td><td style="color: #111827; font-weight: 600;">${values.deliveryDate}</td></tr>
          <tr><td style="color: #6b7280;">Balance Paid Now:</td><td style="color: #059669; font-weight: 700;">₱${values.amountPaid}</td></tr>
          <tr><td style="color: #6b7280;">Payment Reference:</td><td style="color: #4b5563; font-family: monospace; font-size: 12px;">${values.paymentReference}</td></tr>
          <tr><td style="color: #6b7280;">Total Price:</td><td style="color: #111827; font-weight: 600;">₱${values.totalPrice} <span style="color: #059669; font-size: 12px; font-weight: bold;">(100% Paid)</span></td></tr>
          <tr><td style="color: #6b7280;">Current Status:</td><td style="color: #059669; font-weight: 700;">${values.status}</td></tr>
        </table>
      </td></tr></table>

      <!-- Optional Digital Pickup Slip -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 2px dashed #059669; border-radius: 12px; margin-bottom: 24px;">
        <tr><td style="padding: 18px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 14px; font-weight: 700; color: #059669;">🧾 Order Pickup Slip</td>
              <td style="text-align: right; font-size: 11px; color: #6b7280; font-family: monospace;">Ref: #${values.orderRef}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #6b7280; margin: 8px 0 12px; line-height: 1.5;">
            Showing this slip is <strong>completely optional</strong> when claiming your cake. You can simply show this email, mention your order reference, or state your name at the counter.
          </p>
          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.6;">
            <div><strong>Cake:</strong> ${values.designName}</div>
            <div><strong>Bakery:</strong> ${values.bakeryName}</div>
            <div><strong>Pickup Date:</strong> ${values.deliveryDate}</div>
            <div><strong>Total Paid:</strong> ₱${values.totalPrice} (Fully Paid)</div>
            <div style="color: #065f46; font-weight: 700;"><strong>Status:</strong> In Production</div>
          </div>
        </td></tr>
      </table>

      <div style="background-color: #f9fafb; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
        <h3 style="font-size: 13px; color: #374151; margin: 0 0 8px;">What's next?</h3>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">
          Our baking team is now preparing and decorating your cake according to your 3D specifications. You can message the bakery staff directly anytime through your <strong>CakeNMake Chats</strong>.
        </p>
      </div>
      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5; margin: 0;">If you have any questions, feel free to chat with us directly via the app.</p>
    </td></tr>
    <tr><td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;"><p style="margin: 0;">CakeNMake &bull; Your 3D Custom Cake Design Platform</p></td></tr>
  </table>
</body>
</html>`.trim();
  return { subject, text, html };
}

function retryDelay(attempts) {
  return Math.min(RETRY_BASE_MS * (2 ** Math.max(0, attempts - 1)), RETRY_MAX_MS);
}

function createReservationEmailService({
  mailDelivery = createAuthEmailDelivery(),
  userModel = User,
  platformModel = Platform,
  reservationModel = Reservation,
  clock = () => new Date(),
  createToken = randomUUID,
} = {}) {
  async function sendReservationConfirmationEmail(reservation) {
    if (!reservation) return { sent: false, reason: 'NO_RESERVATION' };
    let user = reservation.user;
    try {
      if (!user || typeof user !== 'object' || !user.email) user = user ? await userModel.findById(user._id || user).lean() : null;
    } catch {
      return { sent: false, error: 'Customer account lookup failed.' };
    }
    if (!user?.email) return { sent: false, reason: 'NO_EMAIL', error: 'Customer account has no email address.' };

    let platform = reservation.platform;
    try {
      if (!platform || typeof platform !== 'object' || !platform.name) platform = platform ? await platformModel.findById(platform._id || platform).lean() : null;
    } catch {
      return { sent: false, error: 'Bakery lookup failed.' };
    }
    const resolvedBakeryName = (platform?.name && platform.name !== 'Mamshie Bakery')
      ? platform.name
      : 'AH TINAPS BAKESHOP';

    const totalNum = Number(reservation.totalPrice || 0);
    const downNum = Number(reservation.downPayment?.amount || Math.ceil(totalNum / 2));
    const isPaid = reservation.downPayment?.isPaid !== false;
    const resId = reservation._id ? String(reservation._id) : '';
    const orderRef = resId ? resId.slice(-8).toUpperCase() : 'CONFIRMED';
    const rawDownRef = reservation.downPayment?.paymentReference;
    const paymentReference = (rawDownRef && rawDownRef !== 'simulated_checkout')
      ? rawDownRef
      : (isPaid && resId ? `DEMO-DP-${downNum}-${resId.slice(-6).toUpperCase()}` : null);
    const message = buildEmailContent({
      orderRef,
      customerName: user.displayName || user.email.split('@')[0] || 'Valued Customer',
      designName: reservation.designName || 'Custom Cake',
      bakeryName: resolvedBakeryName,
      deliveryDate: formatDate(reservation.pickupDate),
      totalPrice: formatPesos(totalNum),
      downPayment: formatPesos(downNum),
      remainingBalance: formatPesos(Math.max(0, totalNum - downNum)),
      paymentReference,
      isDownPaymentPaid: isPaid,
      status: isPaid ? 'Confirmed' : (reservation.status === 'confirmed' ? 'Confirmed' : 'Pending Down Payment'),
    });
    if (!mailDelivery.configured) return { sent: false, reason: 'NOT_CONFIGURED', error: 'Email delivery is not configured.' };
    try {
      return { sent: true, result: await mailDelivery.send({ to: user.email, ...message }) };
    } catch (error) {
      return { sent: false, error: error.message || 'Email provider rejected delivery.' };
    }
  }

  async function sendBalancePaymentEmail(reservation) {
    if (!reservation) return { sent: false, reason: 'NO_RESERVATION' };
    let user = reservation.user;
    try {
      if (!user || typeof user !== 'object' || !user.email) user = user ? await userModel.findById(user._id || user).lean() : null;
    } catch {
      return { sent: false, error: 'Customer account lookup failed.' };
    }
    if (!user?.email) return { sent: false, reason: 'NO_EMAIL', error: 'Customer account has no email address.' };

    let platform = reservation.platform;
    try {
      if (!platform || typeof platform !== 'object' || !platform.name) platform = platform ? await platformModel.findById(platform._id || platform).lean() : null;
    } catch {
      return { sent: false, error: 'Bakery lookup failed.' };
    }
    const resolvedBakeryName = (platform?.name && platform.name !== 'Mamshie Bakery')
      ? platform.name
      : 'AH TINAPS BAKESHOP';

    const totalNum = Number(reservation.totalPrice || 0);
    const balancePaidNum = Number(reservation.finalPayment?.amount || (totalNum - Number(reservation.downPayment?.amount || 0)));
    const resId = reservation._id ? String(reservation._id) : '';
    const orderRef = resId ? resId.slice(-8).toUpperCase() : 'CONFIRMED';
    const message = buildBalancePaidEmailContent({
      orderRef,
      customerName: user.displayName || user.email.split('@')[0] || 'Valued Customer',
      designName: reservation.designName || 'Custom Cake',
      bakeryName: resolvedBakeryName,
      deliveryDate: formatDate(reservation.pickupDate),
      totalPrice: formatPesos(totalNum),
      amountPaid: formatPesos(balancePaidNum),
      paymentReference: reservation.finalPayment?.paymentReference || 'N/A',
      status: 'In Production',
    });
    if (!mailDelivery.configured) return { sent: false, reason: 'NOT_CONFIGURED', error: 'Email delivery is not configured.' };
    try {
      return { sent: true, result: await mailDelivery.send({ to: user.email, ...message }) };
    } catch (error) {
      return { sent: false, error: error.message || 'Email provider rejected delivery.' };
    }
  }

  async function processReservationConfirmationEmail(reservation) {
    if (!reservation?._id) return { sent: false, reason: 'NO_RESERVATION_ID' };
    const now = clock();
    const token = createToken();
    const lockExpiresAt = new Date(now.getTime() + DELIVERY_LEASE_MS);
    let claimed;
    try {
      claimed = await reservationModel.findOneAndUpdate({
        _id: reservation._id,
        $or: [
          { 'confirmationEmail.status': 'pending', 'confirmationEmail.nextAttemptAt': { $lte: now } },
          { 'confirmationEmail.status': 'failed', 'confirmationEmail.nextAttemptAt': { $lte: now } },
          { 'confirmationEmail.status': 'sending', 'confirmationEmail.lockExpiresAt': { $lte: now } },
        ],
      }, {
        $set: {
          'confirmationEmail.status': 'sending',
          'confirmationEmail.lockToken': token,
          'confirmationEmail.lockExpiresAt': lockExpiresAt,
          'confirmationEmail.lastError': null,
        },
        $inc: { 'confirmationEmail.attempts': 1 },
      }, { new: true });
    } catch (error) {
      console.error('[ReservationEmail] Could not claim confirmation delivery:', error.message);
      return { sent: false, error: 'Could not claim confirmation delivery.' };
    }
    if (!claimed) return { sent: false, reason: 'NOT_DUE_OR_ALREADY_SENT' };

    const delivery = await sendReservationConfirmationEmail(claimed);
    const filter = { _id: claimed._id, 'confirmationEmail.status': 'sending', 'confirmationEmail.lockToken': token };
    if (delivery.sent) {
      await reservationModel.updateOne(filter, { $set: {
        'confirmationEmail.status': 'sent', 'confirmationEmail.sentAt': clock(),
        'confirmationEmail.lockToken': null, 'confirmationEmail.lockExpiresAt': null, 'confirmationEmail.lastError': null,
      } }).catch((error) => console.error('[ReservationEmail] Could not record delivered confirmation:', error.message));
      return delivery;
    }

    const attempts = Number(claimed.confirmationEmail?.attempts || 1);
    const errorMessage = String(delivery.error || delivery.reason || 'Email delivery failed.').slice(0, 500);
    await reservationModel.updateOne(filter, { $set: {
      'confirmationEmail.status': 'failed',
      'confirmationEmail.nextAttemptAt': new Date(clock().getTime() + retryDelay(attempts)),
      'confirmationEmail.lockToken': null, 'confirmationEmail.lockExpiresAt': null, 'confirmationEmail.lastError': errorMessage,
    } }).catch((error) => console.error('[ReservationEmail] Could not record deferred confirmation:', error.message));
    console.error(`[ReservationEmail] Confirmation delivery deferred for reservation ${claimed._id}: ${errorMessage}`);
    return delivery;
  }

  async function processPendingReservationConfirmations({ limit = 25 } = {}) {
    const now = clock();
    const pending = await reservationModel.find({ $or: [
      { 'confirmationEmail.status': 'pending', 'confirmationEmail.nextAttemptAt': { $lte: now } },
      { 'confirmationEmail.status': 'failed', 'confirmationEmail.nextAttemptAt': { $lte: now } },
      { 'confirmationEmail.status': 'sending', 'confirmationEmail.lockExpiresAt': { $lte: now } },
    ] }).select('_id').sort({ 'confirmationEmail.nextAttemptAt': 1 }).limit(limit).lean();
    return Promise.allSettled(pending.map((entry) => processReservationConfirmationEmail(entry)));
  }

  return {
    sendReservationConfirmationEmail,
    sendBalancePaymentEmail,
    processReservationConfirmationEmail,
    processPendingReservationConfirmations,
  };
}

const defaultReservationEmailService = createReservationEmailService();

module.exports = {
  createReservationEmailService,
  sendReservationConfirmationEmail: (reservation) => defaultReservationEmailService.sendReservationConfirmationEmail(reservation),
  sendBalancePaymentEmail: (reservation) => defaultReservationEmailService.sendBalancePaymentEmail(reservation),
  processReservationConfirmationEmail: (reservation) => defaultReservationEmailService.processReservationConfirmationEmail(reservation),
  processPendingReservationConfirmations: (options) => defaultReservationEmailService.processPendingReservationConfirmations(options),
  buildEmailContent,
  buildBalancePaidEmailContent,
  formatPesos,
  formatDate,
  escapeHtml,
};
