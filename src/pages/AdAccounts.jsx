import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useApp } from '../context/AuthContext';
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

const AdAccounts = () => {
  const { currentUser, campaigns } = useApp();
  const [adAccounts, setAdAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    Ad_Account_ID: '',
    Campaign: '',
    V: '',
    BM_ID: '',
    ADSPOWER: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, accountId: null });

  const isAdminUser = currentUser ? isAdmin(currentUser.role) : false;

  useEffect(() => {
    if (isAdminUser) {
      fetchAdAccounts();
    }
  }, [isAdminUser]);

  const fetchAdAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Generate hash code using admin's credentials
      const todayUTC = getTodayUTC();
      const adminEmail = currentUser.email;
      const adminPassword = localStorage.getItem('admin_password') || '';
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/ad-accounts';
      
      const params = new URLSearchParams({
        code: code,
        requested_by: adminEmail
      });
      
      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ad Accounts from webhook:', data);
        console.log('Number of accounts:', data.length);
        console.log('Is array:', Array.isArray(data));
        // Ensure data is always an array
        const accountsArray = Array.isArray(data) ? data : [data];
        console.log('Setting accounts:', accountsArray.length);
        setAdAccounts(accountsArray);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch ad accounts:', errorText);
        setError('Failed to fetch ad accounts. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
      setError('Error fetching ad accounts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setEditForm({ ...account });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (accountId) => {
    try {
      const todayUTC = getTodayUTC();
      const adminEmail = currentUser.email;
      const adminPassword = localStorage.getItem('admin_password') || '';
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/ad-accounts';
      
      const params = new URLSearchParams({
        code: code,
        requested_by: adminEmail
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedAccount = await response.json();
        setAdAccounts(adAccounts.map(acc => acc.id === accountId ? updatedAccount : acc));
        setEditingId(null);
        setEditForm({});
      } else {
        const errorText = await response.text();
        console.error('Failed to update ad account:', errorText);
        alert('Failed to update ad account. Please try again.');
      }
    } catch (err) {
      console.error('Error updating ad account:', err);
      alert('Error updating ad account. Please check your connection.');
    }
  };

  const handleDelete = async (accountId) => {
    try {
      const todayUTC = getTodayUTC();
      const adminEmail = currentUser.email;
      const adminPassword = localStorage.getItem('admin_password') || '';
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/ad-accounts';
      
      const params = new URLSearchParams({
        code: code,
        requested_by: adminEmail,
        id: accountId
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setAdAccounts(adAccounts.filter(acc => acc.id !== accountId));
        setDeleteConfirm({ show: false, accountId: null });
      } else {
        const errorText = await response.text();
        console.error('Failed to delete ad account:', errorText);
        alert('Failed to delete ad account. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting ad account:', err);
      alert('Error deleting ad account. Please check your connection.');
    }
  };

  const handleAdd = async () => {
    try {
      const todayUTC = getTodayUTC();
      const adminEmail = currentUser.email;
      const adminPassword = localStorage.getItem('admin_password') || '';
      const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

      const webhookUrl = 'https://workflows.wearehyrax.com/webhook/ad-accounts';
      
      const params = new URLSearchParams({
        code: code,
        requested_by: adminEmail
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addForm)
      });

      if (response.ok) {
        const newAccount = await response.json();
        setAdAccounts([...adAccounts, newAccount]);
        setShowAddModal(false);
        setAddForm({
          Ad_Account_ID: '',
          Campaign: '',
          V: '',
          BM_ID: '',
          ADSPOWER: ''
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to add ad account:', errorText);
        alert('Failed to add ad account. Please try again.');
      }
    } catch (err) {
      console.error('Error adding ad account:', err);
      alert('Error adding ad account. Please check your connection.');
    }
  };

  if (!isAdminUser) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Access Denied</h2>
          <p className="text-yellow-700">You don't have permission to view ad accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ad Accounts</h1>
        <p className="text-gray-600 mt-2">Manage and view all advertising accounts</p>
      </div>

      {/* Refresh Button */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={fetchAdAccounts}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Ad Account
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ad accounts...</p>
          </div>
        </div>
      )}

      {/* Ad Accounts Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ad Account ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    V
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BM ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ADSPOWER
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No ad accounts found
                    </td>
                  </tr>
                ) : (
                  adAccounts.map((account, index) => {
                    const isEditing = editingId === account.id;
                    return (
                      <tr key={account.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.Ad_Account_ID || ''}
                              onChange={(e) => setEditForm({ ...editForm, Ad_Account_ID: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            account.Ad_Account_ID || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <select
                              value={editForm.Campaign || ''}
                              onChange={(e) => setEditForm({ ...editForm, Campaign: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">Select Campaign</option>
                              {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.name}>
                                  {campaign.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            account.Campaign || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.V || ''}
                              onChange={(e) => setEditForm({ ...editForm, V: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            account.V || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.BM_ID || ''}
                              onChange={(e) => setEditForm({ ...editForm, BM_ID: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            account.BM_ID || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.ADSPOWER || ''}
                              onChange={(e) => setEditForm({ ...editForm, ADSPOWER: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            account.ADSPOWER || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(account.id)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(account)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ show: true, accountId: account.id })}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && adAccounts.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Total Ad Accounts: <span className="font-semibold">{adAccounts.length}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Delete Ad Account</h2>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this ad account? All associated data will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm.accountId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm({ show: false, accountId: null })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Ad Account</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Account ID
                </label>
                <input
                  type="text"
                  value={addForm.Ad_Account_ID}
                  onChange={(e) => setAddForm({ ...addForm, Ad_Account_ID: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter Ad Account ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign
                </label>
                <select
                  value={addForm.Campaign}
                  onChange={(e) => setAddForm({ ...addForm, Campaign: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.name}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  V
                </label>
                <input
                  type="text"
                  value={addForm.V}
                  onChange={(e) => setAddForm({ ...addForm, V: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter V"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BM ID
                </label>
                <input
                  type="text"
                  value={addForm.BM_ID}
                  onChange={(e) => setAddForm({ ...addForm, BM_ID: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter BM ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ADSPOWER
                </label>
                <input
                  type="text"
                  value={addForm.ADSPOWER}
                  onChange={(e) => setAddForm({ ...addForm, ADSPOWER: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter ADSPOWER"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Add Account
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
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

export default AdAccounts;
