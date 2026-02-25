import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, ArrowLeft, Save, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from './StoreNavbar';

const MyAccount = ({ user, updateUserProfile, logout, isAdmin, collections, reservations, showToast, notifications, markNotificationRead, markAllNotificationsRead }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        mobileNo: user?.mobileNo || '',
        homeAddress: user?.homeAddress || ''
    });

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUserProfile({
                mobileNo: formData.mobileNo,
                homeAddress: formData.homeAddress
            });
            showToast('Profile updated successfully!', 'success');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Failed to update profile. Please try again.', 'error');
        }
        setIsSaving(false);
    };

    const handleCancel = () => {
        setFormData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            mobileNo: user?.mobileNo || '',
            homeAddress: user?.homeAddress || ''
        });
        setIsEditing(false);
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
                pageTitle="My Account"
                notifications={notifications}
                markNotificationRead={markNotificationRead}
                markAllNotificationsRead={markAllNotificationsRead}
            />

            <div className="max-w-2xl mx-auto p-3 sm:p-6">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[12px] text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Profile Card */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden text-[12px] sm:text-[14px]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-accent-700 to-accent-800 px-4 sm:px-6 py-5 sm:py-8 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <User className="w-8 h-8 sm:w-10 sm:h-10 text-accent-700" />
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-white">
                            {formData.firstName || formData.lastName
                                ? `${formData.firstName} ${formData.lastName}`.trim()
                                : user?.name || 'My Account'}
                        </h1>
                        <p className="text-slate-200 mt-1 text-xs sm:text-sm">{formData.email}</p>
                    </div>

                    {/* Profile Form */}
                    <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Personal Information</h2>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 text-accent-700 hover:bg-slate-50 rounded-lg transition font-medium"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 btn-accent px-4 py-2 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Name Fields (Read-only) */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] sm:text-sm font-medium text-gray-700 mb-1">
                                        <User className="w-4 h-4 inline mr-1" />
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        disabled
                                        className="w-full px-4 py-2.5 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                        placeholder="First name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] sm:text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        disabled
                                        className="w-full px-4 py-2.5 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                        placeholder="Last name"
                                    />
                                </div>
                            </div>

                            {/* Email Field (Read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Mail className="w-4 h-4 inline mr-1" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full px-4 py-2.5 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                            </div>

                            {/* Mobile Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Phone className="w-4 h-4 inline mr-1" />
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobileNo}
                                    onChange={(e) => handleChange('mobileNo', e.target.value)}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent ${isEditing ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                    placeholder="Enter mobile number"
                                />
                            </div>

                            {/* Home Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Home Address
                                </label>
                                <textarea
                                    value={formData.homeAddress}
                                    onChange={(e) => handleChange('homeAddress', e.target.value)}
                                    disabled={!isEditing}
                                    rows={3}
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent resize-none ${isEditing ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                    placeholder="Enter complete address"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyAccount;