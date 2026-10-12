import React, { useEffect } from 'react';
import { ShieldCheck, ExternalLink, X, FileText, CheckCircle2 } from 'lucide-react';
import birNiriImg from '@/assets/bir-niri.jpg';

export default function BusinessComplianceModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="compliance-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compliance-modal-title"
        className="compliance-modal-card"
      >
        <header className="compliance-modal-header">
          <div className="compliance-header-text">
            <div className="compliance-badge">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>Verified Business Entity</span>
            </div>
            <h2 id="compliance-modal-title">Business Registration &amp; Tax Compliance</h2>
            <p>
              Official registration and consumer protection compliance for <strong>AH TINAPS BAKESHOP</strong> operating on CakeNMake.
            </p>
          </div>
          <button
            type="button"
            className="compliance-modal-close"
            onClick={onClose}
            aria-label="Close business registration details"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="compliance-modal-body">
          {/* Section 1: DTI Registration (Left Column) */}
          <section className="compliance-section" aria-labelledby="dti-section-title">
            <div className="compliance-section-header">
              <div className="compliance-section-icon dti-icon">
                <FileText size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 id="dti-section-title">DTI Business Name Registration</h3>
                <span className="compliance-verified-tag">
                  <CheckCircle2 size={13} aria-hidden="true" /> DTI Registered
                </span>
              </div>
            </div>

            <dl className="compliance-details-grid">
              <div>
                <dt>Registered Business Name</dt>
                <dd>AH TINAPS BAKESHOP</dd>
              </div>
              <div>
                <dt>DTI Registration No.</dt>
                <dd className="font-mono">6752278</dd>
              </div>
              <div>
                <dt>Validity Period</dt>
                <dd>Valid until January 16, 2030</dd>
              </div>
              <div>
                <dt>Regulating Authority</dt>
                <dd>DTI (Philippines)</dd>
              </div>
            </dl>

            <div className="compliance-cert-card">
              <div className="compliance-cert-header">
                <div className="compliance-cert-badge">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>BNRS Public Registry</span>
                </div>
                <span className="compliance-cert-ref">BN No. 6752278</span>
              </div>

              <p className="compliance-cert-desc">
                Official Business Name Registration Certificate is valid and active. Search by Business Name or Registration Number on the public DTI database to verify standing.
              </p>

              <a
                href="https://bnrs.dti.gov.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="compliance-external-btn"
              >
                <span>Verify on DTI BNRS Portal</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* Section 2: BIR NIRI (Right Column) */}
          <section className="compliance-section" aria-labelledby="bir-section-title">
            <div className="compliance-section-header">
              <div className="compliance-section-icon bir-icon">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 id="bir-section-title">BIR Tax Registration (NIRI)</h3>
                <span className="compliance-verified-tag">
                  <CheckCircle2 size={13} aria-hidden="true" /> Invoicing Compliant
                </span>
              </div>
            </div>

            <dl className="compliance-details-grid">
              <div>
                <dt>Registered Name</dt>
                <dd>ALMOROTO, CHERRY AGRIPA</dd>
              </div>
              <div>
                <dt>Business / Trade Name</dt>
                <dd>AH TINAPS BAKESHOP</dd>
              </div>
              <div>
                <dt>TIN &amp; Branch Code</dt>
                <dd className="font-mono">669-066-967-00000</dd>
              </div>
              <div>
                <dt>Revenue District Office</dt>
                <dd>041 - Mandaluyong</dd>
              </div>
            </dl>

            <figure className="compliance-image-frame">
              <img
                src={birNiriImg}
                alt="Official BIR Notice to Issue Receipt/Invoice (NIRI) plate for AH TINAPS BAKESHOP"
                className="compliance-niri-img"
              />
              <figcaption>
                Official BIR Notice to Issue Receipt / Invoice posted in compliance with Philippine Tax Regulations.
              </figcaption>
            </figure>
          </section>
        </div>

        <footer className="compliance-modal-footer">
          <p>
            Operating in accordance with the <strong>Philippine Internet Transactions Act (RA 11967)</strong> and the <strong>Consumer Act</strong>.
          </p>
          <button type="button" className="compliance-close-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
