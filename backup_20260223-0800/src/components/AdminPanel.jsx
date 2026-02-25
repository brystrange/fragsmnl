import React, { useState, useEffect } from 'react';
import { Package, Plus, LogOut, Eye, Image, X, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, Save, Clock, Upload, Download, Users, ShoppingCart, Search, Filter, PackageX, ShoppingBag, FileText, Settings as SettingsIcon, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTimeRemaining } from '../utils/timeHelpers';
import OrderManagement from './OrderManagement';
import Settings from './Settings';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message, itemCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>

        <p className="text-gray-600 mb-2">{message}</p>

        {itemCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ This will permanently delete {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 btn-danger"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({
  collections,
  products,
  addCollection,
  addProduct,
  updateProduct,
  deleteProducts,
  deleteCollection,
  logout,
  reservations,
  showToast,
  updateCollection,
  orders = [],
  paymentSettings,
  updatePaymentSettings,
  verifyOrderPayment,
  declineOrderPayment,
  updateOrderTracking,
  timeSettings,
  updateTimeSettings,
  invoiceSettings,
  updateInvoiceSettings,
  adminCancelOrder
}) => {
  const navigate = useNavigate();
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [expandedCollections, setExpandedCollections] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, data: null });
  const [activeTab, setActiveTab] = useState('published');
  const [activeMainTab, setActiveMainTab] = useState('products'); // 'products', 'reservations', 'orders', or 'settings'

  // Lock body scroll when modals are open
  useModalScrollLock(deleteModal.isOpen);
  useModalScrollLock(showCollectionForm);
  useModalScrollLock(showProductForm);

  // Reservation filters
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState('all'); // 'all', 'active', 'expired'

  const [collectionForm, setCollectionForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    status: 'published',
    scheduledDate: '',
    scheduledTime: ''
  });

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    totalStock: '',
    imageUrl: '',
    collectionId: ''
  });

  const [collectionImagePreview, setCollectionImagePreview] = useState('');
  const [productImagePreview, setProductImagePreview] = useState('');
  const [collectionImageError, setCollectionImageError] = useState(false);
  const [productImageError, setProductImageError] = useState(false);

  // Real-time timer update - force re-render every second for countdown
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Auto-publish scheduled collections
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      collections.forEach(collection => {
        if (collection.status === 'scheduled' && collection.scheduledDateTime) {
          const scheduledTime = new Date(collection.scheduledDateTime);
          if (scheduledTime <= now) {
            updateCollection(collection.id, { status: 'published' });
            showToast(`Collection "${collection.name}" has been published!`, 'success');
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [collections, updateCollection, showToast]);

  // CSV Export Function
  const exportReservationsToCSV = () => {
    // Get filtered reservations
    const dataToExport = getFilteredReservations();

    if (dataToExport.length === 0) {
      showToast('No reservations to export', 'warning');
      return;
    }

    // Define CSV headers
    const headers = [
      'Reservation Date',
      'Customer Name',
      'Customer Email',
      'Product Name',
      'Quantity',
      'Unit Price',
      'Total Price',
      'Status',
      'Expires At',
      'Time Remaining'
    ];

    // Convert data to CSV rows
    const rows = dataToExport.map(reservation => {
      const product = products.find(p => p.id === reservation.productId);
      const unitPrice = product?.price || 0;
      const totalPrice = unitPrice * (reservation.quantity || 1);
      const status = reservation.status === 'expired' ? 'Expired' : 'Active';

      return [
        new Date(reservation.reservedAt).toLocaleString('en-PH'),
        reservation.userName || 'N/A',
        reservation.userEmail || 'N/A',
        product?.name || 'Unknown Product',
        reservation.quantity || 1,
        `₱${unitPrice.toFixed(2)}`,
        `₱${totalPrice.toFixed(2)}`,
        status,
        new Date(reservation.expiresAt).toLocaleString('en-PH'),
        getTimeRemaining(reservation.expiresAt)
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reservations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Reservations exported successfully!', 'success');
  };

  // Get filtered and sorted reservations
  const getFilteredReservations = () => {
    let filtered = [...reservations];

    // Filter by search query
    if (reservationSearch) {
      const searchLower = reservationSearch.toLowerCase();
      filtered = filtered.filter(reservation => {
        const product = products.find(p => p.id === reservation.productId);
        return (
          reservation.userName?.toLowerCase().includes(searchLower) ||
          reservation.userEmail?.toLowerCase().includes(searchLower) ||
          product?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filter by status
    if (reservationStatusFilter !== 'all') {
      filtered = filtered.filter(reservation => {
        if (reservationStatusFilter === 'active') return reservation.status === 'active';
        if (reservationStatusFilter === 'expired') return reservation.status === 'expired';
        return true;
      });
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => new Date(b.reservedAt) - new Date(a.reservedAt));
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const badges = {
      published: { bg: 'bg-green-100', text: 'text-green-800', label: 'Published' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' }
    };
    return badges[status] || badges.published;
  };

  // Filter collections by status
  const getFilteredCollections = () => {
    return collections.filter(collection => {
      const collectionStatus = collection.status || 'published';
      return collectionStatus === activeTab;
    });
  };

  // Get products for a collection
  const getCollectionProducts = (collectionId) => {
    return products.filter(p => p.collectionId === collectionId);
  };

  // Toggle collection expansion
  const toggleCollection = (collectionId) => {
    setExpandedCollections(prev => ({
      ...prev,
      [collectionId]: !prev[collectionId]
    }));
  };

  // Handle collection form submission
  const handleCollectionSubmit = (e) => {
    e.preventDefault();

    let collectionData = {
      name: collectionForm.name,
      description: collectionForm.description,
      imageUrl: collectionForm.imageUrl,
      status: collectionForm.status
    };

    // If scheduled, combine date and time
    if (collectionForm.status === 'scheduled') {
      if (!collectionForm.scheduledDate || !collectionForm.scheduledTime) {
        showToast('Please set both date and time for scheduled publishing', 'error');
        return;
      }

      const scheduledDateTime = new Date(`${collectionForm.scheduledDate}T${collectionForm.scheduledTime}`);

      // Check if scheduled time is in the past
      if (scheduledDateTime <= new Date()) {
        showToast('Scheduled time must be in the future', 'error');
        return;
      }

      collectionData.scheduledDateTime = scheduledDateTime.toISOString();
      collectionData.scheduledDate = collectionForm.scheduledDate;
      collectionData.scheduledTime = collectionForm.scheduledTime;
    }

    if (editingCollection) {
      updateCollection(editingCollection.id, collectionData);
      showToast('Collection updated successfully!', 'success');
    } else {
      addCollection(collectionData);
      showToast('Collection created successfully!', 'success');
    }

    // Reset form
    setCollectionForm({
      name: '',
      description: '',
      imageUrl: '',
      status: 'published',
      scheduledDate: '',
      scheduledTime: ''
    });
    setCollectionImagePreview('');
    setShowCollectionForm(false);
    setEditingCollection(null);
  };

  // Handle product form submission
  const handleProductSubmit = (e) => {
    e.preventDefault();

    const selectedCollection = collections.find(c => c.id === productForm.collectionId);

    // Check if collection is published or being created for draft/scheduled
    if (!selectedCollection) {
      showToast('Please select a valid collection', 'error');
      return;
    }

    const newTotalStock = parseInt(productForm.totalStock);

    // Calculate new availableStock when editing
    let newAvailableStock;
    if (editingProduct) {
      // Calculate the difference between new and old totalStock
      const stockDifference = newTotalStock - editingProduct.totalStock;
      // Add the difference to the current availableStock
      newAvailableStock = Math.max(0, editingProduct.availableStock + stockDifference);
    } else {
      // For new products, availableStock equals totalStock
      newAvailableStock = newTotalStock;
    }

    const productData = {
      ...productForm,
      price: parseFloat(productForm.price),
      totalStock: newTotalStock,
      availableStock: newAvailableStock
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      showToast('Product updated successfully!', 'success');
    } else {
      addProduct(productData);
      showToast('Product created successfully!', 'success');
    }

    // Reset form
    setProductForm({
      name: '',
      description: '',
      price: '',
      totalStock: '',
      imageUrl: '',
      collectionId: ''
    });
    setProductImagePreview('');
    setShowProductForm(false);
    setEditingProduct(null);
  };

  // Handle edit collection
  const handleEditCollection = (collection) => {
    setEditingCollection(collection);
    setCollectionForm({
      name: collection.name,
      description: collection.description || '',
      imageUrl: collection.imageUrl || '',
      status: collection.status || 'published',
      scheduledDate: collection.scheduledDate || '',
      scheduledTime: collection.scheduledTime || ''
    });
    setCollectionImagePreview(collection.imageUrl || '');
    setShowCollectionForm(true);
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      totalStock: product.totalStock.toString(),
      imageUrl: product.imageUrl || '',
      collectionId: product.collectionId
    });
    setProductImagePreview(product.imageUrl || '');
    setShowProductForm(true);
  };

  // Handle collection image change
  const handleCollectionImageChange = (e) => {
    const url = e.target.value;
    setCollectionForm({ ...collectionForm, imageUrl: url });
    setCollectionImagePreview(url);
    setCollectionImageError(false);
  };

  // Handle product image change
  const handleProductImageChange = (e) => {
    const url = e.target.value;
    setProductForm({ ...productForm, imageUrl: url });
    setProductImagePreview(url);
    setProductImageError(false);
  };

  // Handle product selection
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Select all products in collection
  const selectAllInCollection = (collectionId) => {
    const collectionProducts = getCollectionProducts(collectionId);
    const allSelected = collectionProducts.every(p => selectedProducts.includes(p.id));

    if (allSelected) {
      setSelectedProducts(prev => prev.filter(id => !collectionProducts.find(p => p.id === id)));
    } else {
      const newSelected = [...selectedProducts];
      collectionProducts.forEach(p => {
        if (!newSelected.includes(p.id)) {
          newSelected.push(p.id);
        }
      });
      setSelectedProducts(newSelected);
    }
  };

  // Delete selected products
  const handleDeleteSelected = () => {
    if (selectedProducts.length === 0) {
      showToast('No products selected', 'warning');
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: 'products',
      data: selectedProducts
    });
  };

  // Delete collection
  const handleDeleteCollection = (collection) => {
    const collectionProducts = getCollectionProducts(collection.id);
    setDeleteModal({
      isOpen: true,
      type: 'collection',
      data: {
        collection,
        productCount: collectionProducts.length
      }
    });
  };

  // Confirm delete action
  const confirmDelete = () => {
    if (deleteModal.type === 'products') {
      deleteProducts(deleteModal.data);
      setSelectedProducts([]);
      showToast('Products deleted successfully!', 'success');
    } else if (deleteModal.type === 'collection') {
      deleteCollection(deleteModal.data.collection.id);
      showToast('Collection deleted successfully!', 'success');
    }
  };

  // Quick publish/unpublish collection
  const quickToggleStatus = (collection, newStatus) => {
    updateCollection(collection.id, { status: newStatus });
    showToast(`Collection ${newStatus === 'published' ? 'published' : 'saved as draft'}!`, 'success');
  };

  const filteredCollections = getFilteredCollections();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[98%] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-accent-700" />
              <h1 className="text-base font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/store')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <Eye className="w-4 h-4" />
                Preview Store
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[98%] mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveMainTab('products')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeMainTab === 'products'
                ? 'text-accent-700 border-accent-700'
                : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Product Management
            </button>
            <button
              onClick={() => setActiveMainTab('reservations')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeMainTab === 'reservations'
                ? 'text-accent-700 border-accent-700'
                : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Reservations ({reservations.length})
            </button>

            {/* NEW TABS FROM GIVEN CODE */}
            <button
              onClick={() => setActiveMainTab('orders')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeMainTab === 'orders'
                ? 'text-accent-700 border-accent-700'
                : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Order Management ({orders.length})
            </button>
            <button
              onClick={() => setActiveMainTab('settings')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeMainTab === 'settings'
                ? 'text-accent-700 border-accent-700'
                : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
            >
              <SettingsIcon className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[98%] mx-auto p-6">
        {activeMainTab === 'products' && (
          <>
            {/* Status Tabs */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('published')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'published'
                    ? 'bg-neutral-600 text-xs text-white'
                    : 'bg-stone-200 text-xs text-stone-700 hover:bg-stone-300'
                    }`}
                >
                  Published ({collections.filter(c => (c.status || 'published') === 'published').length})
                </button>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'scheduled'
                    ? 'bg-neutral-600 text-xs text-white'
                    : 'bg-stone-200 text-xs text-stone-700 hover:bg-stone-300'
                    }`}
                >
                  Scheduled ({collections.filter(c => c.status === 'scheduled').length})
                </button>
                <button
                  onClick={() => setActiveTab('draft')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'draft'
                    ? 'bg-neutral-600 text-xs text-white'
                    : 'bg-stone-200 text-xs text-stone-700 hover:bg-stone-300'
                    }`}
                >
                  Drafts ({collections.filter(c => c.status === 'draft').length})
                </button>
              </div>

              <div className="flex gap-2">
                {selectedProducts.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedProducts.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCollectionForm(true);
                    setEditingCollection(null);
                  }}
                  className="flex items-center gap-2 btn-accent px-3 py-1.5"
                >
                  <Plus className="w-4 h-4" />
                  New Collection
                </button>
              </div>
            </div>

            {/* Collections List */}
            {filteredCollections.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No {activeTab} collections yet</p>
                <button
                  onClick={() => setShowCollectionForm(true)}
                  className="text-accent-700 hover:text-accent-800 font-semibold"
                >
                  Create your first collection
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCollections.map(collection => {
                  const collectionProducts = getCollectionProducts(collection.id);
                  const isExpanded = expandedCollections[collection.id];
                  const allProductsSelected = collectionProducts.every(p => selectedProducts.includes(p.id));
                  const statusBadge = getStatusBadge(collection.status || 'published');

                  return (
                    <div key={collection.id} className="bg-white rounded-lg border border-gray-200">
                      {/* Collection Header */}
                      <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => toggleCollection(collection.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </button>

                          {collection.imageUrl && (
                            <img
                              src={collection.imageUrl}
                              alt={collection.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-base text-gray-900">{collection.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{collection.description}</p>
                            {collection.status === 'scheduled' && collection.scheduledDateTime && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Publishes on {new Date(collection.scheduledDateTime).toLocaleString('en-PH', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {collectionProducts.length} {collectionProducts.length === 1 ? 'product' : 'products'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Quick Status Toggle */}
                          {collection.status === 'draft' && (
                            <button
                              onClick={() => quickToggleStatus(collection, 'published')}
                              className="p-2 text-green-600 hover:bg-green-100 rounded transition group relative">
                              <Eye className="w-4 h-4" />
                              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Publish Now
                              </span>
                            </button>
                          )}

                          <button
                            onClick={() => handleEditCollection(collection)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition group relative">
                            <Edit2 className="w-4 h-4" />
                            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Edit
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteCollection(collection)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition group relative">
                            <Trash2 className="w-4 h-4" />
                            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Delete
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setProductForm({ ...productForm, collectionId: collection.id });
                              setShowProductForm(true);
                            }}
                            className="p-2 text-accent-700 hover:bg-slate-100 rounded transition group relative">
                            <Plus className="w-4 h-4" />
                            <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              Add Product
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Products List */}
                      {isExpanded && (
                        collectionProducts.length > 0 ? (
                          <div className="border-t border-gray-200 bg-gray-50">
                            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={allProductsSelected && collectionProducts.length > 0}
                                  onChange={() => selectAllInCollection(collection.id)}
                                  className="rounded border-gray-300"
                                />
                                Select all in collection
                              </label>
                            </div>

                            <div className="divide-y divide-gray-200">
                              {collectionProducts.map(product => (
                                <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-white transition">
                                  <input
                                    type="checkbox"
                                    checked={selectedProducts.includes(product.id)}
                                    onChange={() => toggleProductSelection(product.id)}
                                    className="rounded border-gray-300"
                                  />

                                  {product.imageUrl && (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}

                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                                    <p className="text-sm text-gray-600">{product.description}</p>
                                    <div className="flex items-center gap-4 mt-1 text-sm">
                                      <span className="text-accent-700 font-semibold">
                                        ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-gray-600">
                                        Stock: {product.availableStock}/{product.totalStock}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEditProduct(product)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-gray-200 bg-gray-50 p-8 text-center">
                            <PackageX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-3">No products added yet</p>
                            <button
                              onClick={() => {
                                setProductForm({ ...productForm, collectionId: collection.id });
                                setShowProductForm(true);
                              }}
                              className="inline-flex items-center gap-2 btn-accent px-4 py-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add First Product
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeMainTab === 'reservations' && (
          /* Reservations Tab */
          <>
            {/* Dashboard Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Total Reservations */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Reservations</p>
                    <h3 className="text-lg font-bold text-gray-900">
                      {reservations.length}
                    </h3>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-accent-700" />
                  </div>
                </div>
              </div>

              {/* Active Reservations */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Reservations</p>
                    <h3 className="text-lg font-bold text-green-600">
                      {reservations.filter(r => r.status === 'active').length}
                    </h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Expired Reservations */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Expired Reservations</p>
                    <h3 className="text-lg font-bold text-red-600">
                      {reservations.filter(r => r.status === 'expired').length}
                    </h3>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <PackageX className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Unique Customers */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Unique Customers</p>
                    <h3 className="text-lg font-bold text-gray-900">
                      {new Set(reservations.map(r => r.userEmail)).size}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Potential Revenue */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Potential Revenue</p>
                    <h3 className="text-lg font-bold text-amber-600">
                      ₱{reservations.filter(r => r.status === 'active').reduce((total, reservation) => {
                        const product = products.find(p => p.id === reservation.productId);
                        return total + ((product?.price || 0) * (reservation.quantity || 1));
                      }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Customer Reservations ({getFilteredReservations().length})
              </h2>
              <button
                onClick={exportReservationsToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-600 text-xs text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="w-4 h-4 inline mr-1" />
                    Search
                  </label>
                  <input
                    type="text"
                    value={reservationSearch}
                    onChange={(e) => setReservationSearch(e.target.value)}
                    placeholder="Search by customer name, email, or product..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Status
                  </label>
                  <select
                    value={reservationStatusFilter}
                    onChange={(e) => setReservationStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  >
                    <option value="all">All Reservations</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reservations List */}
            {getFilteredReservations().length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No reservations found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Reserved
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredReservations().map(reservation => {
                        const product = products.find(p => p.id === reservation.productId);
                        // Check if expired in real-time based on current time
                        const isExpiredNow = new Date(reservation.expiresAt) < currentTime;
                        // Also check if frozenRemainingMs indicates expired (frozen with 0 or negative time)
                        const isFrozenExpired = reservation.frozenRemainingMs !== null && reservation.frozenRemainingMs !== undefined && reservation.frozenRemainingMs <= 0;
                        const isExpired = reservation.status === 'expired' || isExpiredNow || isFrozenExpired;
                        const totalPrice = (product?.price || 0) * (reservation.quantity || 1);

                        return (
                          <tr key={reservation.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(reservation.reservedAt).toLocaleString('en-PH')}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{reservation.userName}</div>
                                <div className="text-sm text-gray-500">{reservation.userEmail}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {product?.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                    <ShoppingBag className="w-6 h-6 text-gray-300" />
                                  </div>
                                )}
                                <div className="font-medium text-gray-900">{product?.name || 'Unknown'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-900">
                              {reservation.quantity || 1}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-accent-700">
                                ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {reservation.quantity || 1} x {(product?.price || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center">
                                {isExpired ? (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                    Expired
                                  </span>
                                ) : (
                                  <>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      Active
                                    </span>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {getTimeRemaining(reservation.expiresAt, reservation.frozenRemainingMs)}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* NEW TABS CONTENT FROM GIVEN CODE */}
        {activeMainTab === 'orders' && (
          <OrderManagement orders={orders} showToast={showToast} verifyOrderPayment={verifyOrderPayment} declineOrderPayment={declineOrderPayment} updateOrderTracking={updateOrderTracking} invoiceSettings={invoiceSettings} paymentSettings={paymentSettings} timeSettings={timeSettings} adminCancelOrder={adminCancelOrder} />
        )}

        {activeMainTab === 'settings' && (
          <Settings
            paymentSettings={paymentSettings}
            updatePaymentSettings={updatePaymentSettings}
            showToast={showToast}
            timeSettings={timeSettings}
            updateTimeSettings={updateTimeSettings}
            invoiceSettings={invoiceSettings}
            updateInvoiceSettings={updateInvoiceSettings}
          />
        )}
      </div>

      {/* Collection Form Modal */}
      {showCollectionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-[14px]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCollection ? 'Edit Collection' : 'New Collection'}
              </h2>
              <button
                onClick={() => {
                  setShowCollectionForm(false);
                  setEditingCollection(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCollectionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={collectionForm.name}
                  onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={collectionForm.imageUrl}
                  onChange={handleCollectionImageChange}
                  placeholder="https://example.com/collection.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                />
                {collectionImagePreview && !collectionImageError && (
                  <div className="mt-2">
                    <img
                      src={collectionImagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                      onError={() => setCollectionImageError(true)}
                    />
                  </div>
                )}
                {collectionImageError && (
                  <p className="mt-2 text-sm text-red-600">Failed to load image. Please check the URL.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Publishing Status *
                </label>
                <select
                  value={collectionForm.status}
                  onChange={(e) => setCollectionForm({ ...collectionForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  required
                >
                  <option value="published">Publish Now</option>
                  <option value="scheduled">Schedule for Later</option>
                  <option value="draft">Save as Draft</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {collectionForm.status === 'published' && 'Collection will be visible to customers immediately'}
                  {collectionForm.status === 'scheduled' && 'Set a future date and time to automatically publish'}
                  {collectionForm.status === 'draft' && 'Collection will be hidden from customers until published'}
                </p>
              </div>

              {collectionForm.status === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Publish Date *
                    </label>
                    <input
                      type="date"
                      value={collectionForm.scheduledDate}
                      onChange={(e) => setCollectionForm({ ...collectionForm, scheduledDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                      required={collectionForm.status === 'scheduled'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Publish Time *
                    </label>
                    <input
                      type="time"
                      value={collectionForm.scheduledTime}
                      onChange={(e) => setCollectionForm({ ...collectionForm, scheduledTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                      required={collectionForm.status === 'scheduled'}
                    />
                  </div>
                  <div className="col-span-2 text-sm text-blue-800">
                    <strong>Note:</strong> All products in this collection will be published at the scheduled time
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCollectionForm(false);
                    setEditingCollection(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-accent px-4 py-2"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {editingCollection ? 'Update Collection' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-[14px]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Total Stock *</label>
                  <input
                    type="number"
                    value={productForm.totalStock}
                    onChange={(e) => setProductForm({ ...productForm, totalStock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Collection *</label>
                <select
                  value={productForm.collectionId}
                  onChange={(e) => setProductForm({ ...productForm, collectionId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                  required
                >
                  <option value="">Select a collection</option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({getStatusBadge(collection.status || 'published').label})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Products will inherit the collection's publishing status and schedule
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={productForm.imageUrl}
                  onChange={handleProductImageChange}
                  placeholder="https://example.com/product.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
                />
                {productImagePreview && !productImageError && (
                  <div className="mt-2">
                    <img
                      src={productImagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                      onError={() => setProductImageError(true)}
                    />
                  </div>
                )}
                {productImageError && (
                  <p className="mt-2 text-sm text-red-600">Failed to load image. Please check the URL.</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, data: null })}
        onConfirm={confirmDelete}
        title={deleteModal.type === 'products' ? 'Delete Products' : 'Delete Collection'}
        message={
          deleteModal.type === 'products'
            ? 'Are you sure you want to delete the selected products?'
            : `Are you sure you want to delete this collection? This will also delete ${deleteModal.data?.productCount || 0} products in this collection.`
        }
        itemCount={
          deleteModal.type === 'products'
            ? deleteModal.data?.length || 0
            : (deleteModal.data?.productCount || 0) + 1
        }
      />
    </div>
  );
};

export default AdminPanel;