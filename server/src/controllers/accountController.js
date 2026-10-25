const mongoose = require('mongoose');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Blueprint = require('../models/Blueprint');
const Platform = require('../models/Platform');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { synchronizeAccount } = require('../services/accountSyncService');
const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');
const { requestOtp, verifyOtp } = require('../services/emailOtpService');
const { publishMessage } = require('../services/moderationService');
const { sendBalancePaymentEmail } = require('../services/reservationEmailService');
const { isWithinThirtyMinutePaymentCutoff } = require('../services/maintenanceService');

async function syncAccount(req, res) {
    try {
        const user = await synchronizeAccount(req.auth);

        return res.json({ user });
    } catch (error) {
        console.error('Account synchronization failed:', error);

        if (error.status && error.code) {
            return res.status(error.status).json({
                code: error.code,
                message: error.message,
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                code: 'ACCOUNT_CONFLICT',
                message: 'An account already exists with this identity.',
            });
        }

        return res.status(500).json({
            code: 'ACCOUNT_SYNC_FAILED',
            message: 'The account could not be synchronized.',
        });
    }
}

async function getCurrentAccount(req, res) {
    try {
        const user = await User.findOne({ firebaseUid: req.auth.uid })
            .populate('platform', 'name slug isActive');

        if (!user) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Application account not found.',
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                code: 'ACCOUNT_UNAVAILABLE',
                message: 'This account is not active.',
            });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Account retrieval failed:', error);

        return res.status(500).json({
            code: 'ACCOUNT_LOAD_FAILED',
            message: 'The account could not be loaded.',
        });
    }
}

async function updateCurrentAccount(req, res) {
    try {
        const allowedUpdates = {};

        if (typeof req.body.displayName === 'string') {
            const displayName = req.body.displayName.trim();

            if (!displayName || displayName.length > 100) {
                return res.status(400).json({
                    code: 'INVALID_DISPLAY_NAME',
                    message: 'Enter a display name of no more than 100 characters.',
                });
            }

            allowedUpdates.displayName = displayName;
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: req.auth.uid, status: 'active' },
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Account not found.',
            });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Account update failed:', error);

        return res.status(500).json({
            code: 'ACCOUNT_UPDATE_FAILED',
            message: 'The account could not be updated.',
        });
    }
}

async function requestEmailLinkOtp(req, res) {
    try {
        if (!firebaseAdminConfigured || !firebaseAdminAuth) {
            return res.status(503).json({
                code: 'EMAIL_LINK_NOT_CONFIGURED',
                message: 'Email verification is not configured on the server.',
            });
        }

        const account = await User.findOne({ firebaseUid: req.auth.uid, status: 'active' });
        if (!account) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Account not found.',
            });
        }

        const { expiresAt } = await requestOtp({
            email: req.body.email,
            purpose: 'link-email',
            ip: req.ip,
            metadata: { firebaseUid: req.auth.uid },
        });

        return res.json({
            message: 'A verification code was sent to your email.',
            expiresAt,
        });
    } catch (error) {
        console.error('Email link request failed:', error.cause || error);
        return res.status(error.status || 500).json({
            code: error.code || 'EMAIL_LINK_REQUEST_FAILED',
            message: error.status ? error.message : 'We could not send the verification code.',
        });
    }
}

async function verifyEmailLinkOtp(req, res) {
    try {
        if (!firebaseAdminConfigured || !firebaseAdminAuth) {
            return res.status(503).json({
                code: 'EMAIL_LINK_NOT_CONFIGURED',
                message: 'Email verification is not configured on the server.',
            });
        }

        const { email, metadata } = await verifyOtp({
            email: req.body.email,
            code: req.body.code,
            purpose: 'link-email',
            ip: req.ip,
        });

        if (metadata.firebaseUid !== req.auth.uid) {
            return res.status(403).json({
                code: 'EMAIL_LINK_SESSION_MISMATCH',
                message: 'This verification code belongs to a different session.',
            });
        }

        try {
            const existingFirebaseUser = await firebaseAdminAuth.getUserByEmail(email);
            if (existingFirebaseUser.uid !== req.auth.uid) {
                return res.status(409).json({
                    code: 'EMAIL_ALREADY_IN_USE',
                    message: 'This email is already connected to another account.',
                });
            }
        } catch (error) {
            if (error.code !== 'auth/user-not-found') throw error;
        }

        await firebaseAdminAuth.updateUser(req.auth.uid, {
            email,
            emailVerified: true,
        });

        await User.findOneAndUpdate(
            { firebaseUid: req.auth.uid },
            { $addToSet: { providers: 'email-otp' } }
        );

        const user = await synchronizeAccount(req.auth);
        return res.json({
            message: 'Your verified email was connected successfully.',
            user,
        });
    } catch (error) {
        console.error('Email link verification failed:', error.cause || error);

        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                code: 'EMAIL_ALREADY_IN_USE',
                message: 'This email is already connected to another account.',
            });
        }

        return res.status(error.status || 500).json({
            code: error.code || 'EMAIL_LINK_FAILED',
            message: error.status ? error.message : 'We could not connect this email.',
        });
    }
}

async function getCustomerTransactions(req, res) {
    try {
        const user = await User.findOne({ firebaseUid: req.auth.uid });
        if (!user) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Application account not found.',
            });
        }

        const reservations = await Reservation.find({ user: user._id })
            .populate('platform', 'name')
            .populate('design', 'name thumbnail config')
            .populate('blueprint', 'designName deliveryDate status quoteSnapshot orderPricingSnapshot designSnapshot')
            .sort({ createdAt: -1 })
            .lean();

        const existingBlueprintIds = new Set(
            reservations.map((r) => String(r.blueprint?._id || r.blueprint || '')).filter(Boolean)
        );

        const transactions = reservations.map((r) => {
            const downPayment = r.downPayment || { amount: Math.ceil((r.totalPrice || 0) / 2), isPaid: true, method: 'gcash' };
            const finalPayment = r.finalPayment || { amount: 0, isPaid: false };
            const total = Number(r.totalPrice || 0);
            const downAmount = downPayment.isPaid ? Number(downPayment.amount || 0) : 0;
            const finalAmount = finalPayment.isPaid ? Number(finalPayment.amount || (total - downAmount)) : 0;
            const remainingBalance = Math.max(0, total - downAmount - finalAmount);

            return {
                id: String(r._id),
                reservationId: String(r._id),
                blueprintId: r.blueprint?._id ? String(r.blueprint._id) : (r.blueprint ? String(r.blueprint) : null),
                designId: r.design?._id ? String(r.design._id) : (r.design ? String(r.design) : null),
                designName: r.designName || r.blueprint?.designName || r.design?.name || 'Custom Cake Design',
                thumbnail: r.design?.thumbnail || null,
                bakeryName: r.platform?.name || 'AH TINAPS BAKESHOP',
                totalPrice: r.totalPrice,
                downPayment,
                finalPayment,
                remainingBalance,
                pricingSnapshot: (r.pricingSnapshot?.lineItems?.some((it) => it.details?.length > 0)
                    ? r.pricingSnapshot
                    : (r.blueprint?.orderPricingSnapshot || r.blueprint?.quoteSnapshot || r.pricingSnapshot || null)),
                pickupDate: r.pickupDate,
                status: r.status || 'confirmed',
                createdAt: r.createdAt,
                checkoutMode: r.checkoutMode || 'simulated',
            };
        });

        const blueprints = await Blueprint.find({ customer: user._id })
            .populate('platform', 'name')
            .sort({ createdAt: -1 })
            .lean();

        for (const bp of blueprints) {
            if (!existingBlueprintIds.has(String(bp._id))) {
                const totalPesos = bp.quoteSnapshot?.totalMinor
                    ? bp.quoteSnapshot.totalMinor / 100
                    : (bp.orderPricingSnapshot?.totalMinor ? bp.orderPricingSnapshot.totalMinor / 100 : 0);
                const downAmount = Math.ceil(totalPesos / 2);
                transactions.push({
                    id: String(bp._id),
                    reservationId: null,
                    blueprintId: String(bp._id),
                    designId: null,
                    designName: bp.designName || 'Custom Cake Design',
                    thumbnail: null,
                    bakeryName: bp.platform?.name || 'AH TINAPS BAKESHOP',
                    totalPrice: totalPesos,
                    downPayment: { amount: downAmount, isPaid: true, method: 'gcash' },
                    finalPayment: { amount: 0, isPaid: false },
                    remainingBalance: Math.max(0, totalPesos - downAmount),
                    pricingSnapshot: bp.orderPricingSnapshot || bp.quoteSnapshot || null,
                    pickupDate: bp.deliveryDate,
                    status: bp.status === 'ready' ? 'confirmed' : bp.status,
                    createdAt: bp.createdAt,
                    checkoutMode: bp.paymentMode || 'simulated',
                });
            }
        }

        transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({ transactions });
    } catch (error) {
        console.error('Failed to load customer transactions:', error);
        return res.status(500).json({
            code: 'TRANSACTIONS_LOAD_FAILED',
            message: 'Failed to load transaction history.',
            error: error.message,
        });
    }
}

async function payTransactionBalance(req, res) {
    const now = req.__testNow || new Date();
    if (isWithinThirtyMinutePaymentCutoff(now)) {
        return res.status(403).json({
            message: 'No payments are available 30 minutes before the scheduled update (from 9:30 PM to 10:05 PM). Please try again after the update completes.',
        });
    }

    const { id } = req.params;
    const { paymentReference, method = 'gcash' } = req.body || {};

    try {
        const platform = await Platform.findOne();
        if (platform?.maintenanceMode?.isWebsiteOff) {
            return res.status(403).json({
                message: 'Payments are temporarily unavailable because the website is in maintenance mode. Please try again later.',
            });
        }

        const firebaseUid = req.auth?.uid || req.user?.uid;
        if (!firebaseUid) {
            return res.status(401).json({ message: 'Authentication is required.' });
        }

        const user = await User.findOne({ firebaseUid });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let reservation = null;
        if (mongoose.isValidObjectId(id)) {
            reservation = await Reservation.findOne({ _id: id, user: user._id })
                || await Reservation.findOne({ blueprint: id, user: user._id })
                || await Reservation.findOne({ design: id, user: user._id })
                || await Reservation.findById(id)
                || await Reservation.findOne({ blueprint: id })
                || await Reservation.findOne({ design: id });
        }

        if (!reservation) {
            // Check if there is an un-migrated Blueprint belonging to this customer
            const bp = (mongoose.isValidObjectId(id) && await Blueprint.findOne({ _id: id, customer: user._id }))
                || (mongoose.isValidObjectId(id) && await Blueprint.findById(id));
            if (bp) {
                if (!bp.customer) {
                    bp.customer = user._id;
                    await bp.save().catch(() => {});
                }
                const checkout = require('../services/checkoutReservationService');
                reservation = await checkout.ensureCheckoutReservation(bp);
            }
        }

        if (!reservation && typeof id === 'string' && id.length >= 6) {
            reservation = await Reservation.findOne({
                user: user._id,
                $expr: {
                    $regexMatch: {
                        input: { $toString: '$_id' },
                        regex: `${id}$`,
                        options: 'i',
                    },
                },
            }) || await Reservation.findOne({
                $expr: {
                    $regexMatch: {
                        input: { $toString: '$_id' },
                        regex: `${id}$`,
                        options: 'i',
                    },
                },
            });
        }

        if (!reservation) {
            return res.status(404).json({ message: 'Order reservation not found.' });
        }

        if (!reservation.user) {
            reservation.user = user._id;
        }

        if (reservation.finalPayment?.isPaid) {
            return res.status(400).json({ message: 'The balance for this order is already paid.' });
        }

        const totalPrice = Number(reservation.totalPrice || 0);
        const downPaymentAmount = Number(reservation.downPayment?.amount || Math.ceil(totalPrice / 2));
        const balanceAmount = Math.max(0, totalPrice - downPaymentAmount);

        const ref = paymentReference?.trim() || `DEMO-BAL-${balanceAmount}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        reservation.finalPayment = {
            amount: balanceAmount,
            isPaid: true,
            paidAt: new Date(),
            method: method || 'gcash',
            paymentReference: ref,
        };

        // Automatic switch: confirmed -> in_production
        if (reservation.status === 'confirmed' || reservation.status === 'pending_payment' || !reservation.status) {
            reservation.status = 'in_production';
        }

        await reservation.save();

        if (reservation.blueprint) {
            await Blueprint.findByIdAndUpdate(reservation.blueprint, {
                status: 'in_production',
            }).catch(() => {});
        }

        // Emit live socket update to bakery platform room
        const io = req.app?.get ? req.app.get('io') : null;
        let populated = null;
        if (reservation.platform) {
            populated = await Reservation.findById(reservation._id)
                .populate('user', 'displayName email name')
                .populate('design', 'name thumbnail')
                .populate('blueprint', 'designName')
                .populate('platform', 'name')
                .lean()
                .catch(() => null);

            if (io) {
                io.to(`platform:${reservation.platform}`).emit('reservation:updated', populated || reservation);
                io.to(`platform:${reservation.platform}`).emit('bakery:notification', {
                    type: 'in_production',
                    title: 'Balance Paid! (Order In Production)',
                    message: `${populated?.user?.displayName || populated?.user?.name || user?.displayName || 'Customer'} paid the remaining balance (₱${Number(reservation.finalPayment?.amount || balanceAmount).toLocaleString()}) for "${populated?.design?.name || populated?.blueprint?.designName || populated?.designName || 'Custom Cake'}". Status changed to In Production!`,
                    reservationId: String(reservation._id),
                    status: 'in_production',
                    timestamp: new Date(),
                });
            }
        }

        // Automatic bakery chat: post an acknowledgement message from the bakery
        try {
            if (reservation.platform && user?._id) {
                let conversation = await Conversation.findOne({
                    customer: user._id,
                    platform: reservation.platform,
                });

                if (!conversation) {
                    conversation = await Conversation.create({
                        customer: user._id,
                        platform: reservation.platform,
                        reservation: reservation._id,
                        status: 'open',
                    }).catch((e) => {
                        if (e.code === 11000) {
                            return Conversation.findOne({ customer: user._id, platform: reservation.platform });
                        }
                        throw e;
                    });
                }

                if (conversation && conversation.status === 'open') {
                    const bakerySender = await User.findOne({
                        platform: reservation.platform,
                        role: { $in: ['bakery_admin', 'bakery_staff'] },
                        status: 'active',
                    }) || await User.findOne({
                        platform: reservation.platform,
                        role: { $in: ['bakery_admin', 'bakery_staff'] },
                    });

                    if (bakerySender) {
                        const cakeName = populated?.design?.name || populated?.blueprint?.designName || reservation.designName || 'Custom Cake';
                        const balFormatted = Number(reservation.finalPayment?.amount || balanceAmount).toLocaleString();
                        const chatText = `We have received your remaining balance payment of ₱${balFormatted} (Ref: ${ref}) for "${cakeName}". Your cake is now in production! Our baking team has started preparation and we will notify you once it's ready.`;
                        const clientMsgId = `balance_paid_${reservation._id}_${Date.now()}`;

                        const chatMsg = await Message.create({
                            conversation: conversation._id,
                            sender: bakerySender._id,
                            senderRole: bakerySender.role,
                            type: 'text',
                            text: chatText,
                            clientMessageId: clientMsgId,
                            readBy: [],
                            moderation: 'approved',
                        }).catch(() => null);

                        if (chatMsg) {
                            await Conversation.updateOne(
                                { _id: conversation._id },
                                {
                                    $set: {
                                        lastMessageAt: chatMsg.createdAt,
                                        lastMessagePreview: chatText.slice(0, 160),
                                    },
                                    $inc: { customerUnreadCount: 1 },
                                },
                            ).catch(() => {});

                            if (io) {
                                publishMessage(io, conversation, chatMsg);
                            }
                        }
                    }
                }
            }
        } catch (chatErr) {
            console.error('Failed to post automatic bakery balance chat message:', chatErr);
        }

        // Send balance payment email confirmation to user
        try {
            sendBalancePaymentEmail(populated || reservation).catch((emailErr) => {
                console.warn('Could not send balance payment email:', emailErr.message || emailErr);
            });
        } catch (emailErr) {
            console.warn('Balance payment email trigger error:', emailErr);
        }

        return res.json({
            message: 'Balance payment completed successfully. Order is now in production!',
            reservationId: String(reservation._id),
            status: reservation.status,
            finalPayment: reservation.finalPayment,
            remainingBalance: 0,
        });
    } catch (err) {
        console.error('Failed to complete balance payment:', err);
        return res.status(500).json({ message: 'Could not process balance payment. Please try again.' });
    }
}

async function disconnectEmailOtp(req, res) {
    try {
        const user = await User.findOneAndUpdate(
            { firebaseUid: req.auth.uid, status: 'active' },
            { $pull: { providers: 'email-otp' } },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Account not found.',
            });
        }
        return res.json({
            message: 'Email verification was disconnected.',
            user,
        });
    } catch (error) {
        console.error('Email disconnect failed:', error);
        return res.status(500).json({
            code: 'DISCONNECT_FAILED',
            message: 'We could not disconnect email verification.',
        });
    }
}

module.exports = {
    syncAccount,
    getCurrentAccount,
    updateCurrentAccount,
    requestEmailLinkOtp,
    verifyEmailLinkOtp,
    disconnectEmailOtp,
    getCustomerTransactions,
    payTransactionBalance,
};
