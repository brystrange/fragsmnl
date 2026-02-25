import React, { useState } from 'react';
import { FileText, ArrowLeft, Clock, CheckCircle, Package, Truck, XCircle, ShoppingBag, Eye, ChevronDown, ChevronUp, ZoomIn, ZoomOut, X } from 'lucide-react';
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

    const getStatusBadge = (status, type = 'order') => {
        const badges = {
            // Payment statuses
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Payment', icon: Clock },
            payment_submitted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Payment Submitted', icon: Package },
            verified: { bg: 'bg-green-100', text: 'text-green-800', label: 'Payment Verified', icon: CheckCircle },
            // Order statuses
            processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Processing', icon: Package },
            shipped: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Shipped', icon: Truck },
            delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered', icon: CheckCircle },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled', icon: XCircle }
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

            <div className="max-w-4xl mx-auto p-6">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {sortedOrders.length} {sortedOrders.length === 1 ? 'order' : 'orders'}
                        </p>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                    >
                        <option value="all">All Orders</option>
                        <option value="pending">Pending Payment</option>
                        <option value="payment_submitted">Payment Submitted</option>
                        <option value="verified">Payment Verified</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                    </select>
                </div>

                {/* Orders List */}
                {sortedOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                            {statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter} orders`}
                        </p>
                        <button
                            onClick={() => navigate('/store')}
                            className="text-purple-600 hover:text-purple-700 font-semibold"
                        >
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

                            return (
                                <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                    {/* Order Header */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-gray-50 transition"
                                        onClick={() => toggleExpand(order.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                                    <ShoppingBag className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        Order #{order.orderNumber || order.id.slice(-8).toUpperCase()}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {formatDate(order.createdAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Status Badges */}
                                                <div className="flex gap-2">
                                                    <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${paymentBadge.bg} ${paymentBadge.text}`}>
                                                        <PaymentIcon className="w-3 h-3" />
                                                        {paymentBadge.label}
                                                    </span>
                                                    {order.orderStatus && order.orderStatus !== 'pending' && (
                                                        <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${orderBadge.bg} ${orderBadge.text}`}>
                                                            <OrderIcon className="w-3 h-3" />
                                                            {orderBadge.label}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Total */}
                                                <span className="font-bold text-purple-600">
                                                    ₱{order.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </span>

                                                {/* Expand Icon */}
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Details (Expanded) */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                                            {/* Items */}
                                            <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                                            <div className="space-y-3 mb-4">
                                                {order.items?.map((item, index) => (
                                                    <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                                                        {item.productImage ? (
                                                            <img
                                                                src={item.productImage}
                                                                alt={item.productName}
                                                                className="w-12 h-12 object-cover rounded"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                                <ShoppingBag className="w-6 h-6 text-gray-300" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{item.productName}</p>
                                                            <p className="text-sm text-gray-500">
                                                                ₱{item.unitPrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {item.quantity}
                                                            </p>
                                                        </div>
                                                        <span className="font-semibold text-gray-900">
                                                            ₱{item.totalPrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Shipping Details */}
                                            {order.shippingDetails && (
                                                <div className="bg-white p-4 rounded-lg mb-4">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Shipping Details</h4>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <p><span className="font-medium">Name:</span> {order.shippingDetails.name}</p>
                                                        <p><span className="font-medium">Phone:</span> {order.shippingDetails.phone}</p>
                                                        {order.shippingDetails.email && (
                                                            <p><span className="font-medium">Email:</span> {order.shippingDetails.email}</p>
                                                        )}
                                                        <p><span className="font-medium">Address:</span> {order.shippingDetails.address}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Payment Proof */}
                                            {order.paymentProofUrl && (
                                                <div className="bg-white p-4 rounded-lg">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Proof of Payment</h4>
                                                    <button
                                                        onClick={() => {
                                                            setProofModal({ isOpen: true, imageUrl: order.paymentProofUrl });
                                                            setZoomLevel(1);
                                                        }}
                                                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Proof of Payment
                                                    </button>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {order.paymentStatus === 'pending' && (
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <button
                                                        onClick={() => navigate(`/payment/${order.id}`)}
                                                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                                                    >
                                                        Complete Payment
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
