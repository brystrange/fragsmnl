import React, { useState } from 'react';
import { FileText, ArrowLeft, Clock, CheckCircle, Package, Truck, XCircle, ShoppingBag, Eye, ChevronDown, ChevronUp, ZoomIn, ZoomOut, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import StoreNavbar from './StoreNavbar';

const MyOrders = ({ user, orders, products, logout, isAdmin, collections, reservations }) => {
    const navigate = useNavigate();
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [proofModal, setProofModal] = useState({ isOpen: false, imageUrl: null });
    const [zoomLevel, setZoomLevel] = useState(1);

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
                label: 'Payment', 
                icon: Clock,
                completed: order.paymentStatus === 'verified' || order.paymentStatus === 'payment_submitted',
                active: order.paymentStatus === 'pending'
            },
            { 
                key: 'processing', 
                label: 'Processing', 
                icon: Package,
                completed: ['shipped', 'delivered'].includes(order.orderStatus),
                active: order.orderStatus === 'processing'
            },
            { 
                key: 'shipped', 
                label: 'Shipped', 
                icon: Truck,
                completed: order.orderStatus === 'delivered',
                active: order.orderStatus === 'shipped'
            },
            { 
                key: 'delivered', 
                label: 'Delivered', 
                icon: CheckCircle,
                completed: order.orderStatus === 'delivered',
                active: false
            }
        ];

        return steps;
    };

    const getStatusBadge = (status, type = 'order') => {
        const badges = {
            // Payment statuses
            pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Pending Payment', icon: Clock },
            payment_submitted: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Payment Submitted', icon: Package },
            verified: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Payment Verified', icon: CheckCircle },
            // Order statuses
            processing: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Processing', icon: Package },
            shipped: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Shipped', icon: Truck },
            delivered: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Delivered', icon: CheckCircle },
            cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Cancelled', icon: XCircle }
        };
        return badges[status] || badges.pending;
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
                        </select>
                    </div>
                </div>

                {/* Orders List */}
                {sortedOrders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter} orders`}
                        </h3>
                        <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
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
                        {sortedOrders.map(order => {
                            const isExpanded = expandedOrder === order.id;
                            const paymentBadge = getStatusBadge(order.paymentStatus, 'payment');
                            const orderBadge = getStatusBadge(order.orderStatus, 'order');
                            const PaymentIcon = paymentBadge.icon;
                            const OrderIcon = orderBadge.icon;
                            const progressSteps = getOrderProgress(order);

                            return (
                                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                                    {/* Order Header */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-gray-900 text-lg">
                                                        Order #{order.orderNumber || order.id.slice(-8).toUpperCase()}
                                                    </h3>
                                                    {order.orderStatus === 'cancelled' && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${orderBadge.bg} ${orderBadge.border} ${orderBadge.text}`}>
                                                            <XCircle className="w-3 h-3" />
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatDate(order.createdAt)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-gray-900">
                                                    ₱{order.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {order.orderStatus !== 'cancelled' && (
                                            <div className="mb-5">
                                                <div className="flex items-center justify-between mb-2">
                                                    {progressSteps.map((step, index) => {
                                                        const StepIcon = step.icon;
                                                        const isLast = index === progressSteps.length - 1;
                                                        
                                                        return (
                                                            <div key={step.key} className="flex items-center flex-1">
                                                                <div className="flex flex-col items-center">
                                                                    {/* Circle */}
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                                                                        step.completed 
                                                                            ? 'bg-green-500 border-green-500' 
                                                                            : step.active 
                                                                                ? 'bg-purple-500 border-purple-500' 
                                                                                : 'bg-gray-100 border-gray-300'
                                                                    }`}>
                                                                        {step.completed ? (
                                                                            <Check className="w-5 h-5 text-white" />
                                                                        ) : (
                                                                            <StepIcon className={`w-5 h-5 ${step.active ? 'text-white' : 'text-gray-400'}`} />
                                                                        )}
                                                                    </div>
                                                                    {/* Label */}
                                                                    <span className={`text-xs mt-2 font-medium text-center ${
                                                                        step.completed || step.active ? 'text-gray-900' : 'text-gray-500'
                                                                    }`}>
                                                                        {step.label}
                                                                    </span>
                                                                </div>
                                                                {/* Connector Line */}
                                                                {!isLast && (
                                                                    <div className={`flex-1 h-0.5 mx-2 ${
                                                                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                                                                    }`} style={{ marginBottom: '32px' }} />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Status Badges */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${paymentBadge.bg} ${paymentBadge.border} ${paymentBadge.text}`}>
                                                <PaymentIcon className="w-3.5 h-3.5" />
                                                {paymentBadge.label}
                                            </span>
                                            {order.orderStatus !== 'pending' && order.orderStatus !== 'cancelled' && (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${orderBadge.bg} ${orderBadge.border} ${orderBadge.text}`}>
                                                    <OrderIcon className="w-3.5 h-3.5" />
                                                    {orderBadge.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-2">
                                            {order.paymentStatus === 'pending' && (
                                                <button
                                                    onClick={() => navigate(`/payment/${order.id}`)}
                                                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                                                >
                                                    Complete Payment
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleExpand(order.id)}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4" />
                                                        Hide Details
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        View Details
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-200 bg-gray-50 p-5">
                                            {/* Order Items */}
                                            <div className="bg-white p-4 rounded-lg mb-4">
                                                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                                                <div className="space-y-3">
                                                    {order.items?.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 pb-3 last:pb-0 last:border-0 border-b border-gray-100">
                                                            {item.productImage ? (
                                                                <img
                                                                    src={item.productImage}
                                                                    alt={item.productName}
                                                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                                                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                                                                </div>
                                                            )}
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
                                                    ))}
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
