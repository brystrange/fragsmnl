import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Clock, LogOut, Search, SlidersHorizontal, X, Menu, ChevronDown, ChevronUp, User, ArrowLeft, FileText, CreditCard, Bell, CheckCircle, AlertTriangle, Truck, XCircle, Ban, Timer } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const StoreNavbar = ({
    collections,
    user,
    logout,
    reservations,
    isAdmin,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showAdvancedSearch,
    setShowAdvancedSearch,
    activeFilterCount,
    clearFilters,
    showSearch = true,
    pageTitle = null,
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [expandedNotifId, setExpandedNotifId] = useState(null);
    const overflowMap = useRef({});
    const dropdownRef = useRef(null);
    const hamburgerRef = useRef(null);
    const notifRef = useRef(null);

    const userReservations = reservations?.filter(r => r.userId === user?.id && r.status === 'active') || [];

    // Filter to only show PUBLISHED collections in navigation
    const publishedCollections = collections?.filter(c => (c.status || 'published') === 'published') || [];

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
            if (hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
                setShowHamburgerMenu(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Time ago helper
    const timeAgo = (dateStr) => {
        const now = new Date();
        const date = new Date(dateStr);
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    };

    // Notification icon & color by type
    const getNotifStyle = (type) => {
        switch (type) {
            case 'payment_verified':
                return { icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' };
            case 'payment_declined':
                return { icon: XCircle, bg: 'bg-red-100', color: 'text-red-600' };
            case 'order_shipped':
                return { icon: Truck, bg: 'bg-blue-100', color: 'text-blue-600' };
            case 'order_cancel_warning':
                return { icon: AlertTriangle, bg: 'bg-amber-100', color: 'text-amber-600' };
            case 'order_cancelled':
                return { icon: Ban, bg: 'bg-rose-100', color: 'text-rose-600' };
            case 'reservation_expired':
                return { icon: Timer, bg: 'bg-orange-100', color: 'text-orange-600' };
            case 'reservation_expiry_warning':
                return { icon: Clock, bg: 'bg-purple-100', color: 'text-accent-700' };
            default:
                return { icon: Bell, bg: 'bg-gray-100', color: 'text-gray-600' };
        }
    };

    return (
        <>
            {/* Preview Mode Bar - Only shown for admins */}
            {isAdmin && (
                <div className="bg-red-50 border-b-2 border-red-400 px-4 py-2">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-700 font-semibold text-sm">Preview Mode</span>
                            <span className="text-red-600 text-sm">— You are viewing the store as customers see it</span>
                        </div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to Admin Panel
                        </button>
                    </div>
                </div>
            )}

            {/* Main Navbar - Fixed Height */}
            <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16">
                    <div className="flex items-center justify-between gap-4 h-full">
                        {/* Left Section: Hamburger + Logo */}
                        <div className="flex items-center gap-3">
                            {/* Hamburger Menu */}
                            {publishedCollections && publishedCollections.length > 0 && (
                                <div className="relative" ref={hamburgerRef}>
                                    <button
                                        onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        <Menu className="w-5 h-5 text-gray-600" />
                                    </button>

                                    {showHamburgerMenu && (
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <h3 className="font-semibold text-gray-800">Categories</h3>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                <button
                                                    onClick={() => {
                                                        if (setFilters) setFilters({ ...filters, collection: '' });
                                                        setShowHamburgerMenu(false);
                                                        if (location.pathname !== '/store') navigate('/store');
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center gap-2 ${!filters?.collection ? 'text-accent-700 bg-slate-50' : 'text-gray-700'}`}
                                                >
                                                    <ShoppingBag className="w-4 h-4" />
                                                    All Products
                                                </button>
                                                {publishedCollections.map(col => (
                                                    <button
                                                        key={col.id}
                                                        onClick={() => {
                                                            if (setFilters) setFilters({ ...filters, collection: col.id });
                                                            setShowHamburgerMenu(false);
                                                            if (location.pathname !== '/store') navigate('/store');
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center gap-2 ${filters?.collection === col.id ? 'text-accent-700 bg-slate-50' : 'text-gray-700'}`}
                                                    >
                                                        {col.imageUrl ? (
                                                            <img src={col.imageUrl} alt={col.name} className="w-6 h-6 rounded object-cover" />
                                                        ) : (
                                                            <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                                                                <ShoppingBag className="w-3 h-3 text-accent-700" />
                                                            </div>
                                                        )}
                                                        {col.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => navigate('/store')}
                            >
                                <ShoppingBag className="w-6 h-6 text-accent-700" />
                                <h1 className="text-base font-bold text-gray-800">
                                    {pageTitle || 'FRAGS.mnl'}
                                </h1>
                            </div>
                        </div>

                        {/* Center: Search Bar */}
                        {showSearch && (
                            <div className="flex-1 max-w-xl">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery || ''}
                                        onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                                        placeholder="Search products..."
                                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent text-sm"
                                    />
                                    {setShowAdvancedSearch && (
                                        <button
                                            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md transition ${showAdvancedSearch ? 'bg-slate-100 text-accent-700' : 'hover:bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Right Section: User & Checkout */}
                        <div className="flex items-center gap-3">
                            {/* Checkout Button */}
                            <button
                                onClick={() => navigate('/checkout')}
                                className="relative flex items-center gap-2 px-4 py-2 hover:bg-green-50 rounded-lg transition"
                            >
                                <ShoppingBag className="w-5 h-5 text-green-600" />
                                <span className="hidden sm:inline text-sm font-medium text-green-600">Checkout</span>
                                {userReservations.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {userReservations.length}
                                    </span>
                                )}
                            </button>

                            {/* Notification Bell */}
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                        {/* Header */}
                                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-800">Notifications</h3>
                                            {unreadCount > 0 && markAllNotificationsRead && (
                                                <button
                                                    onClick={() => markAllNotificationsRead()}
                                                    className="text-xs text-accent-700 hover:text-accent-800 font-medium"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        {/* Notification List */}
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="px-4 py-8 text-center">
                                                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500">No notifications yet</p>
                                                </div>
                                            ) : (
                                                notifications.slice(0, 20).map(notif => {
                                                    const style = getNotifStyle(notif.type);
                                                    const IconComp = style.icon;
                                                    const isExpanded = expandedNotifId === notif.id;
                                                    return (
                                                        <button
                                                            key={notif.id}
                                                            onClick={() => {
                                                                if (!notif.read && markNotificationRead) {
                                                                    markNotificationRead(notif.id);
                                                                }
                                                                // If already expanded, navigate
                                                                if (isExpanded) {
                                                                    setExpandedNotifId(null);
                                                                    setShowNotifications(false);
                                                                    navigate('/my-orders');
                                                                    return;
                                                                }
                                                                // If message overflows (is clamped), expand it first
                                                                if (overflowMap.current[notif.id]) {
                                                                    setExpandedNotifId(notif.id);
                                                                } else {
                                                                    // Short message — navigate immediately
                                                                    setShowNotifications(false);
                                                                    navigate('/my-orders');
                                                                }
                                                            }}
                                                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3 border-b border-gray-50 last:border-0 ${!notif.read ? 'bg-slate-50/50' : ''}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg}`}>
                                                                <IconComp className={`w-4 h-4 ${style.color}`} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                                        {notif.title}
                                                                    </p>
                                                                    {!notif.read && (
                                                                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                                                    )}
                                                                </div>
                                                                <p
                                                                    ref={el => {
                                                                        if (el) {
                                                                            overflowMap.current[notif.id] = el.scrollHeight > el.clientHeight;
                                                                        }
                                                                    }}
                                                                    className={`text-xs text-gray-500 mt-0.5 ${isExpanded ? '' : 'line-clamp-2'}`}
                                                                >
                                                                    {notif.message}
                                                                </p>
                                                                {isExpanded && (
                                                                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
                                                                        <ChevronUp className="w-3 h-3" />
                                                                        Tap again to view order
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {timeAgo(notif.createdAt)}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-accent-700" />
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                </button>

                                {showUserDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                                        {/* Clickable User Info - links to My Account */}
                                        <button
                                            onClick={() => {
                                                navigate('/my-account');
                                                setShowUserDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-stone-100 transition cursor-pointer"
                                        >
                                            <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                                            <p className="text-xs text-gray-500">{user?.email}</p>
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate('/my-reservations');
                                                setShowUserDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-stone-100 transition flex items-center gap-3 text-gray-700" style={{ fontSize: '14px' }}
                                        >
                                            <Clock className="w-4 h-4" />
                                            My Reservations
                                            {userReservations.length > 0 && (
                                                <span className="ml-auto bg-slate-100 text-accent-800 text-xs px-2 py-0.5 rounded-full">
                                                    {userReservations.length}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate('/my-orders');
                                                setShowUserDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-stone-100 transition flex items-center gap-3 text-gray-700" style={{ fontSize: '14px' }}
                                        >
                                            <FileText className="w-4 h-4" />
                                            My Orders
                                        </button>
                                        <div className="border-t border-gray-100 mt-1 pt-1">
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setShowUserDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition flex items-center gap-3 text-red-600" style={{ fontSize: '14px' }}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Search Panel */}
                {showAdvancedSearch && publishedCollections && publishedCollections.length > 0 && setFilters && (
                    <div className="border-t border-gray-200">
                        <div className="max-w-7xl mx-auto px-4 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-800">Advanced Filters</h3>
                                <button
                                    onClick={() => setShowAdvancedSearch(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
                                    <select
                                        value={filters?.collection || ''}
                                        onChange={(e) => setFilters({ ...filters, collection: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:outline-none text-sm"
                                    >
                                        <option value="">All Collections</option>
                                        {publishedCollections.map(col => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={filters?.minPrice || ''}
                                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                        placeholder="₱0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={filters?.maxPrice || ''}
                                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                        placeholder="Any"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:outline-none text-sm"
                                    />
                                </div>

                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters?.inStock || false}
                                            onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
                                            className="w-4 h-4 text-accent-700 border-gray-300 rounded focus:ring-accent-600"
                                        />
                                        <span className="text-sm text-gray-700">In Stock Only</span>
                                    </label>
                                </div>
                            </div>

                            {activeFilterCount > 0 && clearFilters && (
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-accent-700 hover:text-accent-800 font-medium"
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default StoreNavbar;