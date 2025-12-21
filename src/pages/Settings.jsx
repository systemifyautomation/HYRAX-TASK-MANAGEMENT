import React, { useState } from 'react';
import { useApp } from '../context/AuthContext';
import { Save, User, Bell, Lock, Globe, Palette, Database, Shield } from 'lucide-react';
import { isAdmin } from '../constants/roles';

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

  const handleSave = () => {
    alert('Settings saved successfully!');
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
