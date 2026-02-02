import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, X, Shield, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { isAdmin, isSuperAdmin, USER_ROLES, ROLE_LABELS, normalizeRole } from '../constants/roles';

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

const UserManagement = () => {
  const { currentUser, users, loadUsers, refreshUsersFromServer, addUser, updateUser, deleteUser } = useApp();
  const isAdminUser = isAdmin(currentUser.role);
  const isSuperAdminUser = isSuperAdmin(currentUser.role);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webhookUsers, setWebhookUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'team_member',
    department: 'MEDIA BUYING',
  });

  // Load users from webhook when component mounts
  useEffect(() => {
    const fetchUsersFromWebhook = async () => {
      setLoading(true);
      try {
        const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
        if (!webhookUrl) {
          console.error('VITE_GET_USERS_WEBHOOK_URL not configured');
          await loadUsers();
          setLoading(false);
          return;
        }
        const response = await fetch(webhookUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Users from webhook:', data);
          // Normalize roles from webhook format to internal format
          const normalizedUsers = data.map(user => ({
            ...user,
            role: normalizeRole(user.role)
          }));
          setWebhookUsers(normalizedUsers);
        } else {
          console.error('Failed to fetch users from webhook');
          // Fallback to local users
          await loadUsers();
        }
      } catch (error) {
        console.error('Failed to load users from webhook:', error);
        // Fallback to local users
        await loadUsers();
      } finally {
        setLoading(false);
      }
    };

    fetchUsersFromWebhook();
  }, []); // Empty dependency array to run only once on mount

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
      if (!webhookUrl) {
        console.error('VITE_GET_USERS_WEBHOOK_URL not configured');
        await loadUsers();
        setLoading(false);
        return;
      }
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Refreshed users from webhook:', data);
        // Normalize roles from webhook format to internal format
        const normalizedUsers = data.map(user => ({
          ...user,
          role: normalizeRole(user.role)
        }));
        setWebhookUsers(normalizedUsers);
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
      await loadUsers();
    } finally {
      setLoading(false);
    }
  };

  // Use webhook users if available, otherwise fallback to context users
  const displayUsers = webhookUsers.length > 0 ? webhookUsers : users;

 

  // Redirect if not admin
  if (!isAdminUser) {
    return (
      <div className="p-8">
        <div className="card text-center py-12">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (formData.name && formData.email && formData.role && formData.department) {
      setSubmitting(true);
      try {
        // Generate hash code using admin's credentials
        const todayUTC = getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || ''; // You'll need to store this during login
        const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

        // Get current website URL
        const websiteUrl = window.location.origin;

        // Send POST request to webhook
        const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
        if (!webhookUrl) {
          console.error('VITE_GET_USERS_WEBHOOK_URL not configured');
          alert('Webhook configuration error. Please contact administrator.');
          setSubmitting(false);
          return;
        }
        const webhookParams = new URLSearchParams({
          email: formData.email,
          name: formData.name,
          role: formData.role,
          department: formData.department
        });

        const response = await fetch(`${webhookUrl}?${webhookParams}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'website-url': websiteUrl
          },
          body: JSON.stringify({
            code: code,
            added_by: adminEmail
          })
        });

        if (response.status === 200) {
          console.log('User created successfully via webhook');
          alert('User created successfully! Password has been sent to the user via Slack.');
          // Refresh the user list
          await handleRefresh();
          resetForm();
        } else if (response.status === 400) {
          // Get error message from webhook
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Failed to create user';
          console.error('Webhook error:', errorMessage);
          alert(`Error: ${errorMessage}`);
        } else {
          console.error('Failed to create user via webhook, status:', response.status);
          alert('Failed to create user. Please try again.');
        }
      } catch (error) {
        console.error('Error creating user:', error);
        alert('Error creating user. Please check your connection and try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'team_member',
      department: 'MEDIA BUYING',
    });
    setShowAddModal(false);
    setEditingUser(null);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData(user);
    setShowAddModal(true);
  };

  const getRoleBadge = (role) => {
    const normalized = normalizeRole(role);
    switch (normalized) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'manager':
        return 'bg-blue-100 text-blue-700';
      case 'user':
        return 'bg-green-100 text-green-700';
      case 'team_member':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role) => {
    const normalized = normalizeRole(role);
    return ROLE_LABELS[normalized] || role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const canEditUser = (user) => {
    // Super admin can edit anyone
    if (isSuperAdminUser) return true;
    // Regular admin can only edit team members
    const normalizedUserRole = normalizeRole(user.role);
    if (isAdminUser && normalizedUserRole === 'team_member') return true;
    return false;
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    
    if (formData.name && formData.email && formData.role && formData.department) {
      setSubmitting(true);
      try {
        // Generate hash code using admin's credentials (same as add user)
        const todayUTC = getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || '';
        const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

        // Build query parameters with all user info
        const queryParams = new URLSearchParams({
          id: editingUser.id.toString(),
          email: formData.email,
          name: formData.name,
          role: formData.role,
          department: formData.department
        });

        // Send PATCH request to webhook
        const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
        const response = await fetch(`${webhookUrl}?${queryParams}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: code,
            modified_by: currentUser.email
          })
        });

        if (response.ok) {
          console.log('User updated successfully via webhook');
          alert('User updated successfully!');
          // Also update via API
          await updateUser(editingUser.id, formData);
          // Refresh the user list
          await handleRefresh();
          resetForm();
        } else {
          console.error('Failed to update user via webhook, status:', response.status);
          alert('Failed to update user. Please try again.');
        }
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user. Please check your connection and try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-gray-600 mt-2">Manage team members and their roles</p>
          {loading && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Loading users...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <img 
                      src="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" 
                      alt="Loading..." 
                      className="w-48 h-48 object-contain mb-4 rounded-lg"
                    />
                    <p className="text-gray-500 font-medium">Loading users from server...</p>
                  </div>
                </td>
              </tr>
            ) : displayUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No users found</p>
                </td>
              </tr>
            ) : (
              displayUsers.map((user) => (
                <tr key={user.id || user.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {normalizeRole(user.role) === 'super_admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {user.department || 'Not Assigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {canEditUser(user) && (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser.id && (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-md border border-red-600 rounded-xl shadow-2xl max-w-lg w-full p-6" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-600">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g., john@hyrax.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  disabled={!isSuperAdminUser && editingUser?.role !== 'team_member'}
                >
                  <option value="team_member">Team Member</option>
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  {isSuperAdminUser && <option value="admin">Admin</option>}
                  {isSuperAdminUser && <option value="super_admin">Super Admin</option>}
                </select>
                {!isSuperAdminUser && (
                  <p className="text-xs text-gray-400 mt-1">
                    Only Super Admins can assign Admin and Super Admin roles
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Department</label>
                <select
                  value={formData.department || 'MEDIA BUYING'}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-red-600"
                >
                  <option value="DEV">DEV</option>
                  <option value="MEDIA BUYING">MEDIA BUYING</option>
                  <option value="VIDEO EDITING">VIDEO EDITING</option>
                  <option value="GRAPHIC DESIGN">GRAPHIC DESIGN</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button 
                onClick={editingUser ? handleUpdate : handleSubmit} 
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/50"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {editingUser ? 'Updating User...' : 'Creating User...'}
                  </div>
                ) : (
                  editingUser ? 'Update User' : 'Add User'
                )}
              </button>
              <button 
                onClick={resetForm} 
                disabled={submitting}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
