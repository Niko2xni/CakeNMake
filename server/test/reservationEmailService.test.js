const assert = require('node:assert/strict');
const { test, afterEach, mock } = require('node:test');
const {
  createReservationEmailService,
  buildEmailContent,
  formatPesos,
  formatDate,
} = require('../src/services/reservationEmailService');
const { ensureCheckoutReservation } = require('../src/services/checkoutReservationService');
const Reservation = require('../src/models/Reservation');

afterEach(() => mock.restoreAll());

test('buildEmailContent formats subject, text, and html with all reservation details', () => {
  const content = buildEmailContent({
    customerName: 'Maria Santos',
    designName: 'Chocolate Velvet Dream',
    bakeryName: 'Mamshie Bakery',
    deliveryDate: 'Oct 20, 2026',
    totalPrice: '2,500.00',
    downPayment: '1,250.00',
    remainingBalance: '1,250.00',
  });

  assert.equal(content.subject, 'Reservation Confirmation: Chocolate Velvet Dream - CakeNMake');
  assert.ok(content.text.includes('Hello Maria Santos,'));
  assert.ok(content.text.includes('Chocolate Velvet Dream'));
  assert.ok(content.text.includes('Mamshie Bakery'));
  assert.ok(content.text.includes('Oct 20, 2026'));
  assert.ok(content.text.includes('₱2,500.00'));
  assert.ok(content.text.includes('₱1,250.00'));

  assert.ok(content.html.includes('Maria Santos'));
  assert.ok(content.html.includes('Chocolate Velvet Dream'));
  assert.ok(content.html.includes('Mamshie Bakery'));
  assert.ok(content.html.includes('Confirmed'));
  assert.ok(content.html.includes('(Paid)'));
});

test('buildEmailContent supports unpaid reservations with pending status', () => {
  const content = buildEmailContent({
    customerName: 'Maria Santos',
    designName: 'Chocolate Velvet Dream',
    bakeryName: 'Mamshie Bakery',
    deliveryDate: 'Oct 20, 2026',
    totalPrice: '2,500.00',
    downPayment: '1,250.00',
    remainingBalance: '1,250.00',
    isDownPaymentPaid: false,
    status: 'Pending Down Payment',
  });

  assert.ok(content.html.includes('Pending Down Payment'));
  assert.ok(content.html.includes('(Pending verification)'));
});

test('buildEmailContent escapes dynamic HTML and removes header line breaks', () => {
  const content = buildEmailContent({
    customerName: '<img src=x>', designName: 'Cake\r\nBcc: attacker@example.com', bakeryName: '<b>Bakery</b>',
    deliveryDate: 'Oct 20, 2026', totalPrice: '1.00', downPayment: '0.50', remainingBalance: '0.50',
  });
  assert.ok(content.html.includes('&lt;img src=x&gt;'));
  assert.ok(!content.html.includes('<img src=x>'));
  assert.ok(content.html.includes('&lt;b&gt;Bakery&lt;/b&gt;'));
  assert.equal(content.subject, 'Reservation Confirmation: Cake Bcc: attacker@example.com - CakeNMake');
});

test('sendReservationConfirmationEmail resolves user and platform and delivers email', async () => {
  let sentMessage = null;
  const mockMailDelivery = {
    configured: true,
    send: async (msg) => {
      sentMessage = msg;
      return { messageId: 'msg_123' };
    },
  };

  const mockUser = {
    _id: 'user_123',
    email: 'maria@example.com',
    displayName: 'Maria Santos',
  };

  const mockPlatform = {
    _id: 'plat_123',
    name: 'Sweet Delights Bakery',
  };

  const mockUserModel = {
    findById: () => ({
      lean: () => Promise.resolve(mockUser),
    }),
  };

  const mockPlatformModel = {
    findById: () => ({
      lean: () => Promise.resolve(mockPlatform),
    }),
  };

  const service = createReservationEmailService({
    mailDelivery: mockMailDelivery,
    userModel: mockUserModel,
    platformModel: mockPlatformModel,
  });

  const reservation = {
    user: 'user_123',
    platform: 'plat_123',
    designName: 'Floral Strawberry Cake',
    pickupDate: new Date('2026-11-15T00:00:00Z'),
    totalPrice: 1800,
    downPayment: { amount: 900 },
  };

  const result = await service.sendReservationConfirmationEmail(reservation);
  assert.equal(result.sent, true);
  assert.ok(sentMessage);
  assert.equal(sentMessage.to, 'maria@example.com');
  assert.ok(sentMessage.subject.includes('Floral Strawberry Cake'));
  assert.ok(sentMessage.text.includes('Sweet Delights Bakery'));
});

test('sendReservationConfirmationEmail handles already populated user and platform', async () => {
  let sentMessage = null;
  const mockMailDelivery = {
    configured: true,
    send: async (msg) => {
      sentMessage = msg;
      return { messageId: 'msg_456' };
    },
  };

  const service = createReservationEmailService({
    mailDelivery: mockMailDelivery,
  });

  const reservation = {
    user: { _id: 'u1', email: 'john@example.com', displayName: 'John Doe' },
    platform: { _id: 'p1', name: 'Mamshie Custom Cakes' },
    designName: 'Birthday Cake',
    pickupDate: '2026-12-01',
    totalPrice: 2000,
    downPayment: { amount: 1000 },
  };

  const result = await service.sendReservationConfirmationEmail(reservation);
  assert.equal(result.sent, true);
  assert.equal(sentMessage.to, 'john@example.com');
  assert.ok(sentMessage.text.includes('John Doe'));
  assert.ok(sentMessage.text.includes('Mamshie Custom Cakes'));
});

test('sendReservationConfirmationEmail skips gracefully when user has no email', async () => {
  const mockMailDelivery = {
    configured: true,
    send: async () => assert.fail('Must not send email without recipient address'),
  };

  const mockUserModel = {
    findById: () => ({
      lean: () => Promise.resolve({ _id: 'u2', displayName: 'No Email User' }),
    }),
  };

  const service = createReservationEmailService({
    mailDelivery: mockMailDelivery,
    userModel: mockUserModel,
  });

  const reservation = {
    user: 'u2',
    designName: 'Cake Without Email',
  };

  const result = await service.sendReservationConfirmationEmail(reservation);
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'NO_EMAIL');
});

test('sendReservationConfirmationEmail returns not configured when email delivery is unconfigured', async () => {
  const mockMailDelivery = {
    configured: false,
    send: async () => assert.fail('Must not call send when unconfigured'),
  };

  const service = createReservationEmailService({
    mailDelivery: mockMailDelivery,
  });

  const reservation = {
    user: { email: 'test@example.com' }, platform: { name: 'Sweet Delights Bakery' },
    designName: 'Cake',
  };

  const result = await service.sendReservationConfirmationEmail(reservation);
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'NOT_CONFIGURED');
});

test('sendReservationConfirmationEmail catches mail delivery errors safely', async () => {
  const mockMailDelivery = {
    configured: true,
    send: async () => {
      throw new Error('SMTP connection timed out');
    },
  };

  const service = createReservationEmailService({
    mailDelivery: mockMailDelivery,
  });

  const reservation = {
    user: { email: 'customer@example.com' }, platform: { name: 'Sweet Delights Bakery' },
    designName: 'Cake',
  };

  const result = await service.sendReservationConfirmationEmail(reservation);
  assert.equal(result.sent, false);
  assert.equal(result.error, 'SMTP connection timed out');
});

test('only one concurrent worker can claim and send a confirmation', async () => {
  let claimCount = 0;
  let sendCount = 0;
  const updates = [];
  const reservationModel = {
    findOneAndUpdate: async () => {
      claimCount += 1;
      if (claimCount > 1) return null;
      return {
        _id: 'reservation_1',
        user: { email: 'customer@example.com', displayName: 'Customer' },
        platform: { name: 'Sweet Delights Bakery' },
        designName: 'Cake', totalPrice: 1000, downPayment: { amount: 500 },
        confirmationEmail: { attempts: 1 },
      };
    },
    updateOne: async (filter, update) => { updates.push({ filter, update }); },
  };
  const service = createReservationEmailService({
    mailDelivery: { configured: true, send: async () => { sendCount += 1; return { messageId: 'accepted' }; } },
    reservationModel,
    createToken: () => 'lease-token',
  });

  const results = await Promise.all([
    service.processReservationConfirmationEmail({ _id: 'reservation_1' }),
    service.processReservationConfirmationEmail({ _id: 'reservation_1' }),
  ]);
  assert.equal(sendCount, 1);
  assert.equal(results.filter((result) => result.sent).length, 1);
  assert.equal(results.filter((result) => result.reason === 'NOT_DUE_OR_ALREADY_SENT').length, 1);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].update.$set['confirmationEmail.status'], 'sent');
});

test('failed delivery is recorded with a retry time', async () => {
  const now = new Date('2026-10-07T00:00:00.000Z');
  const updates = [];
  const service = createReservationEmailService({
    mailDelivery: { configured: true, send: async () => { throw new Error('Provider unavailable'); } },
    reservationModel: {
      findOneAndUpdate: async () => ({
        _id: 'reservation_2', user: { email: 'customer@example.com' }, platform: { name: 'Sweet Delights Bakery' },
        designName: 'Cake', confirmationEmail: { attempts: 2 },
      }),
      updateOne: async (filter, update) => { updates.push({ filter, update }); },
    },
    clock: () => now,
    createToken: () => 'lease-token',
  });
  const result = await service.processReservationConfirmationEmail({ _id: 'reservation_2' });
  assert.equal(result.sent, false);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].update.$set['confirmationEmail.status'], 'failed');
  assert.equal(updates[0].update.$set['confirmationEmail.lastError'], 'Provider unavailable');
  assert.equal(updates[0].update.$set['confirmationEmail.nextAttemptAt'].toISOString(), '2026-10-07T00:02:00.000Z');
});

test('ensureCheckoutReservation invokes confirmation processing for a retry so failed deliveries can recover', async () => {
  let emailSentCount = 0;
  const mockEmailSender = async () => {
    emailSentCount += 1;
  };

  const blueprint = {
    _id: 'bp_1',
    customer: 'user_1',
    platform: 'plat_1',
    status: 'ready',
    designName: 'Custom Ribbon Cake',
    deliveryDate: '2026-11-20',
    orderPricingSnapshot: {
      totalMinor: 250000,
      pricingVersion: 1,
      calculatedAt: new Date(),
      lineItems: [],
    },
  };

  // Initial call: no existing reservation, creates one and sends email
  mock.method(Reservation, 'findOne', async () => null);
  mock.method(Reservation, 'findOneAndUpdate', async () => ({
    _id: 'res_1',
    user: 'user_1',
    designName: 'Custom Ribbon Cake',
  }));

  const res1 = await ensureCheckoutReservation(blueprint, { emailSender: mockEmailSender });
  assert.ok(res1);
  assert.equal(emailSentCount, 1);

  // Retry calls the durable processor. Its atomic claim determines whether
  // there is a failed/pending confirmation that should be retried.
  mock.method(Reservation, 'findOne', async () => ({
    _id: 'res_1',
    status: 'pending_payment',
  }));

  const res2 = await ensureCheckoutReservation(blueprint, { emailSender: mockEmailSender });
  assert.ok(res2);
  assert.equal(emailSentCount, 2);
});
