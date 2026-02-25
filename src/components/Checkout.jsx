import React, { useState } from 'react';
import { ShoppingBag, Check, Clock, ArrowLeft, ArrowRight, MapPin, User, Phone, Mail, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from './StoreNavbar';
import { getTimeRemaining } from '../utils/timeHelpers';

const Checkout = ({ reservations, products, user, logout, isAdmin, collections, createOrder, notifications, markNotificationRead, markAllNotificationsRead, dataLoading }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = item selection, 2 = shipping details
  const [selectedItems, setSelectedItems] = useState(
    reservations.map(r => r.id) // All items selected by default
  );
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
    email: user?.email || '',
    phone: user?.mobileNo || '',
    address: user?.homeAddress || ''
  });

  // Toggle item selection
  const toggleItem = (reservationId) => {
    if (selectedItems.includes(reservationId)) {
      setSelectedItems(selectedItems.filter(id => id !== reservationId));
    } else {
      setSelectedItems([...selectedItems, reservationId]);
    }
  };

  // Calculate totals
  const getSelectedReservations = () => {
    return reservations.filter(r => selectedItems.includes(r.id));
  };

  const calculateSubtotal = () => {
    return getSelectedReservations().reduce((total, reservation) => {
      const product = products.find(p => p.id === reservation.productId);
      if (!product) return total;
      return total + (product.price * (reservation.quantity || 1));
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const selectedCount = selectedItems.length;

  // Handle proceed to shipping
  const handleProceedToShipping = () => {
    if (selectedCount === 0) return;
    setStep(2);
  };

  // Handle shipping detail change
  const handleShippingChange = (field, value) => {
    setShippingDetails({ ...shippingDetails, [field]: value });
  };

  // Reset to customer info
  const resetToCustomerInfo = () => {
    setShippingDetails({
      name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
      email: user?.email || '',
      phone: user?.mobileNo || '',
      address: user?.homeAddress || ''
    });
    setUseDifferentAddress(false);
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (selectedCount === 0 || isSubmitting) return;

    // Validate shipping details
    if (!shippingDetails.name || !shippingDetails.phone || !shippingDetails.address) {
      alert('Please fill in all required shipping details (Name, Phone, Address)');
      return;
    }

    setIsSubmitting(true);

    const orderItems = getSelectedReservations().map(reservation => {
      const product = products.find(p => p.id === reservation.productId);
      return {
        reservationId: reservation.id,
        productId: reservation.productId,
        productName: product?.name || 'Unknown',
        productImage: product?.imageUrl || null,
        quantity: reservation.quantity || 1,
        unitPrice: product?.price || 0,
        totalPrice: (product?.price || 0) * (reservation.quantity || 1)
      };
    });

    const orderId = await createOrder(orderItems, subtotal, shippingDetails);

    setIsSubmitting(false);

    if (orderId) {
      navigate(`/payment/${orderId}`);
    }
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
        pageTitle="Checkout"
        notifications={notifications}
        markNotificationRead={markNotificationRead}
        markAllNotificationsRead={markAllNotificationsRead}
      />

      {dataLoading?.reservations || dataLoading?.products ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-700 mb-4"></div>
            <p className="text-gray-500 text-sm font-medium">Loading checkout...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Back Button */}
          <button
            onClick={() => step === 1 ? navigate('/my-reservations') : setStep(1)}
            className="flex items-center gap-2 text-[12px] text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? 'Back to Reservations' : 'Back to Checkout'}
          </button>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 text-[12px] sm:text-[14px]">
            <div className="flex items-center">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm ${step >= 1 ? 'bg-accent-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <span className={`ml-1.5 sm:ml-2 mr-3 sm:mr-4 font-medium ${step >= 1 ? 'text-accent-700' : 'text-gray-400'}`}>Items</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center ml-3 sm:ml-4">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm ${step >= 2 ? 'bg-accent-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <span className={`ml-1.5 sm:ml-2 font-medium ${step >= 2 ? 'text-accent-700' : 'text-gray-400'}`}>Shipping</span>
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No items to checkout</p>
              <button
                onClick={() => navigate('/store')}
                className="text-accent-700 hover:text-accent-800 font-semibold"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-4 min-w-0">
                {step === 1 ? (
                  /* Step 1: Item Selection */
                  <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                      Select Items for Checkout
                    </h2>
                    <div className="space-y-4">
                      {reservations.map(reservation => {
                        const product = products.find(p => p.id === reservation.productId);
                        if (!product) return null;

                        const isSelected = selectedItems.includes(reservation.id);
                        const itemTotal = product.price * (reservation.quantity || 1);

                        return (
                          <div
                            key={reservation.id}
                            className={`border rounded-lg p-4 transition ${isSelected ? 'border-accent-600 bg-accent-50' : 'border-gray-200'
                              }`}
                          >
                            <div className="flex gap-4">
                              {/* Checkbox */}
                              <div className="flex items-start pt-1">
                                <button
                                  onClick={() => toggleItem(reservation.id)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${isSelected
                                    ? 'border-accent-700 bg-accent-700'
                                    : 'border-gray-300 bg-white'
                                    }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </button>
                              </div>

                              {/* Product Image */}
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded"
                                />
                              ) : (
                                <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-100 rounded flex items-center justify-center">
                                  <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
                                </div>
                              )}

                              {/* Product Details */}
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                <p className="text-[13px] text-gray-600 mb-2 line-clamp-1">{product.description}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-gray-600">
                                    ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {reservation.quantity || 1}
                                  </span>
                                  <span className="font-semibold text-accent-700">
                                    = ₱{itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Step 2: Shipping Details */
                  <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-[14px]">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900">Shipping Details</h2>
                      {useDifferentAddress && (
                        <button
                          onClick={resetToCustomerInfo}
                          className="text-sm text-accent-700 hover:text-accent-800 flex items-center gap-1"
                        >
                          <User className="w-4 h-4" />
                          Use my account info
                        </button>
                      )}
                    </div>

                    {/* Toggle for different address */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useDifferentAddress}
                          onChange={(e) => setUseDifferentAddress(e.target.checked)}
                          className="w-5 h-5 text-accent-700 rounded focus:ring-accent-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900 text-[13px]">Use a different shipping address</span>
                          <p className="text-[13px] text-gray-600 text-[11px]">Enter a different address for delivery</p>
                        </div>
                      </label>
                    </div>

                    {/* Shipping Form */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <User className="w-4 h-4 inline mr-1" />
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={shippingDetails.name}
                          onChange={(e) => handleShippingChange('name', e.target.value)}
                          disabled={!useDifferentAddress}
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent ${useDifferentAddress ? 'bg-white' : 'bg-gray-100'
                            }`}
                          placeholder="Enter full name"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Email
                          </label>
                          <input
                            type="email"
                            value={shippingDetails.email}
                            onChange={(e) => handleShippingChange('email', e.target.value)}
                            disabled={!useDifferentAddress}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent ${useDifferentAddress ? 'bg-white' : 'bg-gray-100'
                              }`}
                            placeholder="Enter email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Phone className="w-4 h-4 inline mr-1" />
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            value={shippingDetails.phone}
                            onChange={(e) => handleShippingChange('phone', e.target.value)}
                            disabled={!useDifferentAddress}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent ${useDifferentAddress ? 'bg-white' : 'bg-gray-100'
                              }`}
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Shipping Address *
                        </label>
                        <textarea
                          value={shippingDetails.address}
                          onChange={(e) => handleShippingChange('address', e.target.value)}
                          disabled={!useDifferentAddress}
                          rows={3}
                          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none ${useDifferentAddress ? 'bg-white' : 'bg-gray-100'
                            }`}
                          placeholder="Enter complete shipping address"
                        />
                      </div>
                    </div>

                    {/* Selected Items Summary */}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-semibold text-gray-900 mb-3">Order Summary ({selectedCount} items)</h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto overflow-x-hidden">
                        {getSelectedReservations().map(reservation => {
                          const product = products.find(p => p.id === reservation.productId);
                          if (!product) return null;
                          return (
                            <div key={reservation.id} className="flex justify-between text-sm min-w-0 gap-2">
                              <span className="text-gray-600 truncate min-w-0 flex-1">{product.name} × {reservation.quantity || 1}</span>
                              <span className="font-medium flex-shrink-0">₱{(product.price * (reservation.quantity || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1 min-w-0">
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 sm:sticky sm:top-6">
                  <h2 className="text-[14px] sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-[12px] sm:text-sm">
                      <span className="text-gray-600">Items Selected</span>
                      <span className="font-medium">{selectedCount}</span>
                    </div>
                    <div className="flex justify-between text-[12px] sm:text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">
                        ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-bold text-gray-900 text-[13px] sm:text-base">Total</span>
                      <span className="font-bold text-accent-700 text-[14px] sm:text-lg">
                        ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {step === 1 ? (
                    <button
                      onClick={handleProceedToShipping}
                      disabled={selectedCount === 0}
                      className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 text-[13px] sm:text-[14px] ${selectedCount > 0
                        ? 'btn-accent'
                        : 'bg-gray-200 text-gray-500 border border-gray cursor-not-allowed'
                        }`}
                    >
                      Continue to Shipping
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={selectedCount === 0 || isSubmitting}
                      className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold transition text-[13px] sm:text-[14px] ${selectedCount > 0 && !isSubmitting
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                  )}

                  <p className="text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4 text-center">
                    {step === 1
                      ? 'Unselected items will remain reserved'
                      : 'You will be redirected to the payment page'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Checkout;