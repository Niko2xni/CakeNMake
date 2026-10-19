const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            index: true,
        },

        displayName: {
            type: String,
            trim: true,
            maxlength: 100,
            default: '',
        },

        photoURL: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: ['customer', 'bakery_staff', 'bakery_admin', 'platform_admin'],
            default: 'customer',
            required: true,
            index: true,
        },

        platform: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Platform',
            default: null,
            index: true,
        },

        status: {
            type: String,
            enum: ['active', 'suspended', 'disabled'],
            default: 'active',
            required: true,
            index: true,
        },

        restriction: {
            id: { type: mongoose.Schema.Types.ObjectId, default: null },
            type: { type: String, enum: ['none', 'suspended', 'banned'], default: 'none' },
            reason: { type: String, maxlength: 1000, default: '' },
            startedAt: { type: Date, default: null },
            expiresAt: { type: Date, default: null },
            staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        },
        registrationFee: {
            isPaid: { type: Boolean, default: null },
            amount: { type: Number, default: 25 },
            paidAt: { type: Date, default: null },
            paymentReference: { type: String, default: null },
            method: { type: String, enum: ['gcash', 'other'], default: 'gcash' },
            paymentMode: { type: String, enum: ['simulated', 'live'], default: 'simulated' },
            agreedToTerms: { type: Boolean, default: false },
            agreedToTermsAt: { type: Date, default: null },
        },
        moderationHistory: { type: [{
            action: String, reason: String, at: Date, expiresAt: Date,
            staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        }], default: [] },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        providers: {
            type: [String],
            default: [],
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
