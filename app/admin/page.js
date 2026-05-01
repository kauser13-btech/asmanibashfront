'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user', status: 'approved' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const { user, loading: authLoading, logout, isAdmin, isUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !isAdmin && !isUser) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, isUser, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, filter]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        filter === 'pending' ? api.getPendingUsers() : api.getAllUsers(),
        api.getStats(),
      ]);
      setUsers(usersData.users);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    setActionLoading(id);
    try {
      await api.approveUser(id);
      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id) {
    setActionLoading(id);
    try {
      await api.rejectUser(id);
      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(id);
    try {
      await api.deleteUser(id);
      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'user', status: 'approved' });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(u) {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role, status: u.status });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingUser(null);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await api.updateUser(editingUser.id, updateData);
      } else {
        await api.createUser(formData);
      }
      closeModal();
      await loadData();
    } catch (error) {
      if (error.data?.errors) {
        const messages = Object.values(error.data.errors).flat().join(', ');
        setFormError(messages);
      } else {
        setFormError(error.message || 'Something went wrong');
      }
    } finally {
      setFormLoading(false);
    }
  }

  if (authLoading || !user || (!isAdmin && !isUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{isAdmin ? 'Admin Panel' : 'Reports'}</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/flats"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              {isAdmin ? 'Manage Flats' : 'View Flats'}
            </Link>
            <Link
              href="/admin/bills"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Bills Report
            </Link>
            <Link
              href="/admin/expenses"
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Expenses Report
            </Link>
            <Link
              href="/admin/balance"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Balance Report
            </Link>
          </div>
        </div>

        {isAdmin && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
              <div className="text-gray-500">Total Users</div>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{stats.pending_users}</div>
              <div className="text-yellow-600">Pending</div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.approved_users}</div>
              <div className="text-green-600">Approved</div>
            </div>
            <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.rejected_users}</div>
              <div className="text-red-600">Rejected</div>
            </div>
          </div>
        )}

        {isAdmin && <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded ${
                  filter === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Users
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Users
              </button>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Create User
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {filter === 'pending' ? 'No pending users' : 'No users found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  {filter === 'all' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.email}
                    </td>
                    {filter === 'all' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              u.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : u.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {(filter === 'pending' || u.status === 'pending') && (
                        <>
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {filter === 'all' && (
                        <>
                          <button
                            onClick={() => openEditModal(u)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={actionLoading === u.id}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>}
      </div>

      {isAdmin && showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser && <span className="text-gray-400">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
