const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
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
  getGroups: (referenceDate) =>
    request(`/groups${referenceDate ? `?referenceDate=${encodeURIComponent(referenceDate)}` : ''}`),
  createGroup: (body) => request('/groups', { method: 'POST', body: JSON.stringify(body) }),
  updateGroup: (id, body) =>
    request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),

  getAttentionGroups: () => request('/dashboard/attention-groups'),

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

  getCourses: () => request('/courses'),
  createCourse: (body) => request('/courses', { method: 'POST', body: JSON.stringify(body) }),
  updateCourse: (id, body) =>
    request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),

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

  exportAllData: () => request('/admin/export'),
  resetSeedData: () => request('/admin/reset-seed', { method: 'POST' }),
  bulkImport: (rows) =>
    request('/admin/bulk-import', { method: 'POST', body: JSON.stringify({ rows }) }),
  importTable: (table, rows) =>
    request('/admin/import-table', { method: 'POST', body: JSON.stringify({ table, rows }) }),
};
