import React, { useState, useRef } from 'react';
import { FileText, ArrowLeft, Clock, CheckCircle, Package, Truck, XCircle, ShoppingBag, Eye, ChevronDown, ChevronUp, ZoomIn, ZoomOut, X, Check, CreditCard, Upload, AlertTriangle, Send, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import StoreNavbar from './StoreNavbar';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

const MyOrders = ({ user, orders, products, logout, isAdmin, collections, reservations, updateOrderPaymentProof, showToast, notifications, markNotificationRead, markAllNotificationsRead }) => {
    const navigate = useNavigate();
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [proofModal, setProofModal] = useState({ isOpen: false, imageUrl: null });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [previewOrderId, setPreviewOrderId] = useState(null);
    const fileInputRef = useRef(null);

    // Lock body scroll when proof modal is open
    useModalScrollLock(proofModal.isOpen);

    // Filter orders for the current user
    const userOrders = orders?.filter(order => order.userId === user?.id) || [];

    // Apply status filter
    const filteredOrders = statusFilter === 'all'
        ? userOrders
        : userOrders.filter(order => order.orderStatus === statusFilter || order.paymentStatus === statusFilter);

    // Sort orders by date (newest first)
    const sortedOrders = [...filteredOrders].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Order progress steps
    const getOrderProgress = (order) => {
        const steps = [
            {
                key: 'ordered',
                label: 'Order Placed',
                icon: ShoppingBag,
                completed: true
            },
            {
                key: 'payment',
                label: 'Verifying Payment',
                icon: Clock,
                completed: order.paymentStatus === 'verified',
                active: order.paymentStatus === 'pending' || order.paymentStatus === 'payment_submitted'
            },
            {
                key: 'processing',
                label: 'Processing',
                icon: Package,
                completed: order.orderStatus === 'shipped' || order.orderStatus === 'delivered',
                active: order.orderStatus === 'processing'
            },
            {
                key: 'shipped',
                label: 'Handed to Courier',
                icon: Truck,
                completed: order.orderStatus === 'delivered',
                active: order.orderStatus === 'shipped'
            }
        ];

        return steps;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const toggleExpand = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    // Preview only — don't auto-submit
    const handleFileSelect = (event, orderId) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadError('Please upload an image file');
            showToast?.('Please upload an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size must be less than 5MB');
            showToast?.('File size must be less than 5MB', 'error');
            return;
        }

        setUploadError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewImage(e.target.result);
            setPreviewFile(file);
            setPreviewOrderId(orderId);
        };
        reader.onerror = () => {
            setUploadError('Failed to read file');
            showToast?.('Failed to read file', 'error');
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Submit the previewed proof
    const handleSubmitProof = async () => {
        if (!previewImage || !previewOrderId) return;
        setUploading(true);
        setUploadError(null);
        try {
            const success = await updateOrderPaymentProof(previewOrderId, previewImage);
            if (success) {
                setPreviewImage(null);
                setPreviewFile(null);
                setPreviewOrderId(null);
            }
            setUploading(false);
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError('Failed to upload proof of payment');
            showToast?.('Failed to upload proof of payment', 'error');
            setUploading(false);
        }
    };

    const handleClearPreview = () => {
        setPreviewImage(null);
        setPreviewFile(null);
        setPreviewOrderId(null);
        setUploadError(null);
    };

    // Get product details with image
    const getProductDetails = (item) => {
        const product = products.find(p => p.id === item.productId);
        return {
            ...item,
            imageUrl: item.imageUrl || product?.imageUrl || null
        };
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <StoreNavbar
                collections={collections}
                user={user}
                logout={logout}
                reservations={reservations}
                isAdmin={isAdmin}
                showSearch={false}
                pageTitle="My Orders"
                notifications={notifications}
                markNotificationRead={markNotificationRead}
                markAllNotificationsRead={markAllNotificationsRead}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                </button>

                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Track and manage your orders
                            </p>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none text-sm bg-white"
                        >
                            <option value="all">All Orders ({userOrders.length})</option>
                            <option value="pending">Pending Payment</option>
                            <option value="payment_submitted">Payment Submitted</option>
                            <option value="verified">Payment Verified</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Orders List */}
                {sortedOrders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">No orders found</h2>
                        <p className="text-gray-600 mb-6">
                            {statusFilter === 'all'
                                ? "You haven't placed any orders yet"
                                : `No orders with status: ${statusFilter}`}
                        </p>
                        <button
                            onClick={() => navigate('/store')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-sm font-semibold"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedOrders.map((order) => {
                            const isExpanded = expandedOrder === order.id;
                            const progressSteps = getOrderProgress(order);

                            return (
                                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                                    {/* Order Header */}
                                    <div className="p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                                    Order #{order.orderNumber}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Placed on {formatDate(order.createdAt)}
                                                </p>
                                            </div>

                                            {/* Total Amount */}
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Total Amount</p>
                                                <p className="text-lg font-bold text-slate-600">
                                                    ₱{order.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="relative pt-4 pb-2">
                                            <div className="flex items-center justify-between relative">
                                                {/* Progress Line */}
                                                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" style={{ zIndex: 0 }}>
                                                    <div
                                                        className="h-full bg-slate-600 transition-all duration-500"
                                                        style={{
                                                            width: `${(progressSteps.filter(s => s.completed).length / progressSteps.length) * 100}%`
                                                        }}
                                                    />
                                                </div>

                                                {/* Steps */}
                                                {progressSteps.map((step, index) => {
                                                    const StepIcon = step.icon;
                                                    return (
                                                        <div key={step.key} className="flex flex-col items-center relative" style={{ zIndex: 1, flex: 1 }}>
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all ${step.completed
                                                                ? 'bg-slate-600 border-slate-600 text-white'
                                                                : step.active
                                                                    ? 'bg-white border-slate-600 text-slate-600'
                                                                    : 'bg-white border-gray-300 text-gray-400'
                                                                }`}>
                                                                {step.completed ? (
                                                                    <Check className="w-5 h-5" />
                                                                ) : (
                                                                    <StepIcon className="w-5 h-5" />
                                                                )}
                                                            </div>
                                                            <p className={`text-xs font-medium text-center px-2 ${step.completed || step.active ? 'text-gray-900' : 'text-gray-500'
                                                                }`}>
                                                                {step.label}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Tracking Information */}
                                        {order.trackingNumber && order.courierName && (
                                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-blue-900 mb-1">Tracking Information</h4>
                                                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-blue-700">Courier: </span>
                                                                <span className="font-medium text-blue-900">{order.courierName}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-blue-700">Tracking #: </span>
                                                                <span className="font-mono font-medium text-blue-900">{order.trackingNumber}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Proof Timeline */}
                                        {order.paymentAttempts && order.paymentAttempts.length > 0 && (
                                            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5 text-sm">
                                                    <Clock className="w-4 h-4" />
                                                    Payment Proof Timeline
                                                    <span className="text-xs font-normal text-gray-500 ml-1">
                                                        ({order.paymentAttempts.length} attempt{order.paymentAttempts.length > 1 ? 's' : ''})
                                                    </span>
                                                </h4>
                                                <div className="relative pl-5 space-y-0">
                                                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
                                                    {order.paymentAttempts.map((attempt, index) => {
                                                        const isLatest = index === order.paymentAttempts.length - 1;
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
                                                            <div key={index} className="relative pb-3 last:pb-0">
                                                                <div className={`absolute -left-5 top-2.5 w-[8px] h-[8px] rounded-full ${dotColor} ring-3 z-10`} />
                                                                <div className={`p-2.5 rounded-lg border ${bgColor} ${isLatest ? 'ring-1 ring-offset-1 ring-gray-300' : ''}`}>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-semibold text-xs text-gray-900">
                                                                                {attempt.attemptNumber === 1 ? '1st Attempt' :
                                                                                    attempt.attemptNumber === 2 ? '2nd Attempt' :
                                                                                        'Final Attempt'}
                                                                            </span>
                                                                            {attempt.status === 'approved' && (
                                                                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                                                                                    <CheckCircle className="w-2.5 h-2.5" />
                                                                                    Approved
                                                                                </span>
                                                                            )}
                                                                            {attempt.status === 'declined' && (
                                                                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                                                                                    <XCircle className="w-2.5 h-2.5" />
                                                                                    Declined
                                                                                </span>
                                                                            )}
                                                                            {attempt.status === 'pending' && (
                                                                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                                                                                    <Clock className="w-2.5 h-2.5" />
                                                                                    Pending
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => setProofModal({ isOpen: true, imageUrl: attempt.proofUrl })}
                                                                            className="text-slate-600 hover:text-slate-800 text-[10px] underline font-medium"
                                                                        >
                                                                            View
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {new Date(attempt.uploadedAt).toLocaleString('en-PH')}
                                                                        {attempt.declinedAt && (
                                                                            <span className="text-red-600 ml-2">• Declined {new Date(attempt.declinedAt).toLocaleString('en-PH')}</span>
                                                                        )}
                                                                        {attempt.approvedAt && (
                                                                            <span className="text-green-600 ml-2">• Approved {new Date(attempt.approvedAt).toLocaleString('en-PH')}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Declined - Re-upload Notice */}
                                        {order.paymentStatus === 'pending' && order.currentAttempt > 0 && order.currentAttempt < 3 && (
                                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-red-900 mb-1">Payment Proof Declined</h4>
                                                        <p className="text-sm text-red-800 mb-2">
                                                            Your previous proof was declined.
                                                        </p>

                                                        {/* Attempt Counter */}
                                                        <div className="mb-3">
                                                            <div className="flex items-center justify-between text-xs mb-1">
                                                                <span className="font-semibold text-red-900">Upload Attempts</span>
                                                                <span className="font-medium text-red-700">{order.currentAttempt} of 3 used</span>
                                                            </div>
                                                            <div className="w-full bg-red-100 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${(order.currentAttempt / 3) * 100}%`,
                                                                        background: order.currentAttempt >= 2
                                                                            ? 'linear-gradient(90deg, #f87171, #dc2626)'
                                                                            : 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-red-600 mt-1 font-medium">
                                                                {3 - order.currentAttempt} attempt{3 - order.currentAttempt > 1 ? 's' : ''} remaining before order cancellation
                                                                {order.currentAttempt === 2 && ' — This is your final attempt!'}
                                                            </p>
                                                        </div>

                                                        {/* Preview area */}
                                                        {previewImage && previewOrderId === order.id ? (
                                                            <div className="space-y-3">
                                                                <div className="relative border border-slate-200 rounded-lg p-3 bg-slate-50/30">
                                                                    <div className="flex items-center gap-1.5 mb-2">
                                                                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                                                                        <span className="text-xs font-semibold text-slate-800">Preview</span>
                                                                    </div>
                                                                    <img src={previewImage} alt="Preview" className="max-w-full max-h-48 mx-auto rounded-lg shadow-sm" />
                                                                    <button
                                                                        onClick={handleClearPreview}
                                                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                    {previewFile && (
                                                                        <p className="text-[10px] text-gray-500 mt-1.5 text-center">{previewFile.name} • {(previewFile.size / 1024).toFixed(0)} KB</p>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={handleSubmitProof}
                                                                    disabled={uploading}
                                                                    className={`w-full py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all text-sm ${uploading
                                                                        ? 'bg-gray-400 cursor-wait'
                                                                        : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-md hover:shadow-lg'
                                                                        }`}
                                                                >
                                                                    {uploading ? (
                                                                        <>
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                                                            Submitting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Send className="w-4 h-4" />
                                                                            Attach Proof of Payment
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <input
                                                                    ref={fileInputRef}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleFileSelect(e, order.id)}
                                                                    className="hidden"
                                                                />
                                                                <button
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 text-slate-700 rounded-lg hover:border-slate-500 hover:bg-slate-50 transition text-sm font-medium"
                                                                >
                                                                    <Upload className="w-4 h-4" />
                                                                    Select New Proof Image
                                                                </button>
                                                            </>
                                                        )}

                                                        {uploadError && (
                                                            <div className="p-2 bg-red-100 text-red-700 rounded-lg text-xs mt-2 flex items-center gap-1.5">
                                                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                                {uploadError}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Order Cancelled Notice */}
                                        {order.paymentStatus === 'cancelled' && order.cancellationReason && (
                                            <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-red-900 mb-1">Order Cancelled</h4>
                                                        <p className="text-sm text-red-800">
                                                            {order.cancellationReason}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            {/* See Order Details Button */}
                                            <button
                                                onClick={() => toggleExpand(order.id)}
                                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4" />
                                                        Hide Details
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        See Order Details
                                                    </>
                                                )}
                                            </button>

                                            {/* Complete Payment Button - Only show if payment is pending */}
                                            {order.paymentStatus === 'pending' && (
                                                <button
                                                    onClick={() => navigate(`/payment/${order.id}`)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                    Complete Payment
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-200 bg-gray-50 p-6">
                                            {/* Order Items */}
                                            <div className="mb-4">
                                                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                                                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                                                    {order.items.map((item, idx) => {
                                                        const itemWithImage = getProductDetails(item);
                                                        return (
                                                            <div key={idx} className="p-4 flex items-center gap-4">
                                                                {itemWithImage.imageUrl ? (
                                                                    <img
                                                                        src={itemWithImage.imageUrl}
                                                                        alt={item.productName}
                                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.style.display = 'none';
                                                                            e.target.nextElementSibling.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                <div
                                                                    className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center"
                                                                    style={{ display: itemWithImage.imageUrl ? 'none' : 'flex' }}
                                                                >
                                                                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                                                                    <p className="text-sm text-gray-600">
                                                                        ₱{item.unitPrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {item.quantity}
                                                                    </p>
                                                                </div>
                                                                <span className="font-semibold text-gray-900 text-lg">
                                                                    ₱{item.totalPrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Shipping Details */}
                                            {order.shippingDetails && (
                                                <div className="bg-white p-4 rounded-lg mb-4">
                                                    <h4 className="font-semibold text-gray-900 mb-3">Shipping Information</h4>
                                                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-gray-600">Name</p>
                                                            <p className="font-medium text-gray-900">{order.shippingDetails.name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-600">Phone</p>
                                                            <p className="font-medium text-gray-900">{order.shippingDetails.phone}</p>
                                                        </div>
                                                        {order.shippingDetails.email && (
                                                            <div className="sm:col-span-2">
                                                                <p className="text-gray-600">Email</p>
                                                                <p className="font-medium text-gray-900">{order.shippingDetails.email}</p>
                                                            </div>
                                                        )}
                                                        <div className="sm:col-span-2">
                                                            <p className="text-gray-600">Delivery Address</p>
                                                            <p className="font-medium text-gray-900">{order.shippingDetails.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Payment Proof */}
                                            {order.paymentProofUrl && (
                                                <div className="bg-white p-4 rounded-lg">
                                                    <h4 className="font-semibold text-gray-900 mb-3">Proof of Payment</h4>
                                                    <button
                                                        onClick={() => {
                                                            setProofModal({ isOpen: true, imageUrl: order.paymentProofUrl });
                                                            setZoomLevel(1);
                                                        }}
                                                        className="flex items-center gap-2 text-slate-600 hover:text-slate-700 font-medium text-sm"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Proof of Payment
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Proof of Payment Modal */}
            {proofModal.isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
                    onClick={() => setProofModal({ isOpen: false, imageUrl: null })}
                >
                    <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <button
                            onClick={() => setProofModal({ isOpen: false, imageUrl: null })}
                            className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Image Container */}
                        <div
                            className="overflow-auto max-h-[80vh] bg-gray-900 rounded-lg p-4 flex items-center justify-center"
                            style={{ cursor: zoomLevel > 1 ? 'zoom-out' : 'zoom-in' }}
                        >
                            <img
                                src={proofModal.imageUrl}
                                alt="Proof of Payment"
                                className="transition-transform duration-200 rounded"
                                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                                onClick={() => setZoomLevel(prev => prev > 1 ? 1 : 2)}
                            />
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex justify-center gap-3 mt-4">
                            <button
                                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 transition"
                                disabled={zoomLevel <= 0.5}
                            >
                                <ZoomOut className="w-4 h-4" />
                                Zoom Out
                            </button>
                            <span className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg">
                                {Math.round(zoomLevel * 100)}%
                            </span>
                            <button
                                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 transition"
                                disabled={zoomLevel >= 3}
                            >
                                <ZoomIn className="w-4 h-4" />
                                Zoom In
                            </button>
                            <button
                                onClick={() => setProofModal({ isOpen: false, imageUrl: null })}
                                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MyOrders;