import { useEffect } from 'react';

// Hook to auto-expire reservations
// pauseExpiration: when true, stops the expiration check (useful during checkout/payment)
export const useReservations = (reservations, expireReservation, pauseExpiration = false) => {
  useEffect(() => {
    // If expiration is paused, don't run the check
    if (pauseExpiration) {
      return;
    }

    // Immediately check for expired reservations on mount
    const checkExpiredReservations = () => {
      const now = new Date();
      reservations.forEach(reservation => {
        if (new Date(reservation.expiresAt) < now && reservation.status === 'active') {
          expireReservation(reservation.id);
        }
      });
    };

    // Run immediately
    checkExpiredReservations();

    // Then run every 2 seconds
    const interval = setInterval(checkExpiredReservations, 2000);

    return () => clearInterval(interval);
  }, [reservations, expireReservation, pauseExpiration]);
};