import React, { useState, useEffect } from 'react';
import { Save, QrCode } from 'lucide-react';

const Settings = ({ paymentSettings, updatePaymentSettings, showToast }) => {
  const [formData, setFormData] = useState({
    gcashNumber: '',
    gcashName: '',
    payMayaNumber: '',
    payMayaName: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    qrCodeUrl: ''
  });
  const [qrPreview, setQrPreview] = useState('');

  useEffect(() => {
    if (paymentSettings) {
      setFormData(paymentSettings);
      setQrPreview(paymentSettings.qrCodeUrl || '');
    }
  }, [paymentSettings]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQrCodeChange = (e) => {
    const url = e.target.value;
    setFormData({ ...formData, qrCodeUrl: url });
    setQrPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updatePaymentSettings(formData);
    showToast('Payment settings updated successfully!', 'success');
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Settings</h2>
        <p className="text-gray-600 mb-6">Configure payment methods for customer checkout.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><QrCode className="w-5 h-5" />QR Code Payment</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Code Image URL</label>
                <input type="url" name="qrCodeUrl" value={formData.qrCodeUrl} onChange={handleQrCodeChange} placeholder="https://example.com/qr-code.png" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                <p className="text-xs text-gray-500 mt-1">Upload QR code to image hosting and paste URL</p>
              </div>
              <div>{qrPreview && (<div><p className="text-sm font-medium text-gray-700 mb-2">Preview</p><div className="border rounded-lg p-4 bg-gray-50 flex justify-center"><img src={qrPreview} alt="QR Preview" className="w-32 h-32 object-contain" onError={() => setQrPreview('')} /></div></div>)}</div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">GCash</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">GCash Number</label><input type="tel" name="gcashNumber" value={formData.gcashNumber} onChange={handleChange} placeholder="09XXXXXXXXX" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label><input type="text" name="gcashName" value={formData.gcashName} onChange={handleChange} placeholder="Juan Dela Cruz" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PayMaya</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">PayMaya Number</label><input type="tel" name="payMayaNumber" value={formData.payMayaNumber} onChange={handleChange} placeholder="09XXXXXXXXX" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label><input type="text" name="payMayaName" value={formData.payMayaName} onChange={handleChange} placeholder="Juan Dela Cruz" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Transfer</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label><input type="text" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="BDO, BPI, etc." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label><input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} placeholder="1234567890" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label><input type="text" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} placeholder="Juan Dela Cruz" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" /></div>
            </div>
          </div>

          <div className="border-t pt-6">
            <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"><Save className="w-4 h-4" />Save Settings</button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Fill in at least one payment method</li>
          <li>• Use image hosting for QR codes (Imgur, Google Drive)</li>
          <li>• Verify account details are accurate</li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;