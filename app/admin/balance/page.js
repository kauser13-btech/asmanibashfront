'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function BalanceReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  const [loadingMonthly, setLoadingMonthly] = useState({});
  const [offcanvas, setOffcanvas] = useState({ open: false, visible: false, month: '', year: '', type: '', data: [], loading: false });
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
  }, [isAdmin, isUser]);

  async function loadReport() {
    setLoading(true);
    try {
      const result = await api.getBalanceReport({});
      setData(result);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleYearAccordion(year) {
    if (expandedYear === year) {
      setExpandedYear(null);
      return;
    }

    setExpandedYear(year);

    // Load monthly data if not already loaded
    if (!monthlyData[year]) {
      setLoadingMonthly(prev => ({ ...prev, [year]: true }));
      try {
        const result = await api.getBalanceReport({ year });
        setMonthlyData(prev => ({ ...prev, [year]: result.monthly }));
      } catch (error) {
        console.error('Failed to load monthly data:', error);
      } finally {
        setLoadingMonthly(prev => ({ ...prev, [year]: false }));
      }
    }
  }

  async function openOffcanvas(month, year, type) {
    setOffcanvas({ open: true, visible: false, month, year, type, data: [], loading: true });
    // Trigger animation after mount
    setTimeout(() => {
      setOffcanvas(prev => ({ ...prev, visible: true }));
    }, 10);

    try {
      const params = { month, year };

      let result;
      if (type === 'expense') {
        result = await api.getExpensesReport(params);
        setOffcanvas(prev => ({ ...prev, data: result.expenses, loading: false }));
      } else {
        result = await api.getBillsReport({ ...params, status: 'Paid' });
        setOffcanvas(prev => ({ ...prev, data: result.bills, loading: false }));
      }
    } catch (error) {
      console.error('Failed to load details:', error);
      setOffcanvas(prev => ({ ...prev, data: [], loading: false }));
    }
  }

  function closeOffcanvas() {
    setOffcanvas(prev => ({ ...prev, visible: false }));
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      setOffcanvas({ open: false, visible: false, month: '', type: '', data: [], loading: false });
    }, 300);
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

  function handlePrint() {
    const total = offcanvas.data.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const printWindow = window.open('', '_blank');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Report - ${offcanvas.month} ${offcanvas.year}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .logo { margin-bottom: 30px; }
          .logo-text { font-size: 28px; font-weight: bold; color: #333; }
          .logo-text span { color: #f97316; }
          .logo-icon { display: inline-block; width: 40px; height: 50px; border: 3px solid #f97316; border-radius: 4px; margin-left: 8px; position: relative; vertical-align: middle; }
          .logo-icon::before { content: ''; position: absolute; top: 8px; left: 6px; right: 6px; bottom: 8px; background: repeating-linear-gradient(0deg, #f97316, #f97316 2px, transparent 2px, transparent 6px); }
          .header-line { border-top: 3px solid #f97316; border-bottom: 1px solid #333; padding: 4px 0; margin-bottom: 20px; }
          .total-section { text-align: right; margin-bottom: 20px; font-size: 18px; }
          .total-section .label { color: #666; }
          .total-section .amount { font-weight: bold; color: #f97316; font-size: 24px; }
          .period { text-align: right; color: #666; font-size: 14px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; padding: 12px 8px; border-top: 2px solid #333; border-bottom: 2px solid #c00; font-weight: bold; }
          th:last-child { text-align: right; }
          td { padding: 10px 8px; border-bottom: 1px solid #eee; }
          td:last-child { text-align: right; font-weight: bold; }
          tr:hover { background: #f9f9f9; }
          .currency { color: #333; }
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

        <div class="period">Period: ${offcanvas.month} ${offcanvas.year}</div>

        <div class="total-section">
          <span class="label">Total Expense</span>&nbsp;&nbsp;
          <span class="amount">৳ ${total.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 120px;">Type</th>
              <th>Details</th>
              <th style="width: 120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${offcanvas.data.map(expense => `
              <tr>
                <td>${expense.type}</td>
                <td>${expense.details || '-'}</td>
                <td class="currency">৳ ${parseFloat(expense.amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
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
            <h1 className="text-xl font-bold text-gray-900">Balance Report</h1>
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
                    <div className="text-sm text-gray-500 mb-1">Total Income (Paid Bills)</div>
                    <div className="text-3xl font-bold text-green-600">{formatAmount(data.summary.total_income)}</div>
                    <div className="text-sm text-gray-400 mt-1">{data.summary.income_count} bills</div>
                  </div>
                  <div className="text-5xl text-green-200">+</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Total Expenses</div>
                    <div className="text-3xl font-bold text-red-600">{formatAmount(data.summary.total_expenses)}</div>
                    <div className="text-sm text-gray-400 mt-1">{data.summary.expense_count} expenses</div>
                  </div>
                  <div className="text-5xl text-red-200">-</div>
                </div>
              </div>

              <div className={`rounded-lg shadow p-6 ${data.summary.balance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Balance</div>
                    <div className={`text-3xl font-bold ${data.summary.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatAmount(data.summary.balance)}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {data.summary.balance >= 0 ? 'Surplus' : 'Deficit'}
                    </div>
                  </div>
                  <div className={`text-5xl ${data.summary.balance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    =
                  </div>
                </div>
              </div>
            </div>

            {/* Expense by Type */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {data.expense_by_type?.map((item) => (
                  <div key={item.type} className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-500">{item.type}</div>
                    <div className="text-xl font-bold text-gray-900">{formatAmount(item.total)}</div>
                  </div>
                ))}
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
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Income</div>
                            <div className="text-sm font-semibold text-green-600">{formatAmount(yearData.income)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Expense</div>
                            <div className="text-sm font-semibold text-red-600">{formatAmount(yearData.expense)}</div>
                          </div>
                          <div className="text-right min-w-[120px]">
                            <div className="text-xs text-gray-500">Balance</div>
                            <div className={`text-sm font-bold ${yearData.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatAmount(yearData.balance)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Breakdown - Accordion Content */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                          {isLoadingYear ? (
                            <div className="text-center text-gray-500 py-4">Loading monthly data...</div>
                          ) : (
                            <table className="min-w-full">
                              <thead>
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Income</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expense</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visual</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {yearMonthly.map((month) => {
                                  const maxValue = Math.max(
                                    ...yearMonthly.map(m => Math.max(m.income, m.expense))
                                  ) || 1;
                                  const incomeWidth = (month.income / maxValue) * 100;
                                  const expenseWidth = (month.expense / maxValue) * 100;

                                  return (
                                    <tr key={month.month} className="bg-white">
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {month.month}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                        {formatAmount(month.income)}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                        {formatAmount(month.expense)}
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                                        month.balance >= 0 ? 'text-green-700' : 'text-red-700'
                                      }`}>
                                        {formatAmount(month.balance)}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="w-32">
                                          <div className="flex items-center gap-1 mb-1">
                                            <div
                                              className="h-2 bg-green-500 rounded"
                                              style={{ width: `${incomeWidth}%` }}
                                              title={`Income: ${formatAmount(month.income)}`}
                                            />
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <div
                                              className="h-2 bg-red-500 rounded"
                                              style={{ width: `${expenseWidth}%` }}
                                              title={`Expense: ${formatAmount(month.expense)}`}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <div className="flex justify-center gap-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openOffcanvas(month.month, yearData.year, 'income'); }}
                                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            title="View Income Details"
                                          >
                                            Income
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openOffcanvas(month.month, yearData.year, 'expense'); }}
                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                            title="View Expense Details"
                                          >
                                            Expense
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Total Footer */}
                <div className="px-6 py-4 bg-gray-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Income</div>
                      <div className="text-sm font-bold text-green-700">{formatAmount(data.summary.total_income)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Expense</div>
                      <div className="text-sm font-bold text-red-700">{formatAmount(data.summary.total_expenses)}</div>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <div className="text-xs text-gray-500">Balance</div>
                      <div className={`text-sm font-bold ${data.summary.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatAmount(data.summary.balance)}
                      </div>
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

      {/* Offcanvas */}
      {offcanvas.open && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ease-in-out ${
              offcanvas.visible ? 'opacity-30' : 'opacity-0'
            }`}
            onClick={closeOffcanvas}
          />

          {/* Offcanvas Panel */}
          <div
            className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
              offcanvas.visible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className={`px-6 py-4 border-b ${offcanvas.type === 'expense' ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {offcanvas.type === 'expense' ? 'Expenses' : 'Income (Paid Bills)'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {offcanvas.month} {offcanvas.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {offcanvas.type === 'expense' && offcanvas.data.length > 0 && !offcanvas.loading && (
                      <button
                        onClick={handlePrint}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Print"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={closeOffcanvas}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {offcanvas.loading ? (
                  <div className="text-center text-gray-500 py-8">Loading...</div>
                ) : offcanvas.data.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No records found</div>
                ) : offcanvas.type === 'expense' ? (
                  /* Expense List */
                  <div className="space-y-3">
                    {offcanvas.data.map((expense) => (
                      <div key={expense.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(expense.type)}`}>
                                {expense.type}
                              </span>
                              <span className="text-xs text-gray-400">#{expense.serial_no}</span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium">{expense.details || 'No details'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : 'No date'}
                              {expense.source && ` - ${expense.source}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-600">{formatAmount(expense.amount)}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total ({offcanvas.data.length} items)</span>
                        <span className="text-xl font-bold text-red-600">
                          {formatAmount(offcanvas.data.reduce((sum, e) => sum + parseFloat(e.amount), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Income (Bills) List */
                  <div className="space-y-3">
                    {offcanvas.data.map((bill) => (
                      <div key={bill.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                                {bill.service_type}
                              </span>
                              <span className="text-xs text-gray-400">{bill.bill_no}</span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium">
                              {bill.flat?.flat_number} - {bill.flat?.owner_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {bill.details || 'No details'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">{formatAmount(bill.amount)}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total ({offcanvas.data.length} bills)</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatAmount(offcanvas.data.reduce((sum, b) => sum + parseFloat(b.amount), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
