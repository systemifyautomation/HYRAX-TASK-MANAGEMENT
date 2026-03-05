import React, { useState } from 'react';
import { useApp } from '../context/AuthContext';
import { Save, User, Bell, Lock, Globe, Palette, Database, Shield, Key } from 'lucide-react';
import { isAdmin } from '../constants/roles';

// Hash function to generate code
const hashThreeInputs = async (input1, input2, input3) => {
  const combined = input1.toString() + input2.toString() + input3.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Helper function to get today's date in UTC format dd/MM/yyyy
const getTodayUTC = () => {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const Settings = () => {
  const { currentUser } = useApp();
  const isAdminUser = isAdmin(currentUser.role);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    avatar: currentUser.avatar,
    notifications: {
      email: true,
      push: true,
      taskAssigned: true,
      taskCompleted: false,
      campaignUpdates: true,
    },
    appearance: {
      theme: 'light',
      compactMode: false,
      showAvatars: true,
    },
    privacy: {
      profileVisible: true,
      activityVisible: false,
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  const handlePasswordReset = async () => {
    // Clear previous messages
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);

    try {
      // Generate hash code using current credentials
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const userEmail = currentUser.email;
      const currentPasswordHash = await hashThreeInputs(userEmail, passwordData.currentPassword, loginDate);

      // Build query parameters for PATCH request
      const queryParams = new URLSearchParams({
        id: currentUser.id.toString(),
        email: userEmail,
        name: currentUser.name,
        role: currentUser.role,
        department: currentUser.department || '',
        password: passwordData.newPassword // Send new password
      });

      // Send PATCH request to webhook
      const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
      const response = await fetch(`${webhookUrl}?${queryParams}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: currentPasswordHash,
          modified_by: userEmail
        })
      });

      if (response.ok) {
        console.log('Password updated successfully via webhook');
        setPasswordSuccess('Password updated successfully! You will be logged out in 3 seconds...');
        
        // Update localStorage with new password
        localStorage.setItem('admin_password', passwordData.newPassword);
        
        // Clear form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Log out user after 3 seconds to re-authenticate
        setTimeout(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('current_user');
          localStorage.removeItem('login_date');
          window.location.reload();
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to update password. Please check your current password and try again.';
        console.error('Failed to update password via webhook, status:', response.status);
        setPasswordError(errorMessage);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError('Error updating password. Please check your connection and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    ...(isAdmin ? [
      { id: 'workspace', label: 'Workspace', icon: Globe },
      { id: 'security', label: 'Security', icon: Shield },
      { id: 'data', label: 'Data', icon: Database },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title">
            Settings
          </h1>
          <p className="text-white mt-2">Manage your account and preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-gray-900 border border-red-600/30 rounded-xl shadow-lg p-2" style={{ boxShadow: '0 0 20px rgba(220, 38, 38, 0.2)' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-150 ${
                      activeTab === tab.id
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/50'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-black border border-red-600 rounded-xl shadow-2xl p-8" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}>
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Profile Information</h2>
                    <p className="text-white">Update your personal information and avatar</p>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-red-600/50">
                      {formData.avatar}
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg shadow-red-600/50">
                        Change Avatar
                      </button>
                      <p className="text-sm text-gray-400 mt-2">Click to update your avatar emoji</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Role</label>
                    <input
                      type="text"
                      value={currentUser.role.replace(/_/g, ' ').toUpperCase()}
                      disabled
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
                    />
                  </div>

                  {/* Password Reset Section */}
                  <div className="pt-6 mt-6 border-t border-red-600/30">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center">
                        <Key className="w-5 h-5 mr-2" />
                        Change Password
                      </h3>
                      <p className="text-white text-sm">Update your password to keep your account secure</p>
                    </div>

                    {passwordError && (
                      <div className="mb-4 p-4 bg-red-900/50 border border-red-600 rounded-lg">
                        <p className="text-red-200 text-sm">{passwordError}</p>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="mb-4 p-4 bg-green-900/50 border border-green-600 rounded-lg">
                        <p className="text-green-200 text-sm">{passwordSuccess}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                          placeholder="Enter current password"
                          disabled={passwordLoading}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">New Password</label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                            placeholder="Enter new password"
                            disabled={passwordLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                            placeholder="Confirm new password"
                            disabled={passwordLoading}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handlePasswordReset}
                        disabled={passwordLoading}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-lg shadow-red-600/50 transition-all duration-200 flex items-center space-x-2"
                      >
                        {passwordLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5" />
                            <span>Update Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Notification Preferences</h2>
                    <p className="text-white">Choose how you want to be notified</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Email Notifications</p>
                        <p className="text-sm text-gray-400">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.email}
                          onChange={(e) => setFormData({
                            ...formData,
                            notifications: { ...formData.notifications, email: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Push Notifications</p>
                        <p className="text-sm text-gray-400">Receive push notifications in browser</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.push}
                          onChange={(e) => setFormData({
                            ...formData,
                            notifications: { ...formData.notifications, push: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Task Assigned</p>
                        <p className="text-sm text-gray-400">When a task is assigned to you</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.taskAssigned}
                          onChange={(e) => setFormData({
                            ...formData,
                            notifications: { ...formData.notifications, taskAssigned: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Campaign Updates</p>
                        <p className="text-sm text-gray-400">Updates about campaigns you're part of</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.campaignUpdates}
                          onChange={(e) => setFormData({
                            ...formData,
                            notifications: { ...formData.notifications, campaignUpdates: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Appearance Settings</h2>
                    <p className="text-white">Customize how the app looks</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['light', 'dark', 'auto'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setFormData({ ...formData, appearance: { ...formData.appearance, theme } })}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            formData.appearance.theme === theme
                              ? 'border-red-600 bg-gray-900 shadow-lg shadow-red-600/30'
                              : 'border-gray-700 bg-gray-900 hover:border-red-600/50'
                          }`}
                        >
                          <div className="text-center">
                            <p className="font-medium text-white capitalize">{theme}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Compact Mode</p>
                        <p className="text-sm text-gray-400">Use smaller spacing and elements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.appearance.compactMode}
                          onChange={(e) => setFormData({
                            ...formData,
                            appearance: { ...formData.appearance, compactMode: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Show Avatars</p>
                        <p className="text-sm text-gray-400">Display user avatars in lists and tables</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.appearance.showAvatars}
                          onChange={(e) => setFormData({
                            ...formData,
                            appearance: { ...formData.appearance, showAvatars: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Privacy Settings</h2>
                    <p className="text-white">Control your privacy and visibility</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Profile Visible</p>
                        <p className="text-sm text-gray-400">Allow others to view your profile</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.privacy.profileVisible}
                          onChange={(e) => setFormData({
                            ...formData,
                            privacy: { ...formData.privacy, profileVisible: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 border border-red-600/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">Activity Visible</p>
                        <p className="text-sm text-gray-400">Show your recent activity to team members</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.privacy.activityVisible}
                          onChange={(e) => setFormData({
                            ...formData,
                            privacy: { ...formData.privacy, activityVisible: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-600/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Tab (Admin Only) */}
              {activeTab === 'workspace' && isAdmin && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Workspace Settings</h2>
                    <p className="text-white">Manage workspace-wide settings</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Workspace Name</label>
                    <input
                      type="text"
                      defaultValue="Hyrax Task Management"
                      className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Default Role for New Users</label>
                    <select className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600">
                      <option value="team_member">Team Member</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Time Zone</label>
                    <select className="w-full px-4 py-2.5 bg-gray-900 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600">
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Security Tab (Admin Only) */}
              {activeTab === 'security' && isAdmin && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
                    <p className="text-gray-500">Configure security and access controls</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900 mb-2">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account</p>
                      <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900 mb-2">Active Sessions</p>
                      <p className="text-sm text-gray-500 mb-3">Manage your active login sessions</p>
                      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        Sign Out All Devices
                      </button>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900 mb-2">Password</p>
                      <p className="text-sm text-gray-500 mb-3">Change your password regularly to keep your account secure</p>
                      <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Tab (Admin Only) */}
              {activeTab === 'data' && isAdmin && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Management</h2>
                    <p className="text-gray-500">Export, import, and manage your data</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="font-medium text-blue-900 mb-2">Export Data</p>
                      <p className="text-sm text-blue-700 mb-3">Download all your workspace data as JSON or CSV</p>
                      <div className="flex space-x-3">
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          Export as JSON
                        </button>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          Export as CSV
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="font-medium text-amber-900 mb-2">Import Data</p>
                      <p className="text-sm text-amber-700 mb-3">Import tasks and campaigns from a file</p>
                      <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">
                        Import Data
                      </button>
                    </div>

                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-900 mb-2">Danger Zone</p>
                      <p className="text-sm text-red-700 mb-3">Permanently delete all workspace data. This action cannot be undone.</p>
                      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        Delete All Data
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-6 border-t border-red-600/30 mt-8">
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg shadow-red-600/50 transition-all duration-200 flex items-center space-x-2 hover:scale-105"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
