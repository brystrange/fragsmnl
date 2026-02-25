import React, { useEffect, useState, useRef } from 'react';
import { CreditCard, Download, Check, ArrowLeft, Copy, Upload, MapPin, User, Phone, Mail, Image, CheckCircle, Clock, AlertCircle, XCircle, AlertTriangle, Send, X, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import StoreNavbar from './StoreNavbar';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';

const PaymentPage = ({ orders, paymentSettings, user, logout, isAdmin, collections, reservations, updateOrderPaymentProof, notifications, markNotificationRead, markAllNotificationsRead, invoiceSettings, timeSettings, dataLoading }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  const order = orders.find(o => o.id === orderId);

  useEffect(() => {
    // Give a short delay to allow order to load from Firestore real-time updates
    const timeout = setTimeout(() => {
      if (!order && orders.length > 0) {
        navigate('/store');
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [order, orders, navigate]);

  // Show loading if orders haven't loaded yet
  if (dataLoading?.orders || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadInvoice = () => {
    generateInvoicePDF(order, { invoiceSettings, paymentSettings, timeSettings });
  };

  // Handle file select — preview only, don't auto-submit
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploadError(null);

    // Read for preview only
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      setPreviewFile(file);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Actually submit the proof of payment
  const handleSubmitProof = async () => {
    if (!previewImage) return;

    setUploading(true);
    setUploadError(null);

    try {
      const success = await updateOrderPaymentProof(orderId, previewImage);
      setUploading(false);
      if (success) {
        setPreviewImage(null);
        setPreviewFile(null);
      } else {
        setUploadError('Failed to upload. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setUploadError('An error occurred. Please try again.');
    }
  };

  // Remove preview
  const handleClearPreview = () => {
    setPreviewImage(null);
    setPreviewFile(null);
    setUploadError(null);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const baseClass = "inline-flex items-center justify-center gap-1 w-full sm:w-auto px-3 sm:px-4 py-1 text-[11px] sm:text-[13px] font-medium rounded-lg";
    switch (status) {
      case 'pending':
        return (
          <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            Pending Payment
          </span>
        );
      case 'payment_submitted':
        return (
          <span className={`${baseClass} bg-blue-100 text-blue-800`}>
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Payment Submitted
          </span>
        );
      case 'verified':
        return (
          <span className={`${baseClass} bg-green-100 text-green-800`}>
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Payment Verified
          </span>
        );
      case 'declined':
        return (
          <span className={`${baseClass} bg-red-100 text-red-800`}>
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Payment Declined
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${baseClass} bg-red-100 text-red-800`}>
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            Order Cancelled
          </span>
        );
      default:
        return (
          <span className={`${baseClass} bg-gray-100 text-gray-800`}>
            {status}
          </span>
        );
    }
  };

  const shipping = order.shippingDetails || {};
  const currentAttempt = order.currentAttempt || 0;
  const paymentAttempts = order.paymentAttempts || [];
  const hasDeclinedAttempts = paymentAttempts.some(a => a.status === 'declined');
  const canResubmit = (order.paymentStatus === 'pending' || order.paymentStatus === 'declined') && currentAttempt < 3;
  const isFirstUpload = !order.paymentProofUrl && currentAttempt === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreNavbar
        collections={collections}
        user={user}
        logout={logout}
        reservations={reservations}
        isAdmin={isAdmin}
        showSearch={false}
        pageTitle="Payment"
        notifications={notifications}
        markNotificationRead={markNotificationRead}
        markAllNotificationsRead={markAllNotificationsRead}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <button
          onClick={() => navigate('/store')}
          className="flex items-center gap-2 text-[12px] text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </button>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm sm:text-m font-bold text-green-900 mb-1 sm:mb-2">Order Created Successfully!</h2>
            <p className="text-[12px] sm:text-[14px] text-green-800">
              Your order has been created. Please complete the payment using the details below and upload your proof of payment within {timeSettings.paymentWaitHours} hours.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 text-[14px]">
          {/* Invoice & Shipping Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">Order #{order.orderNumber}</h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-500">
                    {new Date(order.createdAt).toLocaleString('en-PH')}
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  {getStatusBadge(order.paymentStatus)}
                  <button
                    onClick={downloadInvoice}
                    className="text-[11px] sm:text-[13px] text-accent-700 hover:text-accent-800 flex items-center justify-center gap-1 bg-accent-100 hover:bg-slate-100 w-full sm:w-auto px-3 sm:px-4 py-1 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Download Invoice
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₱{item.totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        x ₱{item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-accent-700">
                    ₱{order.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Details */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4">Shipping Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Customer Name</p>
                    <p className="font-medium">{shipping.name || order.customerName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Phone Number</p>
                    <p className="font-medium">{shipping.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{shipping.email || order.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Shipping Address</p>
                    <p className="font-medium">{shipping.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof of Payment Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Proof of Payment
              </h3>

              {/* Decline Alert with Attempt Counter — shown after first decline */}
              {hasDeclinedAttempts && order.paymentStatus !== 'verified' && order.paymentStatus !== 'cancelled' && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-1">Payment Proof Declined</p>
                      <p className="text-sm text-red-800 mb-3">
                        Your payment proof was not accepted. Please upload a valid proof of payment.
                      </p>

                      {/* Attempt Progress */}
                      <div className="mb-1">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-red-900">Upload Attempts</span>
                          <span className="font-medium text-red-700">
                            {currentAttempt} of 3 used
                          </span>
                        </div>
                        <div className="w-full bg-red-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${(currentAttempt / 3) * 100}%`,
                              background: currentAttempt >= 3
                                ? '#dc2626'
                                : currentAttempt >= 2
                                  ? 'linear-gradient(90deg, #f87171, #dc2626)'
                                  : 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                            }}
                          />
                        </div>
                        <p className="text-xs text-red-600 mt-1.5 font-medium">
                          {currentAttempt >= 3
                            ? '⚠️ Maximum attempts reached. Order will be cancelled.'
                            : `${3 - currentAttempt} attempt${3 - currentAttempt > 1 ? 's' : ''} remaining before order cancellation`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Decline Timeline — shown when there are payment attempts */}
              {paymentAttempts.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Payment Proof Timeline
                  </h4>
                  <div className="relative pl-6 space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

                    {paymentAttempts.map((attempt, index) => {
                      const isLatest = index === paymentAttempts.length - 1;
                      const dotColor = attempt.status === 'approved'
                        ? 'bg-green-500 ring-green-100'
                        : attempt.status === 'declined'
                          ? 'bg-red-500 ring-red-100'
                          : 'bg-blue-500 ring-blue-100';
                      const bgColor = attempt.status === 'approved'
                        ? 'bg-green-50 border-green-200'
                        : attempt.status === 'declined'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-blue-50 border-blue-200';

                      return (
                        <div key={index} className="relative pb-4 last:pb-0">
                          {/* Timeline dot */}
                          <div className={`absolute -left-6 top-3 w-[10px] h-[10px] rounded-full ${dotColor} ring-4 z-10`} />

                          <div className={`p-3 rounded-lg border ${bgColor} ${isLatest ? 'ring-1 ring-offset-1 ring-gray-300' : ''}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[11px] text-gray-900">
                                  {attempt.attemptNumber === 1 ? '1st Attempt' :
                                    attempt.attemptNumber === 2 ? '2nd Attempt' :
                                      'Final Attempt'}
                                </span>
                                {attempt.status === 'approved' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    <CheckCircle className="w-3 h-3" />
                                    Approved
                                  </span>
                                )}
                                {attempt.status === 'declined' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    <XCircle className="w-3 h-3" />
                                    Declined
                                  </span>
                                )}
                                {attempt.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    <Clock className="w-3 h-3" />
                                    Pending Review
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p>Uploaded: {new Date(attempt.uploadedAt).toLocaleString('en-PH')}</p>
                              {attempt.approvedAt && (
                                <p className="text-green-700">Approved: {new Date(attempt.approvedAt).toLocaleString('en-PH')}</p>
                              )}
                              {attempt.declinedAt && (
                                <p className="text-red-700">Declined: {new Date(attempt.declinedAt).toLocaleString('en-PH')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Payment Proof Display */}
              {order.paymentProofUrl && (
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">
                      {order.paymentStatus === 'payment_submitted' ? 'Payment proof uploaded — awaiting verification' :
                        order.paymentStatus === 'verified' ? 'Payment proof verified' :
                          'Previous payment proof'}
                    </span>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img
                      src={order.paymentProofUrl}
                      alt="Payment Proof"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm"
                    />
                  </div>
                  {order.paymentProofUploadedAt && (
                    <p className="text-xs text-gray-500">
                      Uploaded on {new Date(order.paymentProofUploadedAt).toLocaleString('en-PH')}
                    </p>
                  )}

                  {order.paymentStatus === 'payment_submitted' && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <strong>Awaiting verification:</strong> The seller will review your payment proof and verify your order.
                      </p>
                    </div>
                  )}
                  {order.paymentStatus === 'verified' && order.verifiedAt && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm text-green-800">
                        <strong>Payment verified!</strong> Your order has been confirmed on {new Date(order.verifiedAt).toLocaleString('en-PH')}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload / Re-upload Section */}
              {canResubmit && (
                <div className={order.paymentProofUrl ? 'pt-4 border-t' : ''}>
                  {currentAttempt > 0 && (
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      Upload a new payment proof
                    </p>
                  )}

                  {/* Preview Area */}
                  {previewImage ? (
                    <div className="space-y-4">
                      <div className="relative border-2 border-slate-200 rounded-xl p-4 bg-slate-50/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="w-4 h-4 text-accent-700" />
                          <span className="text-sm font-semibold text-accent-900">Preview — Review before submitting</span>
                        </div>
                        <div className="relative">
                          <img
                            src={previewImage}
                            alt="Proof Preview"
                            className="max-w-full max-h-72 mx-auto rounded-lg shadow-sm"
                          />
                          <button
                            onClick={handleClearPreview}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {previewFile && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            {previewFile.name} • {(previewFile.size / 1024).toFixed(0)} KB
                          </p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleSubmitProof}
                        disabled={uploading}
                        className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2.5 transition-all duration-200 shadow-md ${uploading
                          ? 'bg-gray-400 cursor-wait'
                          : 'btn-accent'
                          }`}
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Attach Proof of Payment
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* File picker area */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-5 border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center gap-2 border-slate-300 hover:border-slate-500 hover:bg-slate-50 cursor-pointer group"
                      >
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition">
                          <Upload className="w-6 h-6 text-slate-500" />
                        </div>
                        <span className="font-semibold text-accent-700">
                          {currentAttempt > 0 ? 'Click to select new payment proof' : 'Click to select payment proof'}
                        </span>
                        <span className="text-xs text-gray-500">JPG, PNG (max 5MB) • You will preview before submitting</span>
                      </button>
                    </>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mt-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {uploadError}
                    </div>
                  )}
                </div>
              )}

              {/* Max attempts reached */}
              {order.paymentStatus === 'cancelled' && currentAttempt >= 3 && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-900 font-semibold mb-1">
                        Order Cancelled
                      </p>
                      <p className="text-sm text-red-800">
                        Maximum upload attempts reached (3 of 3). This order has been automatically cancelled and stock has been restored.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No proof yet and no preview — first upload guidance */}
              {isFirstUpload && !previewImage && (
                <p className="text-gray-500 text-sm mt-3">
                  After completing your payment, upload a screenshot or photo of your payment confirmation above.
                </p>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 sm:sticky sm:top-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </h3>

              {paymentSettings?.qrCodeUrl && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">Scan QR Code</p>
                  <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                    <img
                      src={paymentSettings.qrCodeUrl}
                      alt="Payment QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              {paymentSettings?.gcashNumber && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-blue-700 mb-1">GCash</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 font-mono flex-1">{paymentSettings.gcashNumber}</p>
                    <button
                      onClick={() => copyToClipboard(paymentSettings.gcashNumber)}
                      className="p-1.5 hover:bg-blue-100 rounded transition"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                  {paymentSettings.gcashName && (
                    <p className="text-xs text-gray-600 mt-1">{paymentSettings.gcashName}</p>
                  )}
                </div>
              )}

              {paymentSettings?.payMayaNumber && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-accent-800 mb-1">PayMaya / Maya</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 font-mono flex-1">{paymentSettings.payMayaNumber}</p>
                    <button
                      onClick={() => copyToClipboard(paymentSettings.payMayaNumber)}
                      className="p-1.5 hover:bg-slate-100 rounded transition"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4 text-accent-700" />
                    </button>
                  </div>
                  {paymentSettings.payMayaName && (
                    <p className="text-xs text-gray-600 mt-1">{paymentSettings.payMayaName}</p>
                  )}
                </div>
              )}

              {paymentSettings?.bankName && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-semibold text-green-700 mb-1">Bank Transfer</p>
                  <p className="text-xs text-gray-600 mb-1">{paymentSettings.bankName}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 font-mono flex-1">{paymentSettings.bankAccount}</p>
                    <button
                      onClick={() => copyToClipboard(paymentSettings.bankAccount || '')}
                      className="p-1.5 hover:bg-green-100 rounded transition"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                  {paymentSettings.bankAccountName && (
                    <p className="text-xs text-gray-600 mt-1">{paymentSettings.bankAccountName}</p>
                  )}
                </div>
              )}

              {copied && (
                <div className="mt-4 p-2 bg-green-100 text-green-800 text-xs rounded text-center">
                  Copied to clipboard!
                </div>
              )}

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Please include your order number <strong>#{order.orderNumber}</strong> as the payment reference/note.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;