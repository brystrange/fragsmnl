import React, { useState, useEffect } from 'react';
import { Clock, Trash2, ShoppingBag, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { getTimeRemaining } from '../utils/timeHelpers';
import StoreNavbar from './StoreNavbar';
import { useNavigate } from 'react-router-dom';

const MyReservations = ({ reservations, products, cancelReservation, logout, user, isAdmin, collections, notifications, markNotificationRead, markAllNotificationsRead }) => {
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
            <button
              onClick={() => navigate('/store')}
              className="inline-flex items-center gap-2 btn-accent px-6 py-3 font-semibold"
            >
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Shopping Cart</h1>
                    <p className="text-sm text-gray-600 mt-1">
                      {reservations.length} {reservations.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-amber-700 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4" />
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
                      <div className="p-6">
                        <div className="flex gap-6">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="w-32 h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <ShoppingBag className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-[17px] font-semibold text-gray-900 mb-2 leading-tight">
                                  {product.name}
                                </h3>
                                <p className="text-[13px] text-gray-600 line-clamp-2 mb-3">
                                  {product.description}
                                </p>

                                {/* Quantity and Price */}
                                <div className="flex items-center gap-4 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] text-gray-600">Qty:</span>
                                    <span className="font-semibold text-[14px] text-gray-900">{reservation.quantity || 1}</span>
                                  </div>
                                  <div className="h-4 w-px bg-gray-300"></div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] text-gray-600">Unit Price:</span>
                                    <span className="font-semibold text-[14px] text-gray-900">
                                      ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                {/* Timer */}
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                                  <Clock className="w-4 h-4 text-orange-600" />
                                  <span className="text-[12px] font-medium text-orange-700">
                                    {getTimeRemaining(reservation.expiresAt, reservation.frozenRemainingMs)} remaining
                                  </span>
                                  {reservation.frozenRemainingMs && (
                                    <span className="text-xs text-blue-600 ml-1 font-medium">(paused)</span>
                                  )}
                                </div>
                              </div>

                              {/* Item Total */}
                              <div className="text-right">
                                <p className="text-[16px] font-bold text-gray-900">
                                  ₱{itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => cancelReservation(reservation.id)}
                            className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove item"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue Shopping Link */}
              <div className="pt-2">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({reservations.length} {reservations.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-gray-900">
                      ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-accent-700">
                        ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="btn-accent w-full flex items-center justify-center gap-2 px-6 py-4 text-[14px]"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Proceed to Checkout
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
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