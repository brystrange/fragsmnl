import React, { useEffect, useState, useRef } from 'react';
import { QrCode, CreditCard, Download, Check, ArrowLeft, Copy, Upload, MapPin, User, Phone, Mail, Image, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import StoreNavbar from './StoreNavbar';

const PaymentPage = ({ orders, paymentSettings, user, logout, isAdmin, collections, reservations, updateOrderPaymentProof }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
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
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
    const shipping = order.shippingDetails || {};
    const invoiceContent = `
FRAGSMNL - INVOICE
==========================================

Order Number: ${order.orderNumber}
Order Date: ${new Date(order.createdAt).toLocaleString('en-PH')}
Customer: ${order.customerName}
Email: ${order.customerEmail}

SHIPPING DETAILS:
Name: ${shipping.name || 'N/A'}
Phone: ${shipping.phone || 'N/A'}
Address: ${shipping.address || 'N/A'}

------------------------------------------
ITEMS:
${order.items.map((item, i) => `
${i + 1}. ${item.productName}
   Quantity: ${item.quantity}
   Unit Price: ₱${item.unitPrice.toFixed(2)}
   Total: ₱${item.totalPrice.toFixed(2)}
`).join('')}
------------------------------------------

TOTAL AMOUNT: ₱${order.totalAmount.toFixed(2)}

Payment Status: ${order.paymentStatus}

==========================================
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileSelect = async (e) => {
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

    setUploading(true);
    setUploadError(null);

    try {
      // Convert to base64 for storage (simple approach without Firebase Storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        const success = await updateOrderPaymentProof(orderId, base64String);
        setUploading(false);
        if (!success) {
          setUploadError('Failed to upload. Please try again.');
        }
      };
      reader.onerror = () => {
        setUploading(false);
        setUploadError('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setUploadError('An error occurred. Please try again.');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
            <Clock className="w-4 h-4" />
            Pending Payment
          </span>
        );
      case 'payment_submitted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            <AlertCircle className="w-4 h-4" />
            Payment Submitted - Awaiting Verification
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            <CheckCircle className="w-4 h-4" />
            Payment Verified
          </span>
        );
      default:
        return (
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
            {status}
          </span>
        );
    }
  };

  const shipping = order.shippingDetails || {};

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
      />

      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => navigate('/store')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </button>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-green-900 mb-2">Order Created Successfully!</h2>
            <p className="text-green-800">
              Your order has been created. Please complete the payment using the details below and upload your proof of payment.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Invoice & Shipping Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
                  <p className="text-sm text-gray-600 mt-1">Order #{order.orderNumber}</p>
                </div>
                <button
                  onClick={downloadInvoice}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('en-PH')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  {getStatusBadge(order.paymentStatus)}
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-b border-gray-200 py-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-gray-600">₱{item.unitPrice.toFixed(2)} × {item.quantity}</p>
                      </div>
                      <div className="text-right font-medium">
                        ₱{item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-purple-600 text-2xl">
                  ₱{order.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Shipping Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Recipient Name</p>
                    <p className="font-medium">{shipping.name || order.customerName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-600">Phone</p>
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

            {/* Proof of Payment Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Proof of Payment
              </h3>

              {order.paymentProofUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Payment proof uploaded</span>
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
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Awaiting verification:</strong> The seller will review your payment proof and verify your order.
                      </p>
                    </div>
                  )}
                  {order.paymentStatus === 'verified' && order.verifiedAt && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Payment verified!</strong> Your order has been confirmed on {new Date(order.verifiedAt).toLocaleString('en-PH')}.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    After completing your payment, upload a screenshot or photo of your payment confirmation.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`w-full py-4 border-2 border-dashed rounded-lg transition flex flex-col items-center gap-2 ${uploading
                      ? 'border-gray-300 bg-gray-50 cursor-wait'
                      : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer'
                      }`}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="text-gray-600">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-purple-500" />
                        <span className="font-medium text-purple-600">Click to upload payment proof</span>
                        <span className="text-xs text-gray-500">JPG, PNG (max 5MB)</span>
                      </>
                    )}
                  </button>

                  {uploadError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {uploadError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
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
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-semibold text-purple-700 mb-1">PayMaya / Maya</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 font-mono flex-1">{paymentSettings.payMayaNumber}</p>
                    <button
                      onClick={() => copyToClipboard(paymentSettings.payMayaNumber)}
                      className="p-1.5 hover:bg-purple-100 rounded transition"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4 text-purple-600" />
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