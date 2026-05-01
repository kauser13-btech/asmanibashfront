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

const EXPENSE_TYPES = ['Salary', 'Purchase', 'Bill', 'Other', 'Repair'];

export default function ExpensesReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  const [loadingMonthly, setLoadingMonthly] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    type: 'Bill',
    amount: '',
    for_month: '',
    for_year: new Date().getFullYear(),
    details: '',
    expense_date: '',
    source: 'Petty Cash',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '' });
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

  async function loadReport({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;

      const result = await api.getExpensesReport(params);
      setData(result);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      if (!silent) setLoading(false);
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
        if (filters.type) params.type = filters.type;
        const result = await api.getExpensesReport(params);
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

  function handlePrintMonth(monthData, year) {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expenses - ${monthData.month} ${year}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .logo { margin-bottom: 30px; }
          .logo-text { font-size: 28px; font-weight: bold; color: #333; }
          .header-line { border-top: 3px solid #f97316; border-bottom: 1px solid #333; padding: 4px 0; margin-bottom: 20px; }
          .period { text-align: right; color: #666; font-size: 14px; margin-bottom: 10px; }
          .total-section { text-align: right; margin-bottom: 20px; font-size: 18px; }
          .total-section .label { color: #666; }
          .total-section .amount { font-weight: bold; color: #f97316; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; padding: 12px 8px; border-top: 2px solid #333; border-bottom: 2px solid #c00; font-weight: bold; font-size: 13px; }
          th:last-child { text-align: right; }
          td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
          td.amount { text-align: right; font-weight: bold; }
          @media print {
            body { padding: 20px; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="logo">
          <span class="logo-text">ASMA<br/>NIBAS</span>
        </div>
        <div class="header-line"></div>
        <div class="period">Period: ${monthData.month} ${year}</div>
        <div class="total-section">
          <span class="label">Total Expense</span>&nbsp;&nbsp;
          <span class="amount">৳ ${Number.parseFloat(monthData.total).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:50px;">S/N</th>
              <th style="width:100px;">Type</th>
              <th>Details</th>
              <th style="width:100px;">Date</th>
              <th style="width:100px;">Source</th>
              <th style="width:120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(monthData.expenses || []).map(expense => `
              <tr>
                <td>${expense.serial_no}</td>
                <td>${expense.type}</td>
                <td>${expense.details || '-'}</td>
                <td>${expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '-'}</td>
                <td>${expense.source || '-'}</td>
                <td class="amount">৳ ${Number.parseFloat(expense.amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setActionLoading(id);
    try {
      await api.deleteExpense(id);
      // Reload the report
      await loadReport({ silent: true });
      // Clear cached monthly data to refresh
      setMonthlyData({});
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(null);
    }
  }

  function openCreateModal() {
    setEditingExpense(null);
    setFormData({
      type: 'Bill',
      amount: '',
      for_month: MONTHS[new Date().getMonth()],
      for_year: new Date().getFullYear(),
      details: '',
      expense_date: new Date().toISOString().split('T')[0],
      source: 'Petty Cash',
    });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setFormData({
      type: expense.type,
      amount: expense.amount,
      for_month: expense.for_month,
      for_year: expense.for_year,
      details: expense.details || '',
      expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
      source: expense.source || 'Petty Cash',
    });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingExpense(null);
    setFormError('');
    setSuccessMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const fileInput = e.target.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];

      let payload;
      if (file) {
        payload = new FormData();
        payload.append('type', formData.type);
        payload.append('amount', Number.parseFloat(formData.amount));
        payload.append('for_month', formData.for_month);
        payload.append('for_year', Number.parseInt(formData.for_year, 10));
        payload.append('details', formData.details);
        payload.append('source', formData.source);
        if (formData.expense_date) payload.append('expense_date', formData.expense_date);
        payload.append('attachment', file);
      } else {
        payload = {
          ...formData,
          amount: Number.parseFloat(formData.amount),
          for_year: Number.parseInt(formData.for_year, 10),
          expense_date: formData.expense_date || null,
        };
      }

      if (editingExpense) {
        await api.updateExpense(editingExpense.id, payload);
        setSuccessMessage('Expense updated successfully!');
      } else {
        await api.createExpense(payload);
        setSuccessMessage('Expense created successfully!');
      }
      await loadReport({ silent: true });
      // Refresh monthly data for the expanded year, keeping accordion open
      if (expandedYear) {
        setLoadingMonthly(prev => ({ ...prev, [expandedYear]: true }));
        try {
          const params = { year: expandedYear };
          if (filters.type) params.type = filters.type;
          const result = await api.getExpensesReport(params);
          setMonthlyData(prev => ({ ...prev, [expandedYear]: result.monthly }));
        } catch (error) {
          console.error('Failed to refresh monthly data:', error);
        } finally {
          setLoadingMonthly(prev => ({ ...prev, [expandedYear]: false }));
        }
      } else {
        setMonthlyData({});
      }
      setTimeout(() => closeModal(), 1200);
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

  function getTypeColor(type) {
    const colors = {
      Salary: 'bg-blue-100 text-blue-800',
      Purchase: 'bg-purple-100 text-purple-800',
      Bill: 'bg-yellow-100 text-yellow-800',
      Other: 'bg-gray-100 text-gray-800',
      Repair: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
            <h1 className="text-xl font-bold text-gray-900">Expenses Report</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Total Expenses</div>
                    <div className="text-3xl font-bold text-red-600">{formatAmount(data.summary.total_amount)}</div>
                    <div className="text-sm text-gray-400 mt-1">{data.summary.total_expenses} records</div>
                  </div>
                  <div className="text-5xl text-red-200">-</div>
                </div>
              </div>

              {/* By Type Summary */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <div className="text-sm text-gray-500 mb-3">By Type</div>
                <div className="grid grid-cols-5 gap-2">
                  {data.summary.by_type?.map((item) => (
                    <div key={item.type} className="text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                      <div className="text-sm font-bold text-gray-900 mt-1">{formatAmount(item.total)}</div>
                      <div className="text-xs text-gray-400">{item.count} items</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters & Add Button */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => {
                        setFilters({ ...filters, type: e.target.value });
                        setMonthlyData({});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {EXPENSE_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setFilters({ type: '' });
                      setMonthlyData({});
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Clear Filter
                  </button>
                </div>
                {isAdmin && (
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Expense
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
                          <span className="text-sm text-gray-500">({yearData.count} expenses)</span>
                        </div>
                        <div className="flex items-center gap-6">
                          {/* Type breakdown mini badges */}
                          <div className="hidden md:flex items-center gap-2">
                            {yearData.by_type?.map((item) => (
                              <span key={item.type} className={`px-2 py-0.5 text-xs rounded ${getTypeColor(item.type)}`}>
                                {item.type}: {formatAmount(item.total)}
                              </span>
                            ))}
                          </div>
                          <div className="text-right min-w-[140px]">
                            <div className="text-xs text-gray-500">Total</div>
                            <div className="text-lg font-bold text-red-600">{formatAmount(yearData.total)}</div>
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
                                        <span className="text-sm text-gray-500">({monthData.count} expenses)</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="font-bold text-red-600">{formatAmount(monthData.total)}</div>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handlePrintMonth(monthData, yearData.year); }}
                                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 border border-gray-300"
                                          title="Print month expenses"
                                        >
                                          Print
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expenses List */}
                                    <div
                                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                        isMonthExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                      }`}
                                    >
                                      <div className="border-t border-gray-100">
                                        {monthData.expenses?.length === 0 ? (
                                          <div className="px-4 py-3 text-center text-gray-500 text-sm">No expenses</div>
                                        ) : (
                                          <table className="min-w-full">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S/N</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Receipt</th>
                                                {isAdmin && <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {monthData.expenses?.map((expense) => (
                                                <tr key={expense.id} className="hover:bg-gray-50">
                                                  <td className="px-4 py-2 text-sm text-gray-900">{expense.serial_no}</td>
                                                  <td className="px-4 py-2">
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getTypeColor(expense.type)}`}>
                                                      {expense.type}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">
                                                    {expense.details || '-'}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">
                                                    {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '-'}
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">{expense.source}</td>
                                                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                    {formatAmount(expense.amount)}
                                                  </td>
                                                  <td className="px-4 py-2 text-center">
                                                    {expense.receipt_img_link ? (
                                                      <a
                                                        href={expense.receipt_img_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-600 hover:underline text-xs"
                                                        onClick={(e) => e.stopPropagation()}
                                                      >
                                                        View
                                                      </a>
                                                    ) : (
                                                      <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                  </td>
                                                  {isAdmin && (
                                                    <td className="px-4 py-2 text-center">
                                                      <div className="flex justify-center gap-1">
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); openEditModal(expense); }}
                                                          disabled={actionLoading === expense.id}
                                                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                          Edit
                                                        </button>
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }}
                                                          disabled={actionLoading === expense.id}
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
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{data.summary.total_expenses} expenses</div>
                    <div className="text-lg font-bold text-red-700">{formatAmount(data.summary.total_amount)}</div>
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
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {EXPENSE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Cleaner Salary"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Petty Cash"
                    />
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">For Year</label>
                    <input
                      type="number"
                      required
                      min="2000"
                      max="2100"
                      value={formData.for_year}
                      onChange={(e) => setFormData({ ...formData, for_year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attachment (Optional — PDF or image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {editingExpense?.receipt_img_link && (
                    <a
                      href={editingExpense.receipt_img_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                    >
                      View current attachment
                    </a>
                  )}
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
                  {formLoading ? 'Saving...' : editingExpense ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
