import React, { useState, useEffect } from 'react';
import { Clock, Trash2, ShoppingBag, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { getTimeRemaining } from '../utils/timeHelpers';
import StoreNavbar from './StoreNavbar';
import { useNavigate } from 'react-router-dom';

const MyReservations = ({ reservations, products, cancelReservation, logout, user, isAdmin, collections, notifications, markNotificationRead, markAllNotificationsRead, dataLoading }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate total
  const calculateTotal = () => {
    return reservations.reduce((total, reservation) => {
      const product = products.find(p => p.id === reservation.productId);
      if (!product) return total;
      return total + (product.price * (reservation.quantity || 1));
    }, 0);
  };

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreNavbar
        collections={collections}
        user={user}
        logout={logout}
        reservations={reservations}
        isAdmin={isAdmin}
        showSearch={false}
        pageTitle="My Reservations"
        notifications={notifications}
        markNotificationRead={markNotificationRead}
        markAllNotificationsRead={markAllNotificationsRead}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {dataLoading?.reservations || dataLoading?.products ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-700 mb-4"></div>
            <p className="text-gray-500 text-sm font-medium">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-[12px] sm:text-base text-gray-600 mb-6">Start shopping to add items to your cart</p>
            <button
              onClick={() => navigate('/store')}
              className="inline-flex items-center gap-2 btn-accent px-5 sm:px-6 py-2.5 sm:py-3 font-semibold text-[13px] sm:text-base"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Cart Items - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-gray-900">Shopping Cart</h1>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                      {reservations.length} {reservations.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] sm:text-[13px] text-amber-700 bg-amber-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-medium">Items reserved for limited time</span>
                  </div>
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {reservations.map(reservation => {
                  const product = products.find(p => p.id === reservation.productId);
                  if (!product) return null;

                  const itemTotal = product.price * (reservation.quantity || 1);

                  return (
                    <div key={reservation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
                      <div className="p-3 sm:p-6">
                        <div className="flex gap-3 sm:gap-6">
                          {/* Product Image — small square on mobile */}
                          <div className="flex-shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 sm:w-32 sm:h-32 object-cover rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-32 sm:h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 sm:w-12 sm:h-12 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] sm:text-[17px] font-semibold text-gray-900 mb-1 sm:mb-2 leading-tight line-clamp-2 sm:line-clamp-none">
                                  {product.name}
                                </h3>
                                <p className="text-[11px] sm:text-[13px] text-gray-600 line-clamp-2 mb-2 sm:mb-3 hidden sm:block">
                                  {product.description}
                                </p>

                                {/* Quantity and Price */}
                                <div className="flex items-center gap-2 sm:gap-4 mb-1.5 sm:mb-3">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] sm:text-[14px] text-gray-600">Qty:</span>
                                    <span className="font-semibold text-[11px] sm:text-[14px] text-gray-900">{reservation.quantity || 1}</span>
                                  </div>
                                  <div className="h-3 sm:h-4 w-px bg-gray-300"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] sm:text-[14px] text-gray-600">Unit:</span>
                                    <span className="font-semibold text-[11px] sm:text-[14px] text-gray-900">
                                      ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                {/* Timer */}
                                <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                                  <span className="text-[10px] sm:text-[12px] font-medium text-orange-700">
                                    {getTimeRemaining(reservation.expiresAt, reservation.frozenRemainingMs)} remaining
                                  </span>
                                  {reservation.frozenRemainingMs && (
                                    <span className="text-[10px] sm:text-xs text-blue-600 ml-1 font-medium">(paused)</span>
                                  )}
                                </div>
                              </div>

                              {/* Item Total + Remove */}
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-[13px] sm:text-[16px] font-bold text-gray-900">
                                  ₱{itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                                <button
                                  onClick={() => cancelReservation(reservation.id)}
                                  className="flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Remove item"
                                >
                                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue Shopping Link — hidden on mobile */}
              <div className="pt-2 hidden sm:block">
                <button
                  onClick={() => navigate('/store')}
                  className="text-accent-700 hover:text-accent-800 font-medium text-sm flex items-center gap-2"
                >
                  <span className="text-sm font-medium">Continue Shopping</span>
                </button>
              </div>
            </div>

            {/* Order Summary - Right Side */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sm:sticky sm:top-6">
                <h2 className="text-[14px] sm:text-lg font-bold text-gray-900 mb-3 sm:mb-6">Order Summary</h2>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex items-center justify-between text-[12px] sm:text-sm">
                    <span className="text-gray-600">Subtotal ({reservations.length} {reservations.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-gray-900">
                      ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] sm:text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 sm:pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] sm:text-lg font-bold text-gray-900">Total</span>
                      <span className="text-[14px] sm:text-lg font-bold text-accent-700">
                        ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="btn-accent w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 text-[13px] sm:text-[14px]"
                >
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  Proceed to Checkout
                </button>

                <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-3 sm:mt-4">
                  Secure checkout powered by Firebase
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;