import React, { useState } from 'react';
import { ShoppingBag, Mail, Lock, User, Phone, MapPin, CheckCircle } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

const AuthView = ({ onAuthSuccess, showToast }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // For Google sign-in additional info
  const [showGoogleExtraInfo, setShowGoogleExtraInfo] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);

  const validateSignUp = () => {
    if (!firstName.trim()) {
      showToast('Please enter your first name', 'warning');
      return false;
    }
    if (!lastName.trim()) {
      showToast('Please enter your last name', 'warning');
      return false;
    }
    if (!mobileNo.trim()) {
      showToast('Please enter your mobile number', 'warning');
      return false;
    }
    if (!email.trim()) {
      showToast('Please enter your email address', 'warning');
      return false;
    }
    if (!homeAddress.trim()) {
      showToast('Please enter your home address', 'warning');
      return false;
    }
    if (!password) {
      showToast('Please enter a password', 'warning');
      return false;
    }
    if (password.length < 6) {
      showToast('Password should be at least 6 characters', 'warning');
      return false;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return false;
    }
    return true;
  };

  const saveUserToFirestore = async (userId, userData) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        role: 'customer',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const handleEmailAuth = async () => {
    if (!isSignUp) {
      // Sign In - just need email and password
      if (!email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
      }
    } else {
      // Sign Up - validate all fields
      if (!validateSignUp()) return;
    }

    setLoading(true);

    try {
      let userCredential;

      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = `${firstName} ${lastName}`;
        await updateProfile(userCredential.user, { displayName });

        // Save user data to Firestore
        await saveUserToFirestore(userCredential.user.uid, {
          firstName,
          lastName,
          email,
          mobileNo,
          homeAddress,
          displayName
        });

        showToast('Account created successfully!', 'success');
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back!', 'success');
      }

      onAuthSuccess(userCredential.user);
    } catch (err) {
      console.error('Auth error:', err);

      if (err.code === 'auth/email-already-in-use') {
        showToast('Email already in use. Try signing in instead.', 'error');
      } else if (err.code === 'auth/weak-password') {
        showToast('Password should be at least 6 characters.', 'error');
      } else if (err.code === 'auth/user-not-found') {
        showToast('No account found. Please sign up first.', 'error');
      } else if (err.code === 'auth/wrong-password') {
        showToast('Incorrect password.', 'error');
      } else if (err.code === 'auth/invalid-email') {
        showToast('Invalid email address.', 'error');
      } else if (err.code === 'auth/invalid-credential') {
        showToast('Invalid email or password.', 'error');
      } else {
        showToast('Authentication failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));

      if (!userDoc.exists()) {
        // New user - need to collect additional info
        setGoogleUser(result.user);
        setEmail(result.user.email || '');
        // Try to split display name into first/last
        const nameParts = (result.user.displayName || '').split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
        setShowGoogleExtraInfo(true);
        setLoading(false);
        return;
      }

      // Existing user - proceed directly
      showToast('Signed in with Google successfully!', 'success');
      onAuthSuccess(result.user);
    } catch (err) {
      console.error('Google sign-in error:', err);

      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Sign-in cancelled.', 'info');
      } else if (err.code === 'auth/popup-blocked') {
        showToast('Popup blocked. Please allow popups for this site.', 'error');
      } else {
        showToast('Google sign-in failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleExtraInfoSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !mobileNo.trim() || !homeAddress.trim()) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    setLoading(true);

    try {
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(googleUser, { displayName });

      await saveUserToFirestore(googleUser.uid, {
        firstName,
        lastName,
        email: googleUser.email,
        mobileNo,
        homeAddress,
        displayName
      });

      showToast('Account setup complete!', 'success');
      onAuthSuccess(googleUser);
    } catch (error) {
      console.error('Error completing setup:', error);
      showToast('Failed to complete setup. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Google extra info form
  if (showGoogleExtraInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">Almost There!</h1>
          <p className="text-center text-gray-600 mb-6">
            Please complete your profile to continue
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="John"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Doe"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Mobile No. *
              </label>
              <input
                type="tel"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="09XX XXX XXXX"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Home Address *
              </label>
              <textarea
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="Street, City, Province"
                rows="2"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleGoogleExtraInfoSubmit}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Mine Shop</h1>
        <p className="text-center text-gray-600 mb-6">
          {isSignUp ? 'Create your account' : 'Welcome back!'}
        </p>

        <div className="space-y-3">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="John"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Mobile No. *
                </label>
                <input
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="09XX XXX XXXX"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Home Address *
                </label>
                <textarea
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Street, City, Province"
                  rows="2"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="w-4 h-4 inline mr-1" />
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 inline mr-1" />
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="••••••••"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleEmailAuth()}
              />
            </div>
          )}

          {!isSignUp && (
            <div className="hidden">
              <input
                type="password"
                onKeyPress={(e) => e.key === 'Enter' && handleEmailAuth()}
              />
            </div>
          )}

          <button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          <div className="text-center mt-2">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                // Reset form
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;