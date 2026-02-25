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
import { auth, db } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
  setDoc
} from 'firebase/firestore';

// Wrapper components
const AdminPanelWrapper = ({ collections, products, addCollection, addProduct, updateProduct, deleteProducts, deleteCollection, logout, reservations, showToast, updateCollection, orders, paymentSettings, updatePaymentSettings, verifyOrderPayment, declineOrderPayment, updateOrderTracking }) => {
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
    />
  );
};

const StoreViewWrapper = ({ collections, products, user, reserveProduct, logout, reservations, isAdmin }) => {
  return (
    <StoreView
      collections={collections}
      products={products}
      user={user}
      reserveProduct={reserveProduct}
      logout={logout}
      reservations={reservations}
      isAdmin={isAdmin}
    />
  );
};

const MyReservationsWrapper = ({ reservations, products, cancelReservation, logout, user, isAdmin, collections }) => {
  return (
    <MyReservations
      reservations={reservations}
      products={products}
      cancelReservation={cancelReservation}
      logout={logout}
      user={user}
      isAdmin={isAdmin}
      collections={collections}
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

  // Store frozen expiration times
  const frozenTimesRef = useRef({});

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
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
    }, (error) => {
      console.error('Error listening to collections:', error);
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
    }, (error) => {
      console.error('Error listening to products:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time reservations listener
  useEffect(() => {
    const q = query(collection(db, 'reservations'), orderBy('reservedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReservations(reservationsData);
    }, (error) => {
      console.error('Error listening to reservations:', error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time orders listener
  useEffect(() => {
    if (!user) return;

    const ordersRef = collection(db, 'orders');
    const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    }, (error) => {
      console.error('Error listening to orders:', error);
    });

    return () => unsubOrders();
  }, [user]);

  // Load payment settings
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'payment');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setPaymentSettings(docSnap.data());
      }
    }, (error) => {
      console.error('Error listening to payment settings:', error);
    });

    return () => unsubSettings();
  }, []);

  // Auto-cancel orders without payment proof after 48 hours
  useEffect(() => {
    const checkExpiredOrders = async () => {
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      for (const order of orders) {
        // Only check orders that are pending payment (no proof uploaded)
        if (order.paymentStatus === 'pending' && !order.paymentProofUrl) {
          const orderCreatedAt = new Date(order.createdAt);
          
          // If order is older than 48 hours, cancel it
          if (orderCreatedAt < fortyEightHoursAgo) {
            await cancelExpiredOrder(order.id, order.items);
          }
        }
      }
    };

    // Check every 5 minutes
    checkExpiredOrders();
    const interval = setInterval(checkExpiredOrders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [orders]);

  // Cancel expired order and return stock
  const cancelExpiredOrder = async (orderId, orderItems) => {
    try {
      const batch = writeBatch(db);

      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      batch.update(orderRef, {
        paymentStatus: 'cancelled',
        orderStatus: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: 'No payment proof uploaded within 48 hours'
      });

      // Return stock for each item
      for (const item of orderItems) {
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
      console.log(`Order ${orderId} auto-cancelled after 48 hours`);
    } catch (error) {
      console.error('Error cancelling expired order:', error);
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

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, profileData);

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
        expiresAt: getReservationExpiration()
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

  // Update payment proof
  const updateOrderPaymentProof = async (orderId, proofUrl) => {
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
    try {
      const settingsRef = doc(db, 'settings', 'payment');
      await setDoc(settingsRef, settings, { merge: true });
      showToast('Payment settings updated!', 'success');
    } catch (error) {
      console.error('Error updating payment settings:', error);
      showToast('Failed to update payment settings.', 'error');
    }
  };

  // Verify order payment
  const verifyOrderPayment = async (orderId) => {
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
      showToast('Payment verified successfully!', 'success');
    } catch (error) {
      console.error('Error verifying payment:', error);
      showToast('Failed to verify payment.', 'error');
    }
  };

  const declineOrderPayment = async (orderId) => {
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
            const currentStock = productDoc.data().stock || 0;
            batch.update(productRef, {
              stock: currentStock + item.quantity
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
        showToast('Payment proof declined. Order cancelled after 3 failed attempts. Stock restored.', 'error');
      } else {
        // Just decline and allow customer to re-upload
        await updateDoc(orderRef, {
          paymentStatus: 'pending',
          orderStatus: 'awaiting_payment',
          paymentAttempts: updatedAttempts
        });
        
        const remainingAttempts = 3 - currentAttempt;
        showToast(`Payment proof declined. Customer has ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`, 'success');
      }
    } catch (error) {
      console.error('Error declining payment:', error);
      showToast('Failed to decline payment.', 'error');
    }
  };

  // Update order tracking information
const updateOrderTracking = async (orderId, trackingData) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      trackingNumber: trackingData.trackingNumber,
      courierName: trackingData.courierName,
      trackingUpdatedAt: new Date().toISOString()
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
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
                />
              ) : (
                <Navigate to="/admin/login" replace />
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