import React, { useState, useEffect } from 'react';
import { Clock, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import { getTimeRemaining } from '../utils/timeHelpers';
import StoreNavbar from './StoreNavbar';
import { useNavigate } from 'react-router-dom';

const MyReservations = ({ reservations, products, cancelReservation, logout, user, isAdmin, collections }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      />

      <div className="max-w-4xl mx-auto p-6">
        {reservations.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No active reservations</p>
            <button
              onClick={() => navigate('/store')}
              className="mt-4 text-purple-600 hover:text-purple-700 font-semibold"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* Checkout Button */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Reservations</h2>
                <p className="text-sm text-gray-600 mt-1">{reservations.length} {reservations.length === 1 ? 'item' : 'items'} reserved</p>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                <CreditCard className="w-5 h-5" />
                Checkout
              </button>
            </div>

            <div className="space-y-4">
              {reservations.map(reservation => {
                const product = products.find(p => p.id === reservation.productId);
                if (!product) return null;

                return (
                  <div key={reservation.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex gap-4">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-purple-600 font-semibold">
                            ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {reservation.quantity || 1} = ₱{(product.price * (reservation.quantity || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="flex items-center gap-1 text-orange-600 text-sm">
                            <Clock className="w-4 h-4" />
                            {getTimeRemaining(reservation.expiresAt, reservation.frozenRemainingMs)} remaining
                            {reservation.frozenRemainingMs && <span className="text-blue-600 ml-1">(paused)</span>}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelReservation(reservation.id)}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        📧 Contact seller or proceed to checkout to complete your purchase
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyReservations;