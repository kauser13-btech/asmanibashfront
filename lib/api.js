const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getToken() {
  return globalThis.window === undefined ? null : localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function multipartRequest(endpoint, formData) {
  const token = getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function withQuery(base, params) {
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

export const api = {
  // Auth
  register: (data) => request('/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),

  // Admin
  getStats: () => request('/admin/stats'),
  getAllUsers: () => request('/admin/users'),
  getPendingUsers: () => request('/admin/users/pending'),
  getUser: (id) => request(`/admin/users/${id}`),
  createUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approveUser: (id) => request(`/admin/users/${id}/approve`, { method: 'POST' }),
  rejectUser: (id) => request(`/admin/users/${id}/reject`, { method: 'POST' }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Flats
  getFlats: () => request('/flats'),
  getFlat: (id) => request(`/flats/${id}`),
  createFlat: (data) => request('/admin/flats', { method: 'POST', body: JSON.stringify(data) }),
  updateFlat: (id, data) => request(`/admin/flats/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFlat: (id) => request(`/admin/flats/${id}`, { method: 'DELETE' }),

  // Bills
  getBills: (params = {}) => request(withQuery('/bills', params)),
  getBillsReport: (params = {}) => request(withQuery('/bills/report', params)),
  getBill: (id) => request(`/bills/${id}`),
  createBill: (data) => request('/admin/bills', { method: 'POST', body: JSON.stringify(data) }),
  updateBill: (id, data) => request(`/admin/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBill: (id) => request(`/admin/bills/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (params = {}) => request(withQuery('/expenses', params)),
  getExpensesReport: (params = {}) => request(withQuery('/expenses/report', params)),
  getBalanceReport: (params = {}) => request(withQuery('/expenses/balance', params)),
  getExpense: (id) => request(`/expenses/${id}`),
  createExpense: (data) => {
    if (data instanceof FormData) {
      return multipartRequest('/admin/expenses', data);
    }
    return request('/admin/expenses', { method: 'POST', body: JSON.stringify(data) });
  },
  updateExpense: (id, data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return multipartRequest(`/admin/expenses/${id}`, data);
    }
    return request(`/admin/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteExpense: (id) => request(`/admin/expenses/${id}`, { method: 'DELETE' }),
};
