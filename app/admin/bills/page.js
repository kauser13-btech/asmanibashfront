'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BillsReportPage() {
  const [data, setData] = useState(null);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  const [loadingMonthly, setLoadingMonthly] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({
    bill_date: '',
    flat_id: '',
    service_type: '',
    details: '',
    amount: '',
    status: 'Due',
    for_month: '',
    year: new Date().getFullYear(),
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [filters, setFilters] = useState({ flat_id: '', status: '' });
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
    if (isAdmin || isUser) {
      loadReport();
    }
  }, [isAdmin, isUser, filters]);

  async function loadReport() {
    setLoading(true);
    try {
      const params = {};
      if (filters.flat_id) params.flat_id = filters.flat_id;
      if (filters.status) params.status = filters.status;

      const result = await api.getBillsReport(params);
      setData(result);
      setFlats(result.filters.flats);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    try {
      const params = {};
      if (filters.flat_id) params.flat_id = filters.flat_id;
      if (filters.status) params.status = filters.status;

      const result = await api.getBillsReport(params);
      setData(result);
      setFlats(result.filters.flats);

      if (expandedYear) {
        const monthParams = { year: expandedYear, ...params };
        const monthResult = await api.getBillsReport(monthParams);
        setMonthlyData(prev => ({ ...prev, [expandedYear]: monthResult.monthly }));
      } else {
        setMonthlyData({});
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  async function toggleYearAccordion(year) {
    if (expandedYear === year) {
      setExpandedYear(null);
      setExpandedMonth(null);
      return;
    }

    setExpandedYear(year);
    setExpandedMonth(null);

    // Load monthly data if not already loaded
    if (!monthlyData[year]) {
      setLoadingMonthly(prev => ({ ...prev, [year]: true }));
      try {
        const params = { year };
        if (filters.flat_id) params.flat_id = filters.flat_id;
        if (filters.status) params.status = filters.status;
        const result = await api.getBillsReport(params);
        setMonthlyData(prev => ({ ...prev, [year]: result.monthly }));
      } catch (error) {
        console.error('Failed to load monthly data:', error);
      } finally {
        setLoadingMonthly(prev => ({ ...prev, [year]: false }));
      }
    }
  }

  function toggleMonthAccordion(month) {
    if (expandedMonth === month) {
      setExpandedMonth(null);
    } else {
      setExpandedMonth(month);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    setActionLoading(id);
    try {
      await api.deleteBill(id);
      await loadReport();
      setMonthlyData({});
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusToggle(bill) {
    setActionLoading(bill.id);
    try {
      const newStatus = bill.status === 'Paid' ? 'Due' : 'Paid';
      await api.updateBill(bill.id, { status: newStatus });
      await loadReport();
      setMonthlyData({});
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  function openCreateModal() {
    setEditingBill(null);
    setFormData({
      bill_date: new Date().toISOString().split('T')[0],
      flat_id: '',
      service_type: 'Monthly Service Charge',
      details: '',
      amount: '',
      status: 'Due',
      for_month: MONTHS[new Date().getMonth()],
      year: new Date().getFullYear(),
    });
    setFormError('');
    setSuccessMessage('');
    setShowModal(true);
  }

  function openEditModal(bill) {
    setEditingBill(bill);
    setFormData({
      bill_date: bill.bill_date.split('T')[0],
      flat_id: bill.flat_id,
      service_type: bill.service_type,
      details: bill.details || '',
      amount: bill.amount,
      status: bill.status,
      for_month: bill.for_month,
      year: bill.year,
    });
    setFormError('');
    setSuccessMessage('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingBill(null);
    setFormError('');
    setSuccessMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setFormLoading(true);

    try {
      const payload = {
        flat_id: formData.flat_id === 'all' ? 'all' : parseInt(formData.flat_id),
        bill_date: formData.bill_date,
        service_type: formData.service_type,
        details: formData.details,
        amount: parseFloat(formData.amount),
        status: formData.status,
        for_month: formData.for_month,
        year: parseInt(formData.year),
      };

      if (editingBill) {
        await api.updateBill(editingBill.id, payload);
        setSuccessMessage('Bill updated successfully!');
        await refreshData();
        setTimeout(() => closeModal(), 1200);
      } else {
        const result = await api.createBill(payload);
        if (formData.flat_id === 'all') {
          setSuccessMessage(result.message);
          setFormData({
            bill_date: new Date().toISOString().split('T')[0],
            flat_id: '',
            service_type: 'Monthly Service Charge',
            details: '',
            amount: '',
            status: 'Due',
            for_month: MONTHS[new Date().getMonth()],
            year: new Date().getFullYear(),
          });
          await refreshData();
        } else {
          await refreshData();
          closeModal();
        }
      }
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

  function formatAmount(amount) {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    }).format(amount);
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
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-blue-600 hover:text-blue-800">
              &larr; Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Bills Report</h1>
          </div>
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
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Total Bills</div>
                <div className="text-2xl font-bold text-gray-900">{data.summary.total_bills}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Paid Bills</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.paid_bills}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Due Bills</div>
                <div className="text-2xl font-bold text-red-600">{data.summary.due_bills}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-lg font-bold text-gray-900">{formatAmount(data.summary.total_amount)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Paid Amount</div>
                <div className="text-lg font-bold text-green-600">{formatAmount(data.summary.paid_amount)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500">Due Amount</div>
                <div className="text-lg font-bold text-red-600">{formatAmount(data.summary.due_amount)}</div>
              </div>
            </div>

            {/* Filters & Add Button */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flat</label>
                    <select
                      value={filters.flat_id}
                      onChange={(e) => {
                        setFilters({ ...filters, flat_id: e.target.value });
                        setMonthlyData({});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Flats</option>
                      {flats.map((flat) => (
                        <option key={flat.id} value={flat.id}>
                          {flat.flat_number} - {flat.owner_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => {
                        setFilters({ ...filters, status: e.target.value });
                        setMonthlyData({});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setFilters({ flat_id: '', status: '' });
                      setMonthlyData({});
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Clear Filters
                  </button>
                </div>
                {isAdmin && (
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Bill
                  </button>
                )}
              </div>
            </div>

            {/* Yearly Breakdown */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Yearly Breakdown</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {data.yearly?.map((yearData) => {
                  const isExpanded = expandedYear === yearData.year;
                  const yearMonthly = monthlyData[yearData.year] || [];
                  const isLoadingYear = loadingMonthly[yearData.year];

                  return (
                    <div key={yearData.year}>
                      {/* Year Row - Clickable Accordion Header */}
                      <div
                        onClick={() => toggleYearAccordion(yearData.year)}
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-lg font-bold text-gray-900">{yearData.year}</span>
                          <span className="text-sm text-gray-500">({yearData.count} bills)</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="hidden md:flex items-center gap-4">
                            <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">
                              Paid: {formatAmount(yearData.paid)} ({yearData.paid_count})
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">
                              Due: {formatAmount(yearData.due)} ({yearData.due_count})
                            </span>
                          </div>
                          <div className="text-right min-w-[140px]">
                            <div className="text-xs text-gray-500">Total</div>
                            <div className="text-lg font-bold text-gray-900">{formatAmount(yearData.total)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Breakdown - Accordion Content */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                          {isLoadingYear ? (
                            <div className="text-center text-gray-500 py-4">Loading monthly data...</div>
                          ) : (
                            <div className="space-y-2">
                              {yearMonthly.map((monthData) => {
                                const isMonthExpanded = expandedMonth === `${yearData.year}-${monthData.month}`;
                                const monthKey = `${yearData.year}-${monthData.month}`;

                                return (
                                  <div key={monthKey} className="bg-white rounded-lg shadow-sm overflow-hidden">
                                    {/* Month Row */}
                                    <div
                                      onClick={() => toggleMonthAccordion(monthKey)}
                                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <svg
                                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isMonthExpanded ? 'rotate-90' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <span className="font-medium text-gray-900">{monthData.month}</span>
                                        <span className="text-sm text-gray-500">({monthData.count} bills)</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="text-xs text-green-600">Paid: {formatAmount(monthData.paid)}</span>
                                        <span className="text-xs text-red-600">Due: {formatAmount(monthData.due)}</span>
                                        <span className="font-bold text-gray-900">{formatAmount(monthData.total)}</span>
                                      </div>
                                    </div>

                                    {/* Bills List */}
                                    <div
                                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                        isMonthExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                      }`}
                                    >
                                      <div className="border-t border-gray-100">
                                        {monthData.bills?.length === 0 ? (
                                          <div className="px-4 py-3 text-center text-gray-500 text-sm">No bills</div>
                                        ) : (
                                          <table className="min-w-full">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Flat</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                                {isAdmin && <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {monthData.bills?.map((bill) => (
                                                <tr key={bill.id} className="hover:bg-gray-50">
                                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{bill.bill_no}</td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">
                                                    {new Date(bill.bill_date).toLocaleDateString()}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-900">
                                                    {bill.flat?.flat_number} - {bill.flat?.owner_name}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">{bill.service_type}</td>
                                                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                    {formatAmount(bill.amount)}
                                                  </td>
                                                  <td className="px-4 py-2 text-center">
                                                    {isAdmin ? (
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); handleStatusToggle(bill); }}
                                                        disabled={actionLoading === bill.id}
                                                        className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                                          bill.status === 'Paid'
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                        } disabled:opacity-50`}
                                                      >
                                                        {bill.status}
                                                      </button>
                                                    ) : (
                                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                                        bill.status === 'Paid'
                                                          ? 'bg-green-100 text-green-800'
                                                          : 'bg-red-100 text-red-800'
                                                      }`}>
                                                        {bill.status}
                                                      </span>
                                                    )}
                                                  </td>
                                                  {isAdmin && (
                                                    <td className="px-4 py-2 text-center">
                                                      <div className="flex justify-center gap-1">
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); openEditModal(bill); }}
                                                          disabled={actionLoading === bill.id}
                                                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                          Edit
                                                        </button>
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); handleDelete(bill.id); }}
                                                          disabled={actionLoading === bill.id}
                                                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                          Delete
                                                        </button>
                                                      </div>
                                                    </td>
                                                  )}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Total Footer */}
                <div className="px-6 py-4 bg-gray-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Paid ({data.summary.paid_bills})</div>
                      <div className="text-sm font-bold text-green-700">{formatAmount(data.summary.paid_amount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Due ({data.summary.due_bills})</div>
                      <div className="text-sm font-bold text-red-700">{formatAmount(data.summary.due_amount)}</div>
                    </div>
                    <div className="text-right min-w-[140px]">
                      <div className="text-xs text-gray-500">Total ({data.summary.total_bills})</div>
                      <div className="text-lg font-bold text-gray-900">{formatAmount(data.summary.total_amount)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">No data available</div>
        )}
      </div>

      {/* Modal */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editingBill ? 'Edit Bill' : 'Add Bill'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                    {formError}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded text-sm">
                    {successMessage}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flat</label>
                    <select
                      required
                      value={formData.flat_id}
                      onChange={(e) => setFormData({ ...formData, flat_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={editingBill}
                    >
                      <option value="">Select Flat</option>
                      {!editingBill && <option value="all">All Flats (Bulk Create)</option>}
                      {flats.map((flat) => (
                        <option key={flat.id} value={flat.id}>
                          {flat.flat_number} - {flat.owner_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
                    <input
                      type="date"
                      required
                      value={formData.bill_date}
                      onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {formData.flat_id === 'all' && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                    Bills will be created for all {flats.length} flats with status "{formData.status}". Flats that already have bills for the same month/year/service will be skipped. Bill numbers will be auto-generated.
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <input
                    type="text"
                    required
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Monthly Service Charge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Service Charge for month : January"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Due">Due</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">For Month</label>
                    <select
                      required
                      value={formData.for_month}
                      onChange={(e) => setFormData({ ...formData, for_month: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Month</option>
                      {MONTHS.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      required
                      min="2000"
                      max="2100"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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
                  {formLoading ? 'Saving...' : editingBill ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
