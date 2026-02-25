import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Download, Eye, FileText, CheckCircle, XCircle, Clock, AlertCircle, MapPin, User, Phone, Mail, Image, Check, DollarSign, Package, ZoomIn, ZoomOut, Truck, Edit2, Save, X as XIcon, Ban } from 'lucide-react';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

const OrderManagement = ({ orders, showToast, verifyOrderPayment, declineOrderPayment, updateOrderTracking, invoiceSettings, paymentSettings, timeSettings, adminCancelOrder }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);

  // Tracking information state
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingData, setTrackingData] = useState({
    trackingNumber: '',
    courierName: ''
  });
  const [savingTracking, setSavingTracking] = useState(false);

  // Cancel order state
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Lock body scroll when modals are open
  useModalScrollLock(selectedOrder !== null);
  useModalScrollLock(showProofModal);

  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (order.orderNumber?.toLowerCase() || '').includes(searchLower) ||
      (order.customerName?.toLowerCase() || '').includes(searchLower) ||
      (order.customerEmail?.toLowerCase() || '').includes(searchLower);
    const matchesStatus = statusFilter === 'all' || order.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const downloadInvoice = (order) => {
    generateInvoicePDF(order, { invoiceSettings, paymentSettings, timeSettings });
    showToast('Invoice downloaded successfully', 'success');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending Payment' },
      payment_submitted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'Payment Submitted' },
      verified: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Verified' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Cancelled' }
    };
    return badges[status] || badges.pending;
  };

  const handleVerifyPayment = async (orderId) => {
    if (!verifyOrderPayment) return;
    setVerifying(true);
    await verifyOrderPayment(orderId);
    setVerifying(false);
    setSelectedOrder(null);
  };

  const handleDeclinePayment = async (orderId) => {
    if (!declineOrderPayment) return;
    setDeclining(true);
    await declineOrderPayment(orderId);
    setDeclining(false);
    setSelectedOrder(null);
  };

  const handleEditTracking = (order) => {
    setEditingTracking(true);
    setTrackingData({
      trackingNumber: order.trackingNumber || '',
      courierName: order.courierName || ''
    });
  };

  const handleSaveTracking = async () => {
    if (!updateOrderTracking || !selectedOrder) return;

    if (!trackingData.trackingNumber.trim() || !trackingData.courierName.trim()) {
      showToast('Please fill in both tracking number and courier name', 'error');
      return;
    }

    setSavingTracking(true);
    try {
      await updateOrderTracking(selectedOrder.id, trackingData);
      showToast('Tracking information updated successfully', 'success');
      setEditingTracking(false);
      setSelectedOrder({
        ...selectedOrder,
        trackingNumber: trackingData.trackingNumber,
        courierName: trackingData.courierName
      });
    } catch (error) {
      showToast('Failed to update tracking information', 'error');
    } finally {
      setSavingTracking(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTracking(false);
    setTrackingData({
      trackingNumber: selectedOrder?.trackingNumber || '',
      courierName: selectedOrder?.courierName || ''
    });
  };

  const handleCancelOrder = async () => {
    if (!adminCancelOrder || !cancelModalOrder) return;
    if (!cancelReason.trim()) {
      showToast('Please provide a reason for cancellation', 'error');
      return;
    }
    setCancelling(true);
    await adminCancelOrder(cancelModalOrder.id, cancelReason.trim());
    setCancelling(false);
    setCancelModalOrder(null);
    setCancelReason('');
    setSelectedOrder(null);
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.paymentStatus === 'pending').length;
  const paymentSubmittedOrders = orders.filter(o => o.paymentStatus === 'payment_submitted').length;
  const verifiedOrders = orders.filter(o => o.paymentStatus === 'verified').length;
  const totalRevenue = orders.filter(o => o.paymentStatus === 'verified').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalSold = orders.filter(o => o.paymentStatus === 'verified').reduce((total, order) =>
    total + order.items.reduce((sum, item) => sum + (item.quantity || 1), 0), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-lg font-bold text-gray-900">{totalOrders}</p>
              </div>
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payment</p>
                <p className="text-lg font-bold text-yellow-600">{pendingOrders}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">To Verify</p>
                <p className="text-lg font-bold text-blue-600">{paymentSubmittedOrders}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-lg font-bold text-green-600">{verifiedOrders}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sold</p>
                <p className="text-lg font-bold text-emerald-600">{totalSold}</p>
              </div>
              <Package className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-lg font-bold text-slate-600">₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="w-8 h-8 text-slate-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order number, customer..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Payment</option>
              <option value="payment_submitted">Payment Submitted</option>
              <option value="verified">Verified</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proof</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No orders found</td></tr>
                ) : (
                  filteredOrders.map(order => {
                    const badge = getStatusBadge(order.paymentStatus);
                    const StatusIcon = badge.icon;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><span className="font-mono text-sm font-medium">{order.orderNumber || `ORD-${order.id.slice(-8).toUpperCase()}`}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleString('en-PH')}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium">{order.customerName || order.shippingDetails?.name || 'N/A'}</p>
                            <p className="text-gray-600 text-xs break-all">{order.customerEmail || order.shippingDetails?.email || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.items.length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600">₱{order.totalAmount.toLocaleString('en-PH')}</td>
                        <td className="px-4 py-3">
                          {order.paymentProofUrl ? (
                            <button
                              onClick={() => { setSelectedOrder(order); setShowProofModal(true); }}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Image className="w-4 h-4" />
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedOrder(order); setShowProofModal(false); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => downloadInvoice(order)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Download Invoice">
                              <Download className="w-4 h-4" />
                            </button>
                            {order.paymentStatus === 'payment_submitted' && verifyOrderPayment && (
                              <button
                                onClick={() => handleVerifyPayment(order.id)}
                                className="p-2 text-slate-600 hover:bg-slate-50 rounded"
                                title="Verify Payment"
                                disabled={verifying}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {order.paymentStatus === 'payment_submitted' && declineOrderPayment && (
                              <button
                                onClick={() => handleDeclinePayment(order.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Decline Payment"
                                disabled={declining}
                              >
                                <XIcon className="w-4 h-4" />
                              </button>
                            )}
                            {order.paymentStatus !== 'cancelled' && order.paymentStatus !== 'verified' && adminCancelOrder && (
                              <button
                                onClick={() => { setCancelModalOrder(order); setCancelReason(''); }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Cancel Order"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        {selectedOrder && !showProofModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between mb-6">
                <h2 className="text-lg font-bold">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Number</p>
                  <p className="font-mono font-semibold">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString('en-PH')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-medium">{selectedOrder.customerEmail}</p>
                </div>
              </div>

              {/* Shipping Details */}
              {selectedOrder.shippingDetails && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Shipping Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Name</p>
                        <p className="font-medium">{selectedOrder.shippingDetails.name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium">{selectedOrder.shippingDetails.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600">Address</p>
                        <p className="font-medium">{selectedOrder.shippingDetails.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Information Section */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2 text-blue-900">
                    <Truck className="w-4 h-4" />
                    Tracking Information
                  </h3>
                  {!editingTracking && updateOrderTracking && (
                    <button
                      onClick={() => handleEditTracking(selectedOrder)}
                      className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {selectedOrder.trackingNumber ? 'Edit' : 'Add'}
                    </button>
                  )}
                </div>

                {editingTracking ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">
                        Courier Name
                      </label>
                      <input
                        type="text"
                        value={trackingData.courierName}
                        onChange={(e) => setTrackingData({ ...trackingData, courierName: e.target.value })}
                        placeholder="e.g., LBC, J&T, JRS, Ninja Van"
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={trackingData.trackingNumber}
                        onChange={(e) => setTrackingData({ ...trackingData, trackingNumber: e.target.value })}
                        placeholder="Enter tracking number"
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveTracking}
                        disabled={savingTracking}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {savingTracking ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={savingTracking}
                        className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {selectedOrder.trackingNumber && selectedOrder.courierName ? (
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-blue-700">Courier</p>
                          <p className="font-medium text-blue-900">{selectedOrder.courierName}</p>
                        </div>
                        <div>
                          <p className="text-blue-700">Tracking Number</p>
                          <p className="font-mono font-medium text-blue-900">{selectedOrder.trackingNumber}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-700 italic">No tracking information added yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Proof */}
              {selectedOrder.paymentProofUrl && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                    <Image className="w-4 h-4" />
                    Payment Proof (Current)
                  </h3>
                  <img
                    src={selectedOrder.paymentProofUrl}
                    alt="Payment Proof"
                    className="max-w-full max-h-48 rounded-lg shadow cursor-pointer"
                    onClick={() => setShowProofModal(true)}
                  />
                  {selectedOrder.paymentProofUploadedAt && (
                    <p className="text-xs text-gray-600 mt-2">
                      Uploaded: {new Date(selectedOrder.paymentProofUploadedAt).toLocaleString('en-PH')}
                    </p>
                  )}
                </div>
              )}

              {/* Payment Proof Timeline */}
              {selectedOrder.paymentAttempts && selectedOrder.paymentAttempts.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800">
                    <Clock className="w-4 h-4" />
                    Payment Proof Timeline
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      ({selectedOrder.paymentAttempts.length} attempt{selectedOrder.paymentAttempts.length > 1 ? 's' : ''})
                    </span>
                  </h3>

                  {/* Attempt Counter Bar */}
                  {selectedOrder.currentAttempt > 0 && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-gray-700">Attempts Used</span>
                        <span className="font-medium text-gray-600">
                          {selectedOrder.currentAttempt} of 3
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${((selectedOrder.currentAttempt || 0) / 3) * 100}%`,
                            background: selectedOrder.currentAttempt >= 3
                              ? '#dc2626'
                              : selectedOrder.currentAttempt >= 2
                                ? 'linear-gradient(90deg, #f87171, #dc2626)'
                                : 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="relative pl-6 space-y-0">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

                    {selectedOrder.paymentAttempts.map((attempt, index) => {
                      const isLatest = index === selectedOrder.paymentAttempts.length - 1;
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
                          <div className={`absolute -left-6 top-3 w-[10px] h-[10px] rounded-full ${dotColor} ring-4 z-10`} />

                          <div className={`p-3 rounded-lg border ${bgColor} ${isLatest ? 'ring-1 ring-offset-1 ring-gray-300' : ''}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-900">
                                  {attempt.attemptNumber === 1 ? '1st Attempt' :
                                    attempt.attemptNumber === 2 ? '2nd Attempt' :
                                      'Final Attempt'}
                                </span>
                                {attempt.status === 'approved' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    <CheckCircle className="w-3 h-3" />
                                    Approved
                                  </span>
                                )}
                                {attempt.status === 'declined' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    <XCircle className="w-3 h-3" />
                                    Declined
                                  </span>
                                )}
                                {attempt.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    <Clock className="w-3 h-3" />
                                    Pending Review
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setShowProofModal(true);
                                  setSelectedOrder({ ...selectedOrder, paymentProofUrl: attempt.proofUrl });
                                }}
                                className="text-xs text-slate-600 hover:text-slate-800 font-medium underline"
                              >
                                View Proof
                              </button>
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

                  {selectedOrder.currentAttempt >= 3 && selectedOrder.paymentStatus === 'cancelled' && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">
                        ⚠️ Order automatically cancelled after 3 failed payment proof attempts. Stock has been restored.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="p-3 flex justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-600">₱{item.unitPrice.toFixed(2)} × {item.quantity}</p>
                      </div>
                      <div className="font-semibold text-slate-600 pl-4 whitespace-nowrap">₱{item.totalPrice.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4 flex justify-between mb-6">
                <span className="font-bold">Total</span>
                <span className="font-bold text-slate-600 text-lg">₱{selectedOrder.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Cancellation Reason */}
              {selectedOrder.paymentStatus === 'cancelled' && selectedOrder.cancellationReason && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
                    <Ban className="w-4 h-4" />
                    Cancellation Reason
                  </h3>
                  <p className="text-sm text-red-700">{selectedOrder.cancellationReason}</p>
                  {selectedOrder.cancelledAt && (
                    <p className="text-xs text-red-500 mt-2">
                      Cancelled on: {new Date(selectedOrder.cancelledAt).toLocaleString('en-PH')}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <button onClick={() => downloadInvoice(selectedOrder)} className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium">
                  <Download className="w-4 h-4" />
                  Download Invoice
                </button>
                {selectedOrder.paymentStatus !== 'cancelled' && selectedOrder.paymentStatus !== 'verified' && adminCancelOrder && (
                  <button
                    onClick={() => { setCancelModalOrder(selectedOrder); setCancelReason(''); }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Order
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="ml-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Close</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Payment Proof Full View Modal */}
        {/* Proof Modal with Zoom and Drag */}
        {showProofModal && selectedOrder?.paymentProofUrl && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => {
              setShowProofModal(false);
              setZoomLevel(1);
              setDragPosition({ x: 0, y: 0 });
            }}
          >
            <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              {/* Image Container */}
              <div
                ref={imageContainerRef}
                className="overflow-hidden rounded-lg bg-gray-900 p-2 flex items-center justify-center"
                style={{
                  maxHeight: '70vh',
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                }}
                onMouseDown={(e) => {
                  if (zoomLevel > 1) {
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (isDragging && zoomLevel > 1) {
                    setDragPosition({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y
                    });
                  }
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              >
                <img
                  src={selectedOrder.paymentProofUrl}
                  alt="Payment Proof"
                  className="max-w-full max-h-[65vh] rounded transition-transform duration-200 select-none"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${dragPosition.x / zoomLevel}px, ${dragPosition.y / zoomLevel}px)`,
                    transformOrigin: 'center'
                  }}
                  draggable={false}
                  onClick={() => {
                    if (zoomLevel === 1) {
                      setZoomLevel(2);
                    }
                  }}
                />
              </div>

              {/* Zoom Controls */}
              <div className="mt-4 flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setZoomLevel(prev => Math.max(0.5, prev - 0.25));
                    if (zoomLevel <= 1.25) setDragPosition({ x: 0, y: 0 });
                  }}
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
                {selectedOrder.paymentStatus === 'payment_submitted' && verifyOrderPayment && (
                  <button
                    onClick={() => handleVerifyPayment(selectedOrder.id)}
                    disabled={verifying}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {verifying ? 'Verifying...' : 'Verify Payment'}
                  </button>
                )}
                {selectedOrder.paymentStatus === 'payment_submitted' && declineOrderPayment && (
                  <button
                    onClick={() => handleDeclinePayment(selectedOrder.id)}
                    disabled={declining}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {declining ? 'Declining...' : 'Decline Proof'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProofModal(false);
                    setZoomLevel(1);
                    setDragPosition({ x: 0, y: 0 });
                  }}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Cancel Order Reason Modal */}
      {cancelModalOrder && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Cancel Order</h3>
                <p className="text-sm text-gray-500">Order #{cancelModalOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This will cancel the order, restore stock, and notify the customer. This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Out of stock, Customer request, Fraudulent order..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCancelModalOrder(null); setCancelReason(''); }}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OrderManagement;