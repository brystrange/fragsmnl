import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Download, Eye, FileText, CheckCircle, XCircle, Clock, AlertCircle, MapPin, User, Phone, Mail, Image, Check, DollarSign, Package, ZoomIn, ZoomOut } from 'lucide-react';
import { jsPDF } from 'jspdf';

const OrderManagement = ({ orders, showToast, verifyOrderPayment }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);

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
    const shipping = order.shippingDetails || {};
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FRAGSMNL', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('INVOICE', 105, 28, { align: 'center' });

    // Line under header
    doc.setDrawColor(128, 0, 128);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    // Order Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Number:', 20, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(order.orderNumber, 55, 42);

    doc.setFont('helvetica', 'bold');
    doc.text('Order Date:', 120, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.createdAt).toLocaleString('en-PH'), 145, 42);

    // Customer Info
    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 20, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customerName, 55, 52);

    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 20, 58);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customerEmail, 55, 58);

    // Shipping Details
    doc.setFont('helvetica', 'bold');
    doc.text('SHIPPING DETAILS', 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${shipping.name || 'N/A'}`, 20, 78);
    doc.text(`Phone: ${shipping.phone || 'N/A'}`, 20, 84);
    doc.text(`Address: ${shipping.address || 'N/A'}`, 20, 90);

    // Items Header
    doc.setFillColor(128, 0, 128);
    doc.rect(20, 100, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 22, 105);
    doc.text('Qty', 110, 105);
    doc.text('Unit Price', 130, 105);
    doc.text('Total', 165, 105);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Items
    let yPos = 115;
    order.items.forEach((item) => {
      doc.text(item.productName.substring(0, 40), 22, yPos);
      doc.text(item.quantity.toString(), 110, yPos);
      doc.text(`P${item.unitPrice.toFixed(2)}`, 130, yPos);
      doc.text(`P${item.totalPrice.toFixed(2)}`, 165, yPos);
      yPos += 8;
    });

    // Line before total
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL AMOUNT:', 120, yPos);
    doc.setTextColor(128, 0, 128);
    doc.text(`P${order.totalAmount.toFixed(2)}`, 165, yPos);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // Payment Status
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Status:', 120, yPos);
    doc.setFont('helvetica', 'normal');
    const statusText = order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1).replace('_', ' ');
    doc.text(statusText, 155, yPos);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Thank you for your purchase!', 105, 280, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleString('en-PH')}`, 105, 285, { align: 'center' });

    // Save
    doc.save(`Invoice_${order.orderNumber}.pdf`);
    showToast('Invoice downloaded successfully', 'success');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending' },
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

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.paymentStatus === 'pending').length;
  const paymentSubmittedOrders = orders.filter(o => o.paymentStatus === 'payment_submitted').length;
  const verifiedOrders = orders.filter(o => o.paymentStatus === 'verified').length;
  const totalRevenue = orders.filter(o => o.paymentStatus === 'verified').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalSold = orders.filter(o => o.paymentStatus === 'verified').reduce((total, order) =>
    total + order.items.reduce((sum, item) => sum + (item.quantity || 1), 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">To Verify</p>
              <p className="text-2xl font-bold text-blue-600">{paymentSubmittedOrders}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{verifiedOrders}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sold</p>
              <p className="text-2xl font-bold text-emerald-600">{totalSold}</p>
            </div>
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-purple-600">₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
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
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString('en-PH')}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium">{order.customerName || order.shippingDetails?.name || 'N/A'}</p>
                          <p className="text-gray-600 text-xs break-all">{order.customerEmail || order.shippingDetails?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.items.length}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-purple-600">₱{order.totalAmount.toLocaleString('en-PH')}</td>
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
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                              title="Verify Payment"
                              disabled={verifying}
                            >
                              <Check className="w-4 h-4" />
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
              <h2 className="text-2xl font-bold">Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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

            {/* Payment Proof */}
            {selectedOrder.paymentProofUrl && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                  <Image className="w-4 h-4" />
                  Payment Proof
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
                    <div className="font-semibold text-purple-600">₱{item.totalPrice.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4 flex justify-between mb-6">
              <span className="font-bold">Total</span>
              <span className="font-bold text-purple-600 text-2xl">₱{selectedOrder.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {selectedOrder.paymentStatus === 'payment_submitted' && verifyOrderPayment && (
                <button
                  onClick={() => handleVerifyPayment(selectedOrder.id)}
                  disabled={verifying}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {verifying ? 'Verifying...' : 'Verify Payment'}
                </button>
              )}
              <button onClick={() => downloadInvoice(selectedOrder)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Download className="w-4 h-4" />
                Download Invoice
              </button>
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Close</button>
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
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setZoomLevel(1);
                  setDragPosition({ x: 0, y: 0 });
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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

export default OrderManagement;