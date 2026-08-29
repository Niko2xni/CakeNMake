import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ClientNavbar from '@/components/client/ClientNavbar';
import { User, Bell, Palette, Shield, ChevronRight, Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    username: 'Cake Lover',
    email: 'user@example.com',
    notifications: {
      email: true,
      push: true,
      orderUpdates: true,
      promotions: false
    },
    theme: 'light',
    language: 'en'
  });

  const handleSave = () => {
    // Save settings logic here
    console.log('Settings saved:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <ClientNavbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">
            Settings
          </h1>

          {/* Account Settings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-pink-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-100 rounded-lg">
                <User className="w-6 h-6 text-pink-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Account Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={settings.username}
                  onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-rose-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Bell className="w-6 h-6 text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Notification Settings</h2>
            </div>
            
            <div className="space-y-4">
              {Object.entries({
                email: 'Email Notifications',
                push: 'Push Notifications',
                orderUpdates: 'Order Updates',
                promotions: 'Promotional Emails'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-700">{label}</span>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        [key]: !settings.notifications[key]
                      }
                    })}
                    className={`w-14 h-8 rounded-full p-1 transition-colors ${
                      settings.notifications[key] ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                        settings.notifications[key] ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Palette className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-pink-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Shield className="w-6 h-6 text-pink-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Security</h2>
            </div>
            
            <div className="space-y-3">
              <Link
                to="/change-password"
                className="flex items-center justify-between p-4 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors"
              >
                <span className="text-gray-700">Change Password</span>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>
              <Link
                to="/two-factor"
                className="flex items-center justify-between p-4 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors"
              >
                <span className="text-gray-700">Two-Factor Authentication</span>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link
              to="/client"
              className="px-6 py-3 border border-pink-300 text-pink-600 rounded-xl hover:bg-pink-50 transition-colors font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
