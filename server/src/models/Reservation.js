const mongoose = require('mongoose');

const pricingSnapshotSchema = new mongoose.Schema({
  pricingVersion: { type: Number, required: true },
  currency: { type: String, default: 'PHP' },
  lineItems: [{
    componentKey: { type: String, required: true },
    label: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPriceMinor: { type: Number, required: true },
    lineTotalMinor: { type: Number, required: true },
  }],
  totalMinor: { type: Number, required: true },
  calculatedAt: { type: Date, required: true },
}, { _id: false });

// Delivery is persisted with the reservation so a process restart or a mail
// provider outage does not turn a successfully-created reservation into a
// permanently lost confirmation.
const confirmationEmailSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending', required: true },
  attempts: { type: Number, default: 0, min: 0, required: true },
  nextAttemptAt: { type: Date, default: Date.now, required: true },
  lockToken: { type: String, default: null },
  lockExpiresAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  lastError: { type: String, default: null, maxlength: 500 },
}, { _id: false });

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design', required() { return !this.blueprint; } },
    blueprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Blueprint', immutable: true },
    designName: { type: String, maxlength: 200 },
    checkoutMode: { type: String, enum: ['simulated'] },
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },

    pickupDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },

    // Immutable estimate captured when the reservation is created. Historical
    // orders must never change when a newer price book becomes active.
    pricingSnapshot: { type: pricingSnapshotSchema, default: null },

    downPayment: {
      amount: { type: Number, required: true },
      isPaid: { type: Boolean, default: false },
      paymentReference: { type: String, default: null }, // PayMongo reference
      paidAt: { type: Date, default: null },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      method: { type: String, enum: ['gcash', 'cash', 'bank_transfer', 'other'], default: null },
    },

    // Set once the BullMQ/Puppeteer/jsPDF background pipeline finishes.
    // Bakery Admin never triggers this — it's populated automatically.
    blueprintUrl: { type: String, default: null },

    confirmationEmail: { type: confirmationEmailSchema, default: () => ({}) },

    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'in_production', 'completed'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);
reservationSchema.index({ blueprint: 1 }, { unique: true, sparse: true });
reservationSchema.index({ platform: 1, createdAt: -1 });
reservationSchema.index({ platform: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
