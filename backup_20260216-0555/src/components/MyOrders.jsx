import React, { useState, useRef } from 'react';
import { FileText, ArrowLeft, Clock, CheckCircle, Package, Truck, XCircle, ShoppingBag, Eye, ChevronDown, ChevronUp, ZoomIn, ZoomOut, X, Check, CreditCard, Upload, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import StoreNavbar from './StoreNavbar';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

const MyOrders = ({ user, orders, products, logout, isAdmin, collections, reservations, updateOrderPaymentProof, showToast }) => {
    const navigate = useNavigate();
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [proofModal, setProofModal] = useState({ isOpen: false, imageUrl: null });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
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

    const handleFileUpload = async (event, orderId) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please upload an image file');
            showToast?.('Please upload an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size must be less than 5MB');
            showToast?.('File size must be less than 5MB', 'error');
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64String = e.target.result;
                const success = await updateOrderPaymentProof(orderId, base64String);
                
                if (success) {
                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
                setUploading(false);
            };
            reader.onerror = () => {
                setUploadError('Failed to read file');
                showToast?.('Failed to read file', 'error');
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError('Failed to upload proof of payment');
            showToast?.('Failed to upload proof of payment', 'error');
            setUploading(false);
        }
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
                            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Track and manage your orders
                            </p>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-white"
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
                        <p className="text-gray-600 mb-6">
                            {statusFilter === 'all'
                                ? "You haven't placed any orders yet"
                                : `No orders with status: ${statusFilter}`}
                        </p>
                        <button
                            onClick={() => navigate('/store')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
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
                                                <p className="text-2xl font-bold text-purple-600">
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
                                                        className="h-full bg-purple-600 transition-all duration-500"
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
                                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                                : step.active
                                                                    ? 'bg-white border-purple-600 text-purple-600'
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

                                        {/* Payment Attempts Information */}
                                        {order.paymentAttempts && order.paymentAttempts.length > 0 && (
                                            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <CreditCard className="w-5 h-5 text-gray-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900 mb-2">Payment Proof History</h4>
                                                        <div className="space-y-2">
                                                            {order.paymentAttempts.map((attempt, index) => (
                                                                <div key={index} className={`flex items-center justify-between text-sm p-2 rounded ${
                                                                    attempt.status === 'approved' ? 'bg-green-50 border border-green-200' :
                                                                    attempt.status === 'declined' ? 'bg-red-50 border border-red-200' :
                                                                    'bg-blue-50 border border-blue-200'
                                                                }`}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">
                                                                            {attempt.attemptNumber === 1 ? '1st Attempt' :
                                                                             attempt.attemptNumber === 2 ? '2nd Attempt' :
                                                                             'Final Attempt'}
                                                                        </span>
                                                                        {attempt.status === 'approved' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                                        {attempt.status === 'declined' && <XCircle className="w-4 h-4 text-red-600" />}
                                                                        {attempt.status === 'pending' && <Clock className="w-4 h-4 text-blue-600" />}
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`text-xs ${
                                                                            attempt.status === 'approved' ? 'text-green-700' :
                                                                            attempt.status === 'declined' ? 'text-red-700' :
                                                                            'text-blue-700'
                                                                        }`}>
                                                                            {attempt.status === 'approved' ? 'Approved' :
                                                                             attempt.status === 'declined' ? 'Declined' :
                                                                             'Pending Review'}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => setProofModal({ isOpen: true, imageUrl: attempt.proofUrl })}
                                                                            className="text-purple-600 hover:text-purple-800 text-xs underline"
                                                                        >
                                                                            View Proof
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Declined - Re-upload Notice */}
                                        {order.paymentStatus === 'pending' && order.currentAttempt > 0 && order.currentAttempt < 3 && (
                                            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-yellow-900 mb-1">Payment Proof Declined</h4>
                                                        <p className="text-sm text-yellow-800 mb-3">
                                                            Your previous payment proof was declined. You have <strong>{3 - order.currentAttempt}</strong> attempt{3 - order.currentAttempt > 1 ? 's' : ''} remaining.
                                                            {order.currentAttempt === 2 && ' This is your final attempt!'}
                                                        </p>
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileUpload(e, order.id)}
                                                            className="hidden"
                                                            disabled={uploading}
                                                        />
                                                        <button
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={uploading}
                                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition text-sm font-medium"
                                                        >
                                                            <Upload className="w-4 h-4" />
                                                            {uploading ? 'Uploading...' : 'Upload New Proof'}
                                                        </button>
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
                                                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
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
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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