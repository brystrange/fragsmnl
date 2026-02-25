import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, QrCode, FileText, CreditCard, BarChart3, Clock, Palette, ChevronRight, Timer, Hourglass, AlertCircle, Loader2, ImageIcon, Building2, Phone, FileCheck } from 'lucide-react';

const SIDEBAR_ITEMS = [
  { key: 'invoice', label: 'Invoice', icon: FileText, description: 'Invoice templates & settings' },
  { key: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment methods & accounts' },
  { key: 'reporting', label: 'Reporting', icon: BarChart3, description: 'Reports & analytics' },
  { key: 'time-setups', label: 'Time Setups', icon: Clock, description: 'Timers & scheduling' },
  { key: 'customization', label: 'Customization', icon: Palette, description: 'Branding & appearance' },
];

/* ─── Unsaved Changes Modal ─────────────────────── */
const UnsavedChangesModal = ({ isOpen, onSave, onDiscard, onCancel, isSaving }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
        </div>

        <p className="text-gray-600 mb-6">
          You have unsaved changes. Would you like to save them before leaving?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
          >
            Discard Changes
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ paymentSettings, updatePaymentSettings, showToast, timeSettings, updateTimeSettings, invoiceSettings, updateInvoiceSettings }) => {
  const [activeSection, setActiveSection] = useState('payments');
  const [formData, setFormData] = useState({
    gcashNumber: '',
    gcashName: '',
    payMayaNumber: '',
    payMayaName: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    qrCodeUrl: ''
  });
  const [qrPreview, setQrPreview] = useState('');
  const [timeFormData, setTimeFormData] = useState({
    reservationExpiryMinutes: 5,
    paymentWaitHours: 48
  });
  const [invoiceFormData, setInvoiceFormData] = useState({
    businessLogoUrl: '',
    businessName: '',
    businessTagline: '',
    businessAddress: '',
    contactNumber: '',
    socialMedia: '',
    termsAndConditions: '',
    cancellationPolicy: ''
  });
  const [logoPreview, setLogoPreview] = useState('');

  // Loading states
  const [savingPayments, setSavingPayments] = useState(false);
  const [savingTime, setSavingTime] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Unsaved changes modal
  const [unsavedModal, setUnsavedModal] = useState({ open: false, targetSection: null });
  const [modalSaving, setModalSaving] = useState(false);

  // Keep "clean" snapshots so we can diff against them
  const cleanPaymentRef = useRef(null);
  const cleanTimeRef = useRef(null);
  const cleanInvoiceRef = useRef(null);

  useEffect(() => {
    if (paymentSettings) {
      setFormData(paymentSettings);
      setQrPreview(paymentSettings.qrCodeUrl || '');
      cleanPaymentRef.current = paymentSettings;
    }
  }, [paymentSettings]);

  useEffect(() => {
    if (timeSettings) {
      const data = {
        reservationExpiryMinutes: timeSettings.reservationExpiryMinutes ?? 5,
        paymentWaitHours: timeSettings.paymentWaitHours ?? 48
      };
      setTimeFormData(data);
      cleanTimeRef.current = data;
    }
  }, [timeSettings]);

  useEffect(() => {
    if (invoiceSettings && Object.keys(invoiceSettings).length > 0) {
      const data = {
        businessLogoUrl: invoiceSettings.businessLogoUrl || '',
        businessName: invoiceSettings.businessName || '',
        businessTagline: invoiceSettings.businessTagline || '',
        businessAddress: invoiceSettings.businessAddress || '',
        contactNumber: invoiceSettings.contactNumber || '',
        socialMedia: invoiceSettings.socialMedia || '',
        termsAndConditions: invoiceSettings.termsAndConditions || '',
        cancellationPolicy: invoiceSettings.cancellationPolicy || ''
      };
      setInvoiceFormData(data);
      setLogoPreview(data.businessLogoUrl);
      cleanInvoiceRef.current = data;
    }
  }, [invoiceSettings]);

  /* ─── Dirty detection ──────────────────────────── */
  const isPaymentsDirty = useCallback(() => {
    if (!cleanPaymentRef.current) return false;
    return JSON.stringify(formData) !== JSON.stringify(cleanPaymentRef.current);
  }, [formData]);

  const isTimeDirty = useCallback(() => {
    if (!cleanTimeRef.current) return false;
    return JSON.stringify(timeFormData) !== JSON.stringify(cleanTimeRef.current);
  }, [timeFormData]);

  const isInvoiceDirty = useCallback(() => {
    if (!cleanInvoiceRef.current) return false;
    return JSON.stringify(invoiceFormData) !== JSON.stringify(cleanInvoiceRef.current);
  }, [invoiceFormData]);

  const isCurrentSectionDirty = useCallback(() => {
    if (activeSection === 'payments') return isPaymentsDirty();
    if (activeSection === 'time-setups') return isTimeDirty();
    if (activeSection === 'invoice') return isInvoiceDirty();
    return false;
  }, [activeSection, isPaymentsDirty, isTimeDirty, isInvoiceDirty]);

  /* ─── Save helpers ─────────────────────────────── */
  const saveCurrentSection = useCallback(async () => {
    if (activeSection === 'payments') {
      setSavingPayments(true);
      try {
        await updatePaymentSettings(formData);
        cleanPaymentRef.current = { ...formData };
      } finally {
        setSavingPayments(false);
      }
    } else if (activeSection === 'time-setups') {
      setSavingTime(true);
      try {
        await updateTimeSettings(timeFormData);
        cleanTimeRef.current = { ...timeFormData };
      } finally {
        setSavingTime(false);
      }
    } else if (activeSection === 'invoice') {
      setSavingInvoice(true);
      try {
        await updateInvoiceSettings(invoiceFormData);
        cleanInvoiceRef.current = { ...invoiceFormData };
      } finally {
        setSavingInvoice(false);
      }
    }
  }, [activeSection, formData, timeFormData, invoiceFormData, updatePaymentSettings, updateTimeSettings, updateInvoiceSettings]);

  const discardCurrentSection = useCallback(() => {
    if (activeSection === 'payments' && cleanPaymentRef.current) {
      setFormData(cleanPaymentRef.current);
      setQrPreview(cleanPaymentRef.current.qrCodeUrl || '');
    } else if (activeSection === 'time-setups' && cleanTimeRef.current) {
      setTimeFormData(cleanTimeRef.current);
    } else if (activeSection === 'invoice' && cleanInvoiceRef.current) {
      setInvoiceFormData(cleanInvoiceRef.current);
      setLogoPreview(cleanInvoiceRef.current.businessLogoUrl || '');
    }
  }, [activeSection]);

  /* ─── Tab switching with guard ─────────────────── */
  const handleSectionClick = (key) => {
    if (key === activeSection) return;
    if (isCurrentSectionDirty()) {
      setUnsavedModal({ open: true, targetSection: key });
    } else {
      setActiveSection(key);
    }
  };

  const handleModalSave = async () => {
    setModalSaving(true);
    try {
      await saveCurrentSection();
      setUnsavedModal({ open: false, targetSection: null });
      setActiveSection(unsavedModal.targetSection);
    } finally {
      setModalSaving(false);
    }
  };

  const handleModalDiscard = () => {
    discardCurrentSection();
    const target = unsavedModal.targetSection;
    setUnsavedModal({ open: false, targetSection: null });
    setActiveSection(target);
  };

  const handleModalCancel = () => {
    setUnsavedModal({ open: false, targetSection: null });
  };

  /* ─── Form handlers ────────────────────────────── */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQrCodeChange = (e) => {
    const url = e.target.value;
    setFormData({ ...formData, qrCodeUrl: url });
    setQrPreview(url);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSavingPayments(true);
    try {
      await updatePaymentSettings(formData);
      cleanPaymentRef.current = { ...formData };
      showToast('Payment settings updated successfully!', 'success');
    } finally {
      setSavingPayments(false);
    }
  };

  const handleTimeSave = async () => {
    setSavingTime(true);
    try {
      await updateTimeSettings(timeFormData);
      cleanTimeRef.current = { ...timeFormData };
    } finally {
      setSavingTime(false);
    }
  };

  const handleInvoiceChange = (e) => {
    setInvoiceFormData({ ...invoiceFormData, [e.target.name]: e.target.value });
  };

  const handleLogoUrlChange = (e) => {
    const url = e.target.value;
    setInvoiceFormData({ ...invoiceFormData, businessLogoUrl: url });
    setLogoPreview(url);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      await updateInvoiceSettings(invoiceFormData);
      cleanInvoiceRef.current = { ...invoiceFormData };
      showToast('Invoice settings updated successfully!', 'success');
    } finally {
      setSavingInvoice(false);
    }
  };

  /* ─── Content panels ──────────────────────────────── */

  const renderPayments = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Payment Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure payment methods for customer checkout.</p>
      </div>

      <form onSubmit={handlePaymentSubmit} className="space-y-8">
        {/* QR Code */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <QrCode className="w-4 h-4 text-slate-500" />
            QR Code Payment
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">QR Code Image URL</label>
              <input type="url" name="qrCodeUrl" value={formData.qrCodeUrl} onChange={handleQrCodeChange}
                placeholder="https://example.com/qr-code.png"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
              <p className="text-xs text-gray-400 mt-1.5">Upload QR code to image hosting and paste URL</p>
            </div>
            <div>
              {qrPreview && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Preview</p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-center">
                    <img src={qrPreview} alt="QR Preview" className="w-32 h-32 object-contain" onError={() => setQrPreview('')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GCash */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">GCash</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GCash Number</label>
              <input type="tel" name="gcashNumber" value={formData.gcashNumber} onChange={handleChange}
                placeholder="09XXXXXXXXX"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
              <input type="text" name="gcashName" value={formData.gcashName} onChange={handleChange}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* PayMaya */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">PayMaya</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">PayMaya Number</label>
              <input type="tel" name="payMayaNumber" value={formData.payMayaNumber} onChange={handleChange}
                placeholder="09XXXXXXXXX"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
              <input type="text" name="payMayaName" value={formData.payMayaName} onChange={handleChange}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* Bank Transfer */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Bank Transfer</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
              <input type="text" name="bankName" value={formData.bankName} onChange={handleChange}
                placeholder="BDO, BPI, etc."
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
              <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange}
                placeholder="1234567890"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
              <input type="text" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex-1 mr-4">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">💡 Tip:</span> Fill in at least one payment method. Use image hosting (Imgur, Google Drive) for QR codes.
            </p>
          </div>
          <button type="submit" disabled={savingPayments}
            className="flex items-center gap-2 px-6 py-2.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold transition shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed">
            {savingPayments ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderPlaceholder = (sectionLabel, sectionDescription) => (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">{sectionLabel}</h2>
        <p className="text-sm text-gray-500 mt-1">{sectionDescription}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {SIDEBAR_ITEMS.find(i => i.label === sectionLabel)?.icon &&
            React.createElement(SIDEBAR_ITEMS.find(i => i.label === sectionLabel).icon, { className: 'w-7 h-7 text-gray-400' })}
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">Coming Soon</h3>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          This section is under development and will be available in a future update.
        </p>
      </div>
    </div>
  );

  const renderTimeSetups = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Time Setups</h2>
        <p className="text-sm text-gray-500 mt-1">Configure timers for reservations and payment deadlines.</p>
      </div>

      <div className="space-y-6">
        {/* Reservation Expiry */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2 uppercase tracking-wide">
            <Timer className="w-4 h-4 text-slate-500" />
            Reservation Expiry
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            How long a customer has to check out before their reserved items are released back to stock.
          </p>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Duration</label>
            <select
              value={timeFormData.reservationExpiryMinutes}
              onChange={(e) => setTimeFormData({ ...timeFormData, reservationExpiryMinutes: Number(e.target.value) })}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
              <option value={2160}>36 hours</option>
              <option value={2880}>48 hours</option>
            </select>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Reservations created <strong>after</strong> saving will use the new duration. Existing active reservations will keep their current timer.</span>
            </p>
          </div>
        </div>

        {/* Payment Wait Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2 uppercase tracking-wide">
            <Hourglass className="w-4 h-4 text-slate-500" />
            Payment Wait Time
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            How long a customer has to upload their payment proof before the order is automatically cancelled.
            A warning notification is sent at the halfway point.
          </p>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Wait Duration (hours)</label>
            <select
              value={timeFormData.paymentWaitHours}
              onChange={(e) => setTimeFormData({ ...timeFormData, paymentWaitHours: Number(e.target.value) })}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
            >
              <option value={0.05}>3 minutes (testing)</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
            <p className="text-xs text-gray-400 mt-1.5">Warning sent at {timeFormData.paymentWaitHours >= 1 ? `${Math.floor(timeFormData.paymentWaitHours / 2)} hours` : `${Math.round(timeFormData.paymentWaitHours * 60 / 2)} min`}</p>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Orders already in progress will be evaluated against the <strong>new</strong> wait time on the next check cycle (every 5 minutes).</span>
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end pt-2">
          <button
            onClick={handleTimeSave}
            disabled={savingTime}
            className="flex items-center gap-2 px-6 py-2.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold transition shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {savingTime ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Time Settings</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInvoice = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Invoice Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure business information that appears on generated PDF invoices.</p>
      </div>

      <form onSubmit={handleInvoiceSubmit} className="space-y-8">
        {/* Business Identity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Building2 className="w-4 h-4 text-slate-500" />
            Business Identity
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
              <input type="text" name="businessName" value={invoiceFormData.businessName} onChange={handleInvoiceChange}
                placeholder="e.g. GSTREETWEARPH"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline / Subtitle</label>
              <input type="text" name="businessTagline" value={invoiceFormData.businessTagline} onChange={handleInvoiceChange}
                placeholder="e.g. Official Invoice"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* Business Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            Business Logo
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo Image URL</label>
              <input type="url" name="businessLogoUrl" value={invoiceFormData.businessLogoUrl} onChange={handleLogoUrlChange}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
              <p className="text-xs text-gray-400 mt-1.5">Upload your logo to image hosting and paste URL. Recommended: square, at least 200×200px.</p>
            </div>
            <div>
              {logoPreview && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Preview</p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-center">
                    <img src={logoPreview} alt="Logo Preview" className="w-24 h-24 object-contain" onError={() => setLogoPreview('')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Phone className="w-4 h-4 text-slate-500" />
            Contact & Address
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
              <input type="tel" name="contactNumber" value={invoiceFormData.contactNumber} onChange={handleInvoiceChange}
                placeholder="09XXXXXXXXX"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Social Media</label>
              <input type="text" name="socialMedia" value={invoiceFormData.socialMedia} onChange={handleInvoiceChange}
                placeholder="e.g. IG: @shop | FB: /shop"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Address</label>
              <input type="text" name="businessAddress" value={invoiceFormData.businessAddress} onChange={handleInvoiceChange}
                placeholder="123 Main St, City, Province"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* Terms & Policies */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <FileCheck className="w-4 h-4 text-slate-500" />
            Terms & Policies
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
              <textarea name="termsAndConditions" value={invoiceFormData.termsAndConditions} onChange={handleInvoiceChange}
                rows={4}
                placeholder="Enter your terms and conditions. These will appear at the bottom of every invoice."
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition resize-y" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cancellation Policy</label>
              <textarea name="cancellationPolicy" value={invoiceFormData.cancellationPolicy} onChange={handleInvoiceChange}
                rows={4}
                placeholder="Enter your cancellation policy. Use {businessName} as a placeholder for your business name."
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition resize-y" />
              <p className="text-xs text-gray-400 mt-1.5">Use <code className="bg-gray-100 px-1 rounded">{'{businessName}'}</code> to auto-insert your business name.</p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex-1 mr-4">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">💡 Tip:</span> Changes here are immediately reflected in all future invoice PDFs generated from Order Management and the customer Payment page.
            </p>
          </div>
          <button type="submit" disabled={savingInvoice}
            className="flex items-center gap-2 px-6 py-2.5 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold transition shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed">
            {savingInvoice ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Invoice Settings</>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderContent = () => {
    const section = SIDEBAR_ITEMS.find(i => i.key === activeSection);
    switch (activeSection) {
      case 'payments':
        return renderPayments();
      case 'time-setups':
        return renderTimeSetups();
      case 'invoice':
        return renderInvoice();
      default:
        return renderPlaceholder(section?.label || '', section?.description || '');
    }
  };

  /* ─── Layout ──────────────────────────────────────── */

  return (
    <div className="flex gap-0 min-h-[calc(100vh-180px)]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 rounded-l-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</h3>
        </div>
        <nav className="py-2">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSectionClick(item.key)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all text-sm group ${isActive
                  ? 'bg-slate-50 text-slate-700 border-r-2 border-slate-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 rounded-r-lg p-8 overflow-y-auto">
        {renderContent()}
      </main>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={unsavedModal.open}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
        onCancel={handleModalCancel}
        isSaving={modalSaving}
      />
    </div>
  );
};

export default Settings;