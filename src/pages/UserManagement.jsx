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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    initials: '',
    role: 'team_member',
    department: 'MEDIA BUYING',
    password: '', // Optional password reset
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (formData.name && formData.email && formData.role && formData.department) {
      setSubmitting(true);
      try {
        // Generate hash code using admin's credentials
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || ''; // You'll need to store this during login
        const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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
          initials: formData.initials || '',
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
      initials: '',
      role: 'team_member',
      department: 'MEDIA BUYING',
      password: '',
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
        return 'bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-white';
      case 'admin':
        return 'bg-red-100 dark:bg-red-600 text-red-700 dark:text-white';
      case 'manager':
        return 'bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-white';
      case 'user':
        return 'bg-green-100 dark:bg-green-600 text-green-700 dark:text-white';
      case 'team_member':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role) => {
    const normalized = normalizeRole(role);
    return ROLE_LABELS[normalized] || role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setSubmitting(true);
    try {
      // Generate hash code using admin's credentials
      const loginDate = localStorage.getItem('login_date') || getTodayUTC();
      const adminEmail = currentUser.email;
      const adminPassword = localStorage.getItem('admin_password') || '';
      const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

      // Build query parameters with user ID
      const queryParams = new URLSearchParams({
        id: userToDelete.id.toString()
      });

      // Send DELETE request to webhook
      const webhookUrl = import.meta.env.VITE_GET_USERS_WEBHOOK_URL || 'https://workflows.wearehyrax.com/webhook/users-webhook';
      const response = await fetch(`${webhookUrl}?${queryParams}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          deleted_by: adminEmail
        })
      });

      if (response.ok) {
        console.log('User deleted successfully via webhook');
        
        // Also delete from local storage
        await deleteUser(userToDelete.id);
        
        // Refresh the user list
        await handleRefresh();
        
        // Close modal
        setDeleteConfirmModal(false);
        setUserToDelete(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to delete user. Please try again.';
        console.error('Failed to delete user via webhook, status:', response.status);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmModal(false);
    setUserToDelete(null);
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
      // Validate password if provided
      if (formData.password && formData.password.trim() !== '') {
        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters long');
          return;
        }
      }

      setSubmitting(true);
      try {
        // Generate hash code using admin's credentials (same as add user)
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || '';
        const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

        // Build query parameters with all user info
        const queryParams = new URLSearchParams({
          id: editingUser.id.toString(),
          email: formData.email,
          name: formData.name,
          initials: formData.initials || '',
          role: formData.role,
          department: formData.department
        });
        
        // Add password to query params if provided
        const isResettingPassword = formData.password && formData.password.trim() !== '';
        if (isResettingPassword) {
          queryParams.set('password', formData.password);
        }

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
          
          // If admin is changing their own password, update localStorage
          const isChangingOwnPassword = isResettingPassword && editingUser.email === currentUser.email;
          if (isChangingOwnPassword) {
            localStorage.setItem('admin_password', formData.password);
            console.log('Updated stored password for current user');
          }
          
          const successMessage = isResettingPassword 
            ? (isChangingOwnPassword 
                ? 'Your password has been updated successfully! You will be logged out in 3 seconds to re-authenticate.' 
                : 'User updated successfully! New password has been sent to the user via Slack.')
            : 'User updated successfully!';
          alert(successMessage);
          
          // Also update via API
          await updateUser(editingUser.id, formData);
          // Refresh the user list
          await handleRefresh();
          resetForm();
          
          // If admin changed their own password, log them out after 3 seconds
          if (isChangingOwnPassword) {
            setTimeout(() => {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('current_user');
              localStorage.removeItem('login_date');
              window.location.reload();
            }, 3000);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Failed to update user. Please try again.';
          console.error('Failed to update user via webhook, status:', response.status);
          alert(errorMessage);
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
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage team members and their roles</p>
          {loading && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading users...</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Initials</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Department</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <img 
                      src="https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" 
                      alt="Loading..." 
                      className="w-48 h-48 object-contain mb-4 rounded-lg"
                    />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading users from server...</p>
                  </div>
                </td>
              </tr>
            ) : displayUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No users found</p>
                </td>
              </tr>
            ) : (
              displayUsers.map((user) => (
                <tr key={user.id || user.email} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {user.initials || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {normalizeRole(user.role) === 'super_admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white">
                      {user.department || 'Not Assigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {canEditUser(user) && (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser.id && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="text-red-600 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                              disabled={submitting}
                              title="Delete user"
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
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g., john@hyrax.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">Initials</label>
                <input
                  type="text"
                  value={formData.initials}
                  onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g., JD"
                  maxLength="5"
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

              {editingUser && (
                <div className="pt-4 border-t border-red-600/30">
                  <label className="block text-sm font-medium text-white mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Only fill this in if you want to reset the user's password. New password will be sent to user via Slack.
                  </p>
                </div>
              )}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-md border border-red-600 rounded-xl shadow-2xl max-w-md w-full p-6" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-600">Delete User</h3>
              </div>
              <button onClick={cancelDelete} className="text-gray-400 hover:text-white" disabled={submitting}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-white text-sm">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Name:</span>
                  <span className="text-white font-medium text-sm">{userToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Email:</span>
                  <span className="text-white font-medium text-sm">{userToDelete.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Role:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(userToDelete.role)}`}>
                    {getRoleLabel(userToDelete.role)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Department:</span>
                  <span className="text-white font-medium text-sm">{userToDelete.department || 'Not Assigned'}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={confirmDelete} 
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete User
                    </>
                  )}
                </button>
                <button 
                  onClick={cancelDelete} 
                  disabled={submitting}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
