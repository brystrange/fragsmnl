import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthView from './components/AuthView';
import AdminPanel from './components/AdminPanel';
import StoreView from './components/StoreView';
import MyReservations from './components/MyReservations';
import AdminLogin from './components/AdminLogin';
import AdminOnboarding from './components/AdminOnboarding';
import Toast from './components/Toast';
import Checkout from './components/Checkout';
import PaymentPage from './components/PaymentPage';
import MyAccount from './components/MyAccount';
import MyOrders from './components/MyOrders';
import { useReservations } from './hooks/useReservations';
import { getReservationExpiration } from './utils/timeHelpers';
import { auth, db, storage } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  where,
  getDocs,
  getDoc,
  setDoc,
  limit
} from 'firebase/firestore';

// Wrapper components
const AdminPanelWrapper = ({ collections, products, addCollection, addProduct, updateProduct, deleteProducts, deleteCollection, logout, reservations, showToast, updateCollection, orders, paymentSettings, updatePaymentSettings, verifyOrderPayment, declineOrderPayment, updateOrderTracking, timeSettings, updateTimeSettings, invoiceSettings, updateInvoiceSettings, adminCancelOrder, dataLoading }) => {
  // Filter out 'ordered' reservations - they're already in Order Management
  const activeReservations = reservations.filter(r => r.status !== 'ordered');

  return (
    <AdminPanel
      collections={collections}
      products={products}
      addCollection={addCollection}
      addProduct={addProduct}
      updateProduct={updateProduct}
      deleteProducts={deleteProducts}
      deleteCollection={deleteCollection}
      logout={logout}
      reservations={activeReservations}
      showToast={showToast}
      updateCollection={updateCollection}
      orders={orders}
      paymentSettings={paymentSettings}
      updatePaymentSettings={updatePaymentSettings}
      verifyOrderPayment={verifyOrderPayment}
      declineOrderPayment={declineOrderPayment}
      updateOrderTracking={updateOrderTracking}
      timeSettings={timeSettings}
      updateTimeSettings={updateTimeSettings}
      invoiceSettings={invoiceSettings}
      updateInvoiceSettings={updateInvoiceSettings}
      adminCancelOrder={adminCancelOrder}
      dataLoading={dataLoading}
    />
  );
};

const StoreViewWrapper = ({ collections, products, user, reserveProduct, logout, reservations, isAdmin, notifications, markNotificationRead, markAllNotificationsRead, dataLoading }) => {
  return (
    <StoreView
      collections={collections}
      products={products}
      user={user}
      reserveProduct={reserveProduct}
      logout={logout}
      reservations={reservations}
      isAdmin={isAdmin}
      notifications={notifications}
      markNotificationRead={markNotificationRead}
      markAllNotificationsRead={markAllNotificationsRead}
      dataLoading={dataLoading}
    />
  );
};

const MyReservationsWrapper = ({ reservations, products, cancelReservation, logout, user, isAdmin, collections, notifications, markNotificationRead, markAllNotificationsRead, dataLoading }) => {
  return (
    <MyReservations
      reservations={reservations}
      products={products}
      cancelReservation={cancelReservation}
      logout={logout}
      user={user}
      isAdmin={isAdmin}
      collections={collections}
      notifications={notifications}
      markNotificationRead={markNotificationRead}
      markAllNotificationsRead={markAllNotificationsRead}
      dataLoading={dataLoading}
    />
  );
};

