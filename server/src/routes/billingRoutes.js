const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole } = require('../middleware/authorize');

// GET /api/bakery/billing/usage
router.get('/usage', authenticate, loadAppUser, requireRole('bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextDate.setDate(1);

    const usageSummary = {
      planName: 'Bakery Pro AI',
      nextBillingDate: nextDate.toISOString(),
      creditsUsed: 48,
      creditsTotal: 500,
      amountDue: 1499,
      cardBrand: 'Visa',
      cardLast4: '4242',
      cardExpiry: '12/28',
    };

    return res.json(usageSummary);
  } catch (error) {
    console.error('Failed to fetch billing usage:', error);
    return res.status(500).json({ message: 'Failed to fetch billing usage' });
  }
});

// GET /api/bakery/billing/invoices
router.get('/invoices', authenticate, loadAppUser, requireRole('bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const now = new Date();
    const invoices = [
      {
        id: 'inv-101',
        invoiceNum: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        paidAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        amount: 1499,
        pdfUrl: '',
      },
      {
        id: 'inv-100',
        invoiceNum: `INV-${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`,
        paidAt: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        amount: 1499,
        pdfUrl: '',
      },
    ];

    return res.json(invoices);
  } catch (error) {
    console.error('Failed to fetch billing invoices:', error);
    return res.status(500).json({ message: 'Failed to fetch billing invoices' });
  }
});

module.exports = router;
