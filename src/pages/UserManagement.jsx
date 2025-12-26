import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, X, Shield, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { isAdmin, isSuperAdmin, USER_ROLES, ROLE_LABELS } from '../constants/roles';

const UserManagement = () => {
  const { currentUser, users, loadUsers, refreshUsersFromServer, addUser, updateUser, deleteUser } = useApp();
  const isAdminUser = isAdmin(currentUser.role);
  const isSuperAdminUser = isSuperAdmin(currentUser.role);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'team_member',
  });

  // Load users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        await loadUsers();
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array to run only once on mount

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadUsers();
    } catch (error) {
      console.error('Failed to refresh users:', error);
    } finally {
      setLoading(false);
    }
  };

 

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

  const handleSubmit = () => {
    if (formData.name && formData.email && (!editingUser ? formData.password : true)) {
      const userData = {
        ...formData,
      };
      
      if (editingUser) {
        updateUser(editingUser.id, userData);
      } else {
        addUser(userData);
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
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
    switch (role) {
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
    return ROLE_LABELS[role] || role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const canEditUser = (user) => {
    // Super admin can edit anyone
    if (isSuperAdminUser) return true;
    // Regular admin can only edit team members
    if (isAdminUser && user.role === 'team_member') return true;
    return false;
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
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500">Loading users from server...</p>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No users found</p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
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
                      {user.role === 'super_admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-red-600 rounded-xl shadow-2xl max-w-lg w-full p-6" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
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

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                    placeholder="Enter a secure password"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Password is required for new users
                  </p>
                </div>
              )}

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
              <button onClick={handleSubmit} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/50">
                {editingUser ? 'Update User' : 'Add User'}
              </button>
              <button onClick={resetForm} className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all">
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