// Component to track current location and freeze countdown when on checkout/payment
const ReservationManager = ({ reservations, expireReservation, user, freezeReservations, unfreezeReservations }) => {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  // Determine if we're on a protected page (checkout or payment)
  const isOnProtectedPage = location.pathname === '/checkout' || location.pathname.startsWith('/payment/');
  const wasOnProtectedPage = previousPathRef.current === '/checkout' || previousPathRef.current.startsWith('/payment/');

  useEffect(() => {
    // Entering protected page - freeze countdown
    if (!wasOnProtectedPage && isOnProtectedPage && user) {
      freezeReservations(user.id);
    }

    // Leaving protected page - unfreeze countdown
    if (wasOnProtectedPage && !isOnProtectedPage && user) {
      unfreezeReservations(user.id);
    }

    previousPathRef.current = location.pathname;
  }, [location.pathname, user, freezeReservations, unfreezeReservations, wasOnProtectedPage, isOnProtectedPage]);

  // Pass pause flag to useReservations hook
  useReservations(reservations, expireReservation, isOnProtectedPage);

  return null;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dataLoading, setDataLoading] = useState({
    collections: true,
    products: true,
    reservations: true,
    orders: true,
    paymentSettings: true,
    timeSettings: true,
    invoiceSettings: true
  });
  const [paymentSettings, setPaymentSettings] = useState({
    gcashNumber: '',
    gcashName: '',
    payMayaNumber: '',
    payMayaName: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    qrCodeUrl: ''
  });
  const [timeSettings, setTimeSettings] = useState({
    reservationExpiryMinutes: 5,
    paymentWaitHours: 48
  });
  const [invoiceSettings, setInvoiceSettings] = useState({});

  // Store frozen expiration times
  const frozenTimesRef = useRef({});

  // Track IDs that have already been notified to prevent duplicates from race conditions
  const notifiedReservationWarningsRef = useRef(new Set());
  const notifiedOrderWarningsRef = useRef(new Set());
  const notifiedExpiredReservationsRef = useRef(new Set());

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Derive overall data loading state
  const isDataLoading = Object.values(dataLoading).some(v => v);

  // Auto-reload when window crosses responsive breakpoints (fixes layout issues on resize)
  useEffect(() => {
    const breakpoints = [640, 768, 1024, 1280];
    const getBreakpoint = (w) => {
      for (let i = breakpoints.length - 1; i >= 0; i--) {
        if (w >= breakpoints[i]) return breakpoints[i];
      }
      return 0;
    };

    let currentBreakpoint = getBreakpoint(window.innerWidth);
    let resizeTimer;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newBreakpoint = getBreakpoint(window.innerWidth);
        if (newBreakpoint !== currentBreakpoint) {
          window.location.reload();
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('You are back online.', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('You are offline. Please check your internet connection.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pre-check: abort if offline
  const checkOnline = () => {
    if (!navigator.onLine) {
      showToast('No internet connection. Please try again later.', 'error');
      return false;
    }
    return true;
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to get user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();

          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            mobileNo: userData?.mobileNo || '',
            homeAddress: userData?.homeAddress || ''
          });

          // Check admin role from Firestore
          setIsAdmin(userData?.role === 'admin');
        } catch (error) {
          // Fallback if Firestore fetch fails
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
          });
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time collections listener
  useEffect(() => {
    const q = query(collection(db, 'collections'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const collectionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCollections(collectionsData);
      setDataLoading(prev => ({ ...prev, collections: false }));
    }, (error) => {
      console.error('Error listening to collections:', error);
      showToast('Failed to load collections. Please check your connection.', 'error');
      setDataLoading(prev => ({ ...prev, collections: false }));
    });

    return () => unsubscribe();
  }, []);

  // Real-time products listener
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
      setDataLoading(prev => ({ ...prev, products: false }));
    }, (error) => {
      console.error('Error listening to products:', error);
      showToast('Failed to load products. Please check your connection.', 'error');
      setDataLoading(prev => ({ ...prev, products: false }));
    });

    return () => unsubscribe();
  }, []);

  // Real-time reservations listener — scoped to current user for non-admins
  useEffect(() => {
    if (!user) {
      setDataLoading(prev => ({ ...prev, reservations: false }));
      return;
    }

    const reservationsRef = collection(db, 'reservations');
    const q = isAdmin
      ? query(reservationsRef, orderBy('reservedAt', 'desc'))
      : query(reservationsRef, where('userId', '==', user.id), orderBy('reservedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReservations(reservationsData);
      setDataLoading(prev => ({ ...prev, reservations: false }));
    }, (error) => {
      console.error('Error listening to reservations:', error);
      showToast('Failed to load reservations. Please check your connection.', 'error');
      setDataLoading(prev => ({ ...prev, reservations: false }));
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Real-time orders listener
  useEffect(() => {
    if (!user) {
      setDataLoading(prev => ({ ...prev, orders: false }));
      return;
    }

    // Reset loading flag so spinner shows while waiting for first snapshot
    setDataLoading(prev => ({ ...prev, orders: true }));

    const ordersRef = collection(db, 'orders');
    const ordersQuery = isAdmin
      ? query(ordersRef, orderBy('createdAt', 'desc'))
      : query(ordersRef, where('userId', '==', user.id), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setDataLoading(prev => ({ ...prev, orders: false }));
    }, (error) => {
      console.error('Error listening to orders:', error);
      showToast('Failed to load orders. Please check your connection.', 'error');
      setDataLoading(prev => ({ ...prev, orders: false }));
    });

    return () => unsubOrders();
  }, [user, isAdmin]);

  // Load payment settings
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'payment');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setPaymentSettings(docSnap.data());
      }
      setDataLoading(prev => ({ ...prev, paymentSettings: false }));
    }, (error) => {
      console.error('Error listening to payment settings:', error);
      showToast('Failed to load payment settings. Please check your connection.', 'error');
      setDataLoading(prev => ({ ...prev, paymentSettings: false }));
    });

    return () => unsubSettings();
  }, []);

  // Load time settings — real-time for admin, one-time fetch for regular users
  useEffect(() => {
    if (isAdmin) {
      const settingsRef = doc(db, 'settings', 'timeSettings');
      const unsubTimeSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
          setTimeSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
        setDataLoading(prev => ({ ...prev, timeSettings: false }));
      }, (error) => {
        console.error('Error listening to time settings:', error);
        showToast('Failed to load time settings. Please check your connection.', 'error');
        setDataLoading(prev => ({ ...prev, timeSettings: false }));
      });
      return () => unsubTimeSettings();
    } else {
      // Regular users: one-time fetch
      const fetchTimeSettings = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'timeSettings'));
          if (docSnap.exists()) {
            setTimeSettings(prev => ({ ...prev, ...docSnap.data() }));
          }
        } catch (error) {
          console.error('Error fetching time settings:', error);
        }
        setDataLoading(prev => ({ ...prev, timeSettings: false }));
      };
      fetchTimeSettings();
    }
  }, [isAdmin]);

  // Load invoice settings — real-time for admin, one-time fetch for regular users
  useEffect(() => {
    if (isAdmin) {
      const settingsRef = doc(db, 'settings', 'invoiceSettings');
      const unsubInvoiceSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
          setInvoiceSettings(docSnap.data());
        }
        setDataLoading(prev => ({ ...prev, invoiceSettings: false }));
      }, (error) => {
        console.error('Error listening to invoice settings:', error);
        setDataLoading(prev => ({ ...prev, invoiceSettings: false }));
      });
      return () => unsubInvoiceSettings();
    } else {
      // Regular users: one-time fetch (needed for invoice PDF generation)
      const fetchInvoiceSettings = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'invoiceSettings'));
          if (docSnap.exists()) {
            setInvoiceSettings(docSnap.data());
          }
        } catch (error) {
          console.error('Error fetching invoice settings:', error);
        }
        setDataLoading(prev => ({ ...prev, invoiceSettings: false }));
      };
      fetchInvoiceSettings();
    }
  }, [isAdmin]);

  // Listen for notifications for the current user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubNotifications = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(notifs);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubNotifications();
  }, [user]);

  // Helper: Add a notification for a user
  const addNotification = async (userId, notification) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  // Mark a single notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read for the current user
  const markAllNotificationsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        const notifRef = doc(db, 'notifications', n.id);
        batch.update(notifRef, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Auto-cancel orders without payment proof after configured hours + send warning at half-time
  useEffect(() => {
    const checkExpiredOrders = async () => {
      const now = new Date();
      const waitHours = timeSettings.paymentWaitHours || 48;
      const warningHours = Math.floor(waitHours / 2);
      const waitTimeAgo = new Date(now.getTime() - waitHours * 60 * 60 * 1000);
      const warningTimeAgo = new Date(now.getTime() - warningHours * 60 * 60 * 1000);

      for (const order of orders) {
        // Only check orders that are pending payment (no proof uploaded)
        if (order.paymentStatus === 'pending' && !order.paymentProofUrl) {
          const orderCreatedAt = new Date(order.createdAt);

          // If order is older than the configured wait time, cancel it
          if (orderCreatedAt < waitTimeAgo) {
            await cancelExpiredOrder(order);
          }
          // If order is older than half the wait time, send warning (once)
          else if (orderCreatedAt < warningTimeAgo && !order.cancelWarningNotified
            && !notifiedOrderWarningsRef.current.has(order.id)) {
            notifiedOrderWarningsRef.current.add(order.id);
            const remainingHours = waitHours - warningHours;
            await addNotification(order.userId, {
              type: 'order_cancel_warning',
              title: 'Order About to Be Cancelled',
              message: `Your order #${order.orderNumber} will be auto-cancelled in less than ${remainingHours} hours if no payment proof is uploaded.`,
              orderId: order.id,
              orderNumber: order.orderNumber
            });
            // Flag the order so we don't send the warning again
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, { cancelWarningNotified: true });
          }
        }
      }
    };

    // Check every 5 minutes
    checkExpiredOrders();
    const interval = setInterval(checkExpiredOrders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [orders, timeSettings]);

  // Warn customers when their reservations are about to expire
  useEffect(() => {
    const checkExpiringReservations = async () => {
      const now = new Date();
      const expiryMinutes = timeSettings.reservationExpiryMinutes || 5;

      for (const reservation of reservations) {
        if (reservation.status !== 'active' || reservation.expiryWarningNotified || reservation.frozenRemainingMs
          || notifiedReservationWarningsRef.current.has(reservation.id)) continue;

        const expiresAt = new Date(reservation.expiresAt);
        const reservedAt = new Date(reservation.reservedAt);
        const totalDuration = expiresAt.getTime() - reservedAt.getTime();
        const remaining = expiresAt.getTime() - now.getTime();

        // Warn at 50% of the expiry window
        if (remaining > 0 && remaining < totalDuration * 0.5) {
          const remainingSeconds = Math.round(remaining / 1000);
          const remainingMin = Math.floor(remainingSeconds / 60);
          const remainingSec = remainingSeconds % 60;
          const timeStr = remainingMin > 0
            ? `${remainingMin} minute${remainingMin > 1 ? 's' : ''}`
            : `${remainingSec} second${remainingSec !== 1 ? 's' : ''}`;

          const product = products.find(p => p.id === reservation.productId);
          const productName = product?.name || 'an item';

          notifiedReservationWarningsRef.current.add(reservation.id);
          await addNotification(reservation.userId, {
            type: 'reservation_expiry_warning',
            title: 'Reservation Expiring Soon',
            message: `Your reservation for ${productName} (×${reservation.quantity || 1}) will expire in approximately ${timeStr}. Head to checkout before it expires!`,
            reservationId: reservation.id
          });

          // Flag so we don't send again
          const reservationRef = doc(db, 'reservations', reservation.id);
          await updateDoc(reservationRef, { expiryWarningNotified: true });
        }
      }
    };

    checkExpiringReservations();
    const interval = setInterval(checkExpiringReservations, 30000);

    return () => clearInterval(interval);
  }, [reservations, products, timeSettings]);

  // Cancel expired order and return stock
  const cancelExpiredOrder = async (order) => {
    try {
      // Re-check from Firestore to avoid duplicate processing
      const orderRef = doc(db, 'orders', order.id);
      const freshSnap = await getDoc(orderRef);
      if (!freshSnap.exists() || freshSnap.data().paymentStatus === 'cancelled') return;

      const batch = writeBatch(db);
      const waitHours = timeSettings.paymentWaitHours || 48;

      // Update order status
      batch.update(orderRef, {
        paymentStatus: 'cancelled',
        orderStatus: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: `No payment proof uploaded within ${waitHours} hours`
      });

      // Return stock for each item
      for (const item of order.items) {
        // Find the reservation
        const reservationQuery = query(
          collection(db, 'reservations'),
          where('id', '==', item.reservationId)
        );
        const reservationSnapshot = await getDocs(reservationQuery);

        if (!reservationSnapshot.empty) {
          const reservationDoc = reservationSnapshot.docs[0];
          const reservationRef = doc(db, 'reservations', reservationDoc.id);
          batch.delete(reservationRef);
        }

        // Return stock to product
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().availableStock || 0;
          batch.update(productRef, {
            availableStock: currentStock + item.quantity
          });
        }
      }

      await batch.commit();

      // Notify the customer
      await addNotification(order.userId, {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been automatically cancelled. Reason: No payment proof uploaded within ${waitHours} hours.`,
        orderId: order.id,
        orderNumber: order.orderNumber
      });

      console.log(`Order ${order.id} auto-cancelled after ${waitHours} hours`);
    } catch (error) {
      console.error('Error cancelling expired order:', error);
    }
  };

  // Admin manual cancel order with reason and stock return
  const adminCancelOrder = async (orderId, reason) => {
    if (!checkOnline()) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) {
        showToast('Order not found.', 'error');
        return;
      }
      const orderData = orderDoc.data();

      const batch = writeBatch(db);

      // Update order status
      batch.update(orderRef, {
        paymentStatus: 'cancelled',
        orderStatus: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: `Cancelled by admin: ${reason}`
      });

      // Return stock for each item
      for (const item of orderData.items) {
        // Delete associated reservation
        if (item.reservationId) {
          const reservationQuery = query(
            collection(db, 'reservations'),
            where('id', '==', item.reservationId)
          );
          const reservationSnapshot = await getDocs(reservationQuery);
          if (!reservationSnapshot.empty) {
            const reservationDoc = reservationSnapshot.docs[0];
            batch.delete(doc(db, 'reservations', reservationDoc.id));
          }
        }

        // Return stock to product
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().availableStock || 0;
          batch.update(productRef, {
            availableStock: currentStock + item.quantity
          });
        }
      }

      await batch.commit();

      // Notify the customer
      await addNotification(orderData.userId, {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${orderData.orderNumber} has been cancelled by the admin. Reason: ${reason}`,
        orderId: orderId,
        orderNumber: orderData.orderNumber
      });

      showToast('Order cancelled successfully. Stock restored.', 'success');
    } catch (error) {
      console.error('Error cancelling order:', error);
      showToast('Failed to cancel order. Please try again.', 'error');
    }
  };

  // Auth handlers
  const handleAuthSuccess = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();

      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        mobileNo: userData?.mobileNo || '',
        homeAddress: userData?.homeAddress || ''
      });

      setIsAdmin(userData?.role === 'admin');
    } catch (error) {
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
      });
      setIsAdmin(false);
    }
  };

  const handleAdminLogin = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();

      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData?.displayName || firebaseUser.displayName || firebaseUser.email.split('@')[0],
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        mobileNo: userData?.mobileNo || '',
        homeAddress: userData?.homeAddress || ''
      });

      setIsAdmin(true);
    } catch (error) {
      console.error('Error fetching admin user data:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      showToast('Logged out successfully!', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Failed to logout. Please try again.', 'error');
    }
  };

  // Update user profile
  const updateUserProfile = async (profileData) => {
    if (!user) return;
    if (!checkOnline()) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, profileData, { merge: true });

      // Update local state
      setUser(prev => ({
        ...prev,
        ...profileData,
        name: profileData.displayName || prev.name
      }));
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Collection operations
  const addCollection = async (collectionData) => {
    if (!checkOnline()) return;
    try {
      await addDoc(collection(db, 'collections'), {
        name: collectionData.name,
        description: collectionData.description || '',
        imageUrl: collectionData.imageUrl || null,
        status: collectionData.status || 'published',
        scheduledDateTime: collectionData.scheduledDateTime || null,
        scheduledDate: collectionData.scheduledDate || null,
        scheduledTime: collectionData.scheduledTime || null,
        createdAt: new Date().toISOString()
      });
      showToast('Collection added successfully!', 'success');
    } catch (error) {
      console.error('Error adding collection:', error);
      showToast('Failed to add collection. Please try again.', 'error');
    }
  };

  const updateCollection = async (collectionId, updates) => {
    if (!checkOnline()) return;
    try {
      const collectionRef = doc(db, 'collections', collectionId);
      await updateDoc(collectionRef, updates);
      showToast('Collection updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating collection:', error);
      showToast('Failed to update collection. Please try again.', 'error');
    }
  };

  const deleteCollection = async (collectionId) => {
    if (!checkOnline()) return;
    try {
      const productsInCollection = products.filter(p => p.collectionId === collectionId);

      if (productsInCollection.length > 0) {
        const batch = writeBatch(db);

        productsInCollection.forEach(product => {
          const productRef = doc(db, 'products', product.id);
          batch.delete(productRef);
        });

        const collectionRef = doc(db, 'collections', collectionId);
        batch.delete(collectionRef);

        await batch.commit();
        showToast(`Collection and ${productsInCollection.length} product(s) deleted successfully!`, 'success');
      } else {
        await deleteDoc(doc(db, 'collections', collectionId));
        showToast('Collection deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      showToast('Failed to delete collection. Please try again.', 'error');
    }
  };

  // Product operations
  const addProduct = async (productData) => {
    if (!checkOnline()) return;
    try {
      await addDoc(collection(db, 'products'), {
        name: productData.name,
        description: productData.description || '',
        price: parseFloat(productData.price),
        totalStock: parseInt(productData.totalStock),
        availableStock: parseInt(productData.availableStock),
        collectionId: productData.collectionId,
        imageUrl: productData.imageUrl || null,
        createdAt: new Date().toISOString()
      });
      showToast('Product added successfully!', 'success');
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Failed to add product. Please try again.', 'error');
    }
  };

  const updateProduct = async (productId, updates) => {
    if (!checkOnline()) return;
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        ...updates,
        price: updates.price ? parseFloat(updates.price) : undefined,
        availableStock: updates.availableStock !== undefined ? parseInt(updates.availableStock) : undefined
      });
      showToast('Product updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Failed to update product. Please try again.', 'error');
    }
  };

  const deleteProducts = async (productIds) => {
    if (!checkOnline()) return;
    try {
      const batch = writeBatch(db);

      productIds.forEach(productId => {
        const productRef = doc(db, 'products', productId);
        batch.delete(productRef);
      });

      const reservationsToDelete = reservations.filter(r => productIds.includes(r.productId));
      reservationsToDelete.forEach(reservation => {
        const reservationRef = doc(db, 'reservations', reservation.id);
        batch.delete(reservationRef);
      });

      await batch.commit();
      showToast(`${productIds.length} product(s) deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting products:', error);
      showToast('Failed to delete products. Please try again.', 'error');
    }
  };

  // Reservation operations
  const reserveProduct = async (productId, quantity = 1) => {
    if (!user) {
      showToast('Please login to reserve products', 'error');
      return;
    }

    if (!checkOnline()) return;

    const product = products.find(p => p.id === productId);
    if (!product) {
      showToast('Product not found', 'error');
      return;
    }

    if (product.availableStock < quantity) {
      showToast('Not enough stock available', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'reservations'), {
        userId: user.id,
        userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
        userEmail: user.email,
        productId,
        quantity,
        status: 'active',
        reservedAt: new Date().toISOString(),
        expiresAt: getReservationExpiration(timeSettings.reservationExpiryMinutes)
      });

      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        availableStock: product.availableStock - quantity
      });

      showToast(`Reserved ${quantity} ${quantity > 1 ? 'items' : 'item'} successfully!`, 'success');
    } catch (error) {
      console.error('Error reserving product:', error);
      showToast('Failed to reserve product. Please try again.', 'error');
    }
  };

  const cancelReservation = async (reservationId) => {
    if (!checkOnline()) return;
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    try {
      await deleteDoc(doc(db, 'reservations', reservationId));

      const product = products.find(p => p.id === reservation.productId);
      if (product) {
        const productRef = doc(db, 'products', reservation.productId);
        const returnQuantity = reservation.quantity || 1;
        await updateDoc(productRef, {
          availableStock: product.availableStock + returnQuantity
        });
      }

      showToast('Reservation cancelled successfully!', 'success');
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      showToast('Failed to cancel reservation. Please try again.', 'error');
    }
  };

  const expireReservation = async (reservationId) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    // Skip if already being processed (prevents duplicate notifications from rapid interval ticks)
    if (notifiedExpiredReservationsRef.current.has(reservationId)) return;
    notifiedExpiredReservationsRef.current.add(reservationId);

    try {
      await updateDoc(doc(db, 'reservations', reservationId), {
        status: 'expired'
      });

      const product = products.find(p => p.id === reservation.productId);
      if (product) {
        const productRef = doc(db, 'products', reservation.productId);
        const returnQuantity = reservation.quantity || 1;
        await updateDoc(productRef, {
          availableStock: product.availableStock + returnQuantity
        });
      }

      // Notify the customer that their reservation expired
      const productName = product?.name || 'an item';
      await addNotification(reservation.userId, {
        type: 'reservation_expired',
        title: 'Reservation Expired',
        message: `Your reservation for ${productName} (×${reservation.quantity || 1}) has expired. The stock has been released.`,
        reservationId: reservationId
      });
    } catch (error) {
      console.error('Error expiring reservation:', error);
    }
  };

  // Freeze countdown - store remaining time in milliseconds and pause expiration
  const freezeReservations = async (userId) => {
    try {
      const userReservations = reservations.filter(
        r => r.userId === userId && r.status === 'active'
      );

      if (userReservations.length === 0) return;

      const batch = writeBatch(db);
      const now = new Date();
      const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year in future

      userReservations.forEach(reservation => {
        // Calculate remaining time in milliseconds
        const expiryTime = new Date(reservation.expiresAt).getTime();
        const remainingMs = Math.max(0, expiryTime - now.getTime());

        // Store the remaining time (not the absolute timestamp)
        frozenTimesRef.current[reservation.id] = remainingMs;

        // Set expiresAt to far future to prevent expiration
        const reservationRef = doc(db, 'reservations', reservation.id);
        batch.update(reservationRef, {
          expiresAt: farFuture,
          frozenRemainingMs: remainingMs // Store remaining time in Firestore too
        });
      });

      await batch.commit();
      console.log('Reservations frozen with remaining times');
    } catch (error) {
      console.error('Error freezing reservations:', error);
    }
  };

  // Unfreeze countdown - calculate new expiresAt based on remaining time
  const unfreezeReservations = async (userId) => {
    try {
      const userReservations = reservations.filter(
        r => r.userId === userId && r.status === 'active'
      );

      if (userReservations.length === 0) return;

      const batch = writeBatch(db);
      const now = new Date();

      userReservations.forEach(reservation => {
        // Get the remaining time from local ref or Firestore
        const remainingMs = frozenTimesRef.current[reservation.id] ?? reservation.frozenRemainingMs;

        if (remainingMs !== undefined && remainingMs !== null) {
          // Calculate new expiration time: current time + remaining time
          const newExpiresAt = new Date(now.getTime() + remainingMs).toISOString();

          const reservationRef = doc(db, 'reservations', reservation.id);
          batch.update(reservationRef, {
            expiresAt: newExpiresAt,
            frozenRemainingMs: null // Clear the frozen marker
          });

          // Clean up local storage
          delete frozenTimesRef.current[reservation.id];
        }
      });

      await batch.commit();
      console.log('Reservations unfrozen - countdown resumed');
    } catch (error) {
      console.error('Error unfreezing reservations:', error);
    }
  };

  // Create order from selected reservations
  const createOrder = async (orderItems, totalAmount, shippingDetails) => {
    if (!user) return null;
    if (!checkOnline()) return null;

    try {
      // Generate order number with ORD prefix + timestamp
      const orderNumber = `ORD${Date.now()}`;

      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.id,
        orderNumber,
        customerName: shippingDetails.name || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
        customerEmail: shippingDetails.email || user.email,
        items: orderItems,
        totalAmount,
        shippingDetails,
        paymentStatus: 'pending',
        paymentProof: null,
        orderStatus: 'pending',
        createdAt: new Date().toISOString()
      });

      // Mark reservations as 'ordered' - this removes them from active reservations
      const batch = writeBatch(db);
      orderItems.forEach(item => {
        const reservationRef = doc(db, 'reservations', item.reservationId);
        batch.update(reservationRef, {
          status: 'ordered',
          orderId: orderRef.id
        });
      });
      await batch.commit();

      showToast('Order created successfully!', 'success');
      return orderRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      showToast('Failed to create order. Please try again.', 'error');
      return null;
    }
  };

  // Update payment proof — uploads image to Firebase Storage instead of base64 in Firestore
  const updateOrderPaymentProof = async (orderId, proofFileOrUrl) => {
    if (!checkOnline()) return false;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      // Get current attempt count (default to 0 if not exists)
      const currentAttempt = orderData.paymentAttempts?.length || 0;
      const newAttemptNumber = currentAttempt + 1;

      // Check if this is beyond the final attempt
      if (newAttemptNumber > 3) {
        showToast('Maximum payment attempts reached. Order has been cancelled.', 'error');
        return false;
      }

      // Upload to Firebase Storage if it's a File object; otherwise use the URL directly
      let proofUrl;
      if (proofFileOrUrl instanceof File) {
        const storageRef = ref(storage, `payment-proofs/${orderId}/attempt-${newAttemptNumber}-${Date.now()}`);
        await uploadBytes(storageRef, proofFileOrUrl);
        proofUrl = await getDownloadURL(storageRef);
      } else {
        proofUrl = proofFileOrUrl;
      }

      // Create new attempt record
      const newAttempt = {
        attemptNumber: newAttemptNumber,
        proofUrl: proofUrl,
        uploadedAt: new Date().toISOString(),
        status: 'pending', // pending, approved, declined
        declinedAt: null,
        declinedReason: null
      };

      // Add to attempts array
      const updatedAttempts = [...(orderData.paymentAttempts || []), newAttempt];

      await updateDoc(orderRef, {
        paymentProofUrl: proofUrl,
        paymentStatus: 'payment_submitted',
        paymentProofUploadedAt: new Date().toISOString(),
        paymentAttempts: updatedAttempts,
        currentAttempt: newAttemptNumber
      });

      const attemptLabel = newAttemptNumber === 1 ? '1st attempt' :
        newAttemptNumber === 2 ? '2nd attempt' :
          'Final attempt';
      showToast(`Payment proof uploaded successfully! (${attemptLabel})`, 'success');
      return true;
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      showToast('Failed to upload payment proof. Please try again.', 'error');
      return false;
    }
  };

  // Update payment settings
  const updatePaymentSettings = async (settings) => {
    if (!checkOnline()) return;
    try {
      const settingsRef = doc(db, 'settings', 'payment');
      await setDoc(settingsRef, settings, { merge: true });
      showToast('Payment settings updated!', 'success');
    } catch (error) {
      console.error('Error updating payment settings:', error);
      showToast('Failed to update payment settings.', 'error');
    }
  };

  // Update time settings
  const updateTimeSettings = async (settings) => {
    if (!checkOnline()) return;
    try {
      const settingsRef = doc(db, 'settings', 'timeSettings');
      await setDoc(settingsRef, settings, { merge: true });
      showToast('Time settings updated!', 'success');
    } catch (error) {
      console.error('Error updating time settings:', error);
      showToast('Failed to update time settings.', 'error');
    }
  };

  // Update invoice settings
  const updateInvoiceSettings = async (settings) => {
    if (!checkOnline()) return;
    try {
      const settingsRef = doc(db, 'settings', 'invoiceSettings');
      await setDoc(settingsRef, settings, { merge: true });
      showToast('Invoice settings updated!', 'success');
    } catch (error) {
      console.error('Error updating invoice settings:', error);
      showToast('Failed to update invoice settings.', 'error');
    }
  };

  // Verify order payment
  const verifyOrderPayment = async (orderId) => {
    if (!checkOnline()) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      // Update the latest attempt to approved
      const paymentAttempts = orderData.paymentAttempts || [];
      const updatedAttempts = paymentAttempts.map((attempt, index) => {
        if (index === paymentAttempts.length - 1) { // Last attempt
          return {
            ...attempt,
            status: 'approved',
            approvedAt: new Date().toISOString()
          };
        }
        return attempt;
      });

      await updateDoc(orderRef, {
        paymentStatus: 'verified',
        orderStatus: 'processing',
        paymentAttempts: updatedAttempts
      });

      // Send notification to customer
      await addNotification(orderData.userId, {
        type: 'payment_verified',
        title: 'Payment Verified',
        message: `Your payment for order #${orderData.orderNumber} has been verified. Your order is now being processed.`,
        orderId: orderId,
        orderNumber: orderData.orderNumber
      });

      showToast('Payment verified successfully!', 'success');
    } catch (error) {
      console.error('Error verifying payment:', error);
      showToast('Failed to verify payment.', 'error');
    }
  };

  const declineOrderPayment = async (orderId) => {
    if (!checkOnline()) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      const currentAttempt = orderData.currentAttempt || 1;
      const paymentAttempts = orderData.paymentAttempts || [];

      // Update the current attempt to declined
      const updatedAttempts = paymentAttempts.map((attempt, index) => {
        if (index === paymentAttempts.length - 1) { // Last attempt
          return {
            ...attempt,
            status: 'declined',
            declinedAt: new Date().toISOString()
          };
        }
        return attempt;
      });

      // If this was the 3rd attempt, cancel the order and restore stock
      if (currentAttempt >= 3) {
        // Restore stock for all items
        const batch = writeBatch(db);

        for (const item of orderData.items) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await getDoc(productRef);
          if (productDoc.exists()) {
            const currentStock = productDoc.data().availableStock || 0;
            batch.update(productRef, {
              availableStock: currentStock + item.quantity
            });
          }
        }

        // Update order to cancelled
        batch.update(orderRef, {
          paymentStatus: 'cancelled',
          orderStatus: 'cancelled',
          paymentAttempts: updatedAttempts,
          cancelledAt: new Date().toISOString(),
          cancellationReason: 'Maximum payment proof attempts (3) reached'
        });

        await batch.commit();

        // Send notification: order cancelled after 3 failed attempts
        await addNotification(orderData.userId, {
          type: 'payment_declined',
          title: 'Order Cancelled',
          message: `Your order #${orderData.orderNumber} has been cancelled after 3 declined payment proofs. Stock has been restored.`,
          orderId: orderId,
          orderNumber: orderData.orderNumber
        });

        showToast('Payment proof declined. Order cancelled after 3 failed attempts. Stock restored.', 'error');
      } else {
        // Just decline and allow customer to re-upload
        await updateDoc(orderRef, {
          paymentStatus: 'pending',
          orderStatus: 'awaiting_payment',
          paymentAttempts: updatedAttempts
        });

        const remainingAttempts = 3 - currentAttempt;

        // Send notification: payment declined with remaining attempts
        await addNotification(orderData.userId, {
          type: 'payment_declined',
          title: 'Payment Proof Declined',
          message: `Your payment proof for order #${orderData.orderNumber} was declined. You have ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
          orderId: orderId,
          orderNumber: orderData.orderNumber
        });

        showToast(`Payment proof declined. Customer has ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`, 'success');
      }
    } catch (error) {
      console.error('Error declining payment:', error);
      showToast('Failed to decline payment.', 'error');
    }
  };

  // Update order tracking information
  const updateOrderTracking = async (orderId, trackingData) => {
    if (!checkOnline()) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      await updateDoc(orderRef, {
        trackingNumber: trackingData.trackingNumber,
        courierName: trackingData.courierName,
        orderStatus: 'shipped',
        trackingUpdatedAt: new Date().toISOString()
      });

      // Send notification: order handed to courier
      await addNotification(orderData.userId, {
        type: 'order_shipped',
        title: 'Order Handed to Courier',
        message: `Your order #${orderData.orderNumber} has been handed to ${trackingData.courierName}. Tracking number: ${trackingData.trackingNumber}`,
        orderId: orderId,
        orderNumber: orderData.orderNumber
      });

      showToast('Tracking information updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating tracking:', error);
      showToast('Failed to update tracking information.', 'error');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <ReservationManager
          reservations={reservations}
          expireReservation={expireReservation}
          user={user}
          freezeReservations={freezeReservations}
          unfreezeReservations={unfreezeReservations}
        />

        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to={isAdmin ? "/admin" : "/store"} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={isAdmin ? "/admin" : "/store"} replace />
              ) : (
                <>
                  <AuthView onAuthSuccess={handleAuthSuccess} showToast={showToast} />
                  {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </>
              )
            }
          />

          <Route
            path="/admin/login"
            element={
              user && isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <>
                  <AdminLogin onAdminLogin={handleAdminLogin} showToast={showToast} />
                  {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </>
              )
            }
          />

          <Route
            path="/admin/register"
            element={
              user && isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <>
                  <AdminOnboarding onAdminCreated={handleAdminLogin} showToast={showToast} />
                  {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                </>
              )
            }
          />

          <Route
            path="/store"
            element={
              user ? (
                <StoreViewWrapper
                  collections={collections}
                  products={products}
                  user={user}
                  reserveProduct={reserveProduct}
                  logout={logout}
                  reservations={reservations}
                  isAdmin={isAdmin}
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                  dataLoading={dataLoading}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/my-reservations"
            element={
              user ? (
                <MyReservationsWrapper
                  reservations={reservations.filter(r => r.userId === user.id && r.status === 'active')}
                  products={products}
                  cancelReservation={cancelReservation}
                  logout={logout}
                  user={user}
                  isAdmin={isAdmin}
                  collections={collections}
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                  dataLoading={dataLoading}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/my-account"
            element={
              user ? (
                <MyAccount
                  user={user}
                  updateUserProfile={updateUserProfile}
                  logout={logout}
                  isAdmin={isAdmin}
                  collections={collections}
                  reservations={reservations.filter(r => r.userId === user.id && r.status === 'active')}
                  showToast={showToast}
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/my-orders"
            element={
              user ? (
                <MyOrders
                  user={user}
                  orders={orders}
                  products={products}
                  logout={logout}
                  isAdmin={isAdmin}
                  collections={collections}
                  reservations={reservations.filter(r => r.userId === user.id && r.status === 'active')}
                  updateOrderPaymentProof={updateOrderPaymentProof}
                  showToast={showToast}
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                  dataLoading={dataLoading}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/checkout"
            element={
              user ? (
                <Checkout
                  reservations={reservations.filter(r => r.userId === user.id && r.status === 'active')}
                  products={products}
                  user={user}
                  logout={logout}
                  isAdmin={isAdmin}
                  collections={collections}
                  createOrder={createOrder}
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                  dataLoading={dataLoading}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/payment/:orderId"
            element={
              user ? (
                <PaymentPage
                  orders={orders}
                  paymentSettings={paymentSettings}
                  user={user}
                  logout={logout}
                  isAdmin={isAdmin}
                  collections={collections}
                  reservations={reservations.filter(r => r.userId === user.id && r.status === 'active')}
                  updateOrderPaymentProof={updateOrderPaymentProof}
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                  invoiceSettings={invoiceSettings}
                  timeSettings={timeSettings}
                  dataLoading={dataLoading}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/admin"
            element={
              user && isAdmin ? (
                <AdminPanelWrapper
                  collections={collections}
                  products={products}
                  addCollection={addCollection}
                  addProduct={addProduct}
                  updateProduct={updateProduct}
                  deleteProducts={deleteProducts}
                  deleteCollection={deleteCollection}
                  logout={logout}
                  reservations={reservations}
                  showToast={showToast}
                  updateCollection={updateCollection}
                  orders={orders}
                  paymentSettings={paymentSettings}
                  updatePaymentSettings={updatePaymentSettings}
                  verifyOrderPayment={verifyOrderPayment}
                  declineOrderPayment={declineOrderPayment}
                  updateOrderTracking={updateOrderTracking}
                  timeSettings={timeSettings}
                  updateTimeSettings={updateTimeSettings}
                  invoiceSettings={invoiceSettings}
                  updateInvoiceSettings={updateInvoiceSettings}
                  adminCancelOrder={adminCancelOrder}
                  dataLoading={dataLoading}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;