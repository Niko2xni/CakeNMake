import React, { useState, useEffect } from 'react';
import { CreditCard, Sparkles, Receipt, ArrowUpRight, Check, AlertCircle, RefreshCw } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { billingApi } from '@/services/api'; // Adjust path based on your API setup
import { safeExternalUrl } from '@/lib/safe-url';

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString()}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BakeryBilling() {
  const [billingData, setBillingData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    setLoading(true);
    setError('');
    try {
      // Replace with your actual aggregated platform/AI billing endpoints
      const [usage, history] = await Promise.all([
        billingApi.getAIUsageSummary(), 
        billingApi.getInvoiceHistory()
      ]);
      setBillingData(usage);
      setInvoices(history);
    } catch (err) {
      console.error('Failed to load AI billing details', err);
      setError('Failed to load billing metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI Billing & Usage</h1>
          <p className="text-sm text-gray-500">Manage your subscription, AI blueprint generation credits, and token usage</p>
        </div>
        <button
          onClick={loadBillingData}
          className="p-2 rounded-full border border-pink-100 text-gray-500 hover:bg-pink-50 hover:text-pink-500 transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {error && (
        <div className="flex-shrink-0 px-6 py-2 bg-rose-50 border-b border-rose-100">
          <p className="text-sm text-rose-700 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      <CustomScrollbar className="flex-1" contentClassName="p-6 space-y-6">
        {loading ? (
          <div role="status" aria-label="Loading billing configuration" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}
            </div>
            <Skeleton className="h-6 w-48" />
            <AdminRowsSkeleton count={4} />
          </div>
        ) : (
          <>
            {/* Overview & Tier Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50/60 to-rose-50/40 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-600 bg-white/80 px-2 py-0.5 rounded-full border border-pink-100">Current Plan</span>
                  <Sparkles className="w-4 h-4 text-pink-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{billingData?.planName || 'Bakery Pro AI'}</p>
                  <p className="text-xs text-gray-500 mt-1">Next renewal date: {formatDate(billingData?.nextBillingDate)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-pink-100 bg-pink-50/30 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">AI Blueprint Credits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {billingData?.creditsUsed || 0} <span className="text-sm font-normal text-gray-400">/ {billingData?.creditsTotal || 500} generations</span>
                  </p>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-pink-100/60 rounded-full h-2 mt-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(((billingData?.creditsUsed || 0) / (billingData?.creditsTotal || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-pink-100 bg-pink-50/30 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Accrued Month-to-Date Cost</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatPeso(billingData?.amountDue)}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Includes overage generations beyond base tier allocation</p>
              </div>
            </div>

            {/* Main Billing Splitting Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* Left Side: Payment Method & Plan Perks */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment Details</h2>
                
                <div className="rounded-xl border border-pink-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {billingData?.cardBrand || 'Visa'} ending in {billingData?.cardLast4 || '4242'}
                      </p>
                      <p className="text-xs text-gray-500">Expires {billingData?.cardExpiry || '12/28'}</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors">
                    Update Card
                  </button>
                </div>

                <div className="rounded-xl border border-pink-100 p-4 space-y-3 bg-pink-50/10">
                  <p className="text-sm font-semibold text-gray-900">Included Pro Features</p>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" /> Automated Smart Production Blueprint PDFs</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" /> Interactive customer flavor matching recommendations</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" /> Multi-tier custom cake component structural safety validations</li>
                  </ul>
                </div>
              </div>

              {/* Right Side: Invoice Statement Log */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-pink-500" />
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statement History</h2>
                </div>
                
                <div className="space-y-2">
                  {invoices.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-4 text-center">No past payment statements found.</p>
                  ) : (
                    invoices.map((invoice) => {
                      const invoiceUrl = safeExternalUrl(invoice.pdfUrl);
                      return (
                      <div key={invoice.id} className="rounded-xl border border-pink-100 p-3 flex items-center justify-between bg-white hover:bg-pink-50/20 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{invoice.invoiceNum || 'INV-001'}</p>
                          <p className="text-[10px] text-gray-400">{formatDate(invoice.paidAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{formatPeso(invoice.amount)}</span>
                          {invoiceUrl && (
                            <a
                              href={invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-full text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                              aria-label={`Open invoice ${invoice.invoiceNum || ''}`.trim()}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CustomScrollbar>
    </div>
  );
}
