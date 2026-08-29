const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design', required: true },
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },

    pickupDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },

    downPayment: {
      amount: { type: Number, required: true },
      isPaid: { type: Boolean, default: false },
      paymentReference: { type: String, default: null }, // PayMongo reference
      paidAt: { type: Date, default: null },
    },

    // Set once the BullMQ/Puppeteer/jsPDF background pipeline finishes.
    // Bakery Admin never triggers this — it's populated automatically.
    blueprintUrl: { type: String, default: null },

    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'in_production', 'completed'],
      default: 'pending_payment',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);