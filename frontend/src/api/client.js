const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  try {
    return localStorage.getItem('auth_token');
  } catch (_) {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `HTTP Error ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export const api = {
  // Authentication
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // User Management (Admin Only)
  getUsers: () => request('/admin/users'),
  createUser: (body) => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Groups
  getGroups: (referenceDate) =>
    request(`/groups${referenceDate ? `?referenceDate=${encodeURIComponent(referenceDate)}` : ''}`),
  createGroup: (body) => request('/groups', { method: 'POST', body: JSON.stringify(body) }),
  updateGroup: (id, body) =>
    request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),

  getAttentionGroups: () => request('/dashboard/attention-groups'),

  // Teachers
  getTeachers: ({ groupId, referenceDate } = {}) => {
    const params = new URLSearchParams();
    if (groupId) params.set('groupId', groupId);
    if (referenceDate) params.set('referenceDate', referenceDate);
    const qs = params.toString();
    return request(`/teachers${qs ? `?${qs}` : ''}`);
  },
  createTeacher: (body) => request('/teachers', { method: 'POST', body: JSON.stringify(body) }),
  updateTeacher: (id, body) =>
    request(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTeacher: (id) => request(`/teachers/${id}`, { method: 'DELETE' }),

  // Vehicles
  searchVehicles: (plate, referenceDate) => {
    const params = new URLSearchParams();
    if (plate) params.set('plate', plate);
    if (referenceDate) params.set('referenceDate', referenceDate);
    return request(`/vehicles/search?${params.toString()}`);
  },
  getVehicles: (referenceDate) =>
    request(`/vehicles${referenceDate ? `?referenceDate=${encodeURIComponent(referenceDate)}` : ''}`),
  createVehicle: (body) => request('/vehicles', { method: 'POST', body: JSON.stringify(body) }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  // Courses
  getCourses: () => request('/courses'),
  createCourse: (body) => request('/courses', { method: 'POST', body: JSON.stringify(body) }),
  updateCourse: (id, body) =>
    request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),

  // Allocations
  getAllocations: ({ courseId, teacherId } = {}) => {
    const params = new URLSearchParams();
    if (courseId) params.set('courseId', courseId);
    if (teacherId) params.set('teacherId', teacherId);
    const qs = params.toString();
    return request(`/allocations${qs ? `?${qs}` : ''}`);
  },
  createAllocation: (body) =>
    request('/allocations', { method: 'POST', body: JSON.stringify(body) }),
  updateAllocation: (id, body) =>
    request(`/allocations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAllocation: (id) => request(`/allocations/${id}`, { method: 'DELETE' }),

  // Admin Data Management
  exportAllData: () => request('/admin/export'),
  resetSeedData: () => request('/admin/reset-seed', { method: 'POST' }),
  bulkImport: (rows) =>
    request('/admin/bulk-import', { method: 'POST', body: JSON.stringify({ rows }) }),
  importTable: (table, rows) =>
    request('/admin/import-table', { method: 'POST', body: JSON.stringify({ table, rows }) }),
};
