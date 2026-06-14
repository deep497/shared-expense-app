import axios from "axios";

// Create configured Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Auto-inject JWT token if present in localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API endpoint groupings
const api = {
  auth: {
    register: (name, email, password) =>
      API.post("/api/auth/register", { name, email, password }).then((r) => r.data),
    login: (email, password) =>
      API.post("/api/auth/login", { email, password }).then((r) => r.data),
  },
  groups: {
    getAll: () => API.get("/api/groups").then((r) => r.data),
    getById: (id) => API.get(`/api/groups/${id}`).then((r) => r.data),
    create: (name) => API.post("/api/groups", { name }).then((r) => r.data),
    addMember: (groupId, userId, joinedAt) =>
      API.post(`/api/groups/${groupId}/members`, { userId, joinedAt }).then((r) => r.data),
    removeMember: (groupId, userId, leftAt) =>
      API.patch(`/api/groups/${groupId}/members/${userId}`, { leftAt }).then((r) => r.data),
  },
  expenses: {
    create: (data) => API.post("/api/expenses", data).then((r) => r.data),
    getById: (id) => API.get(`/api/expenses/${id}`).then((r) => r.data),
    getForGroup: (groupId) => API.get(`/api/groups/${groupId}/expenses`).then((r) => r.data),
    update: (id, data) => API.put(`/api/expenses/${id}`, data).then((r) => r.data),
    delete: (id) => API.delete(`/api/expenses/${id}`).then((r) => r.data),
  },
  balances: {
    getGroupBalances: (groupId) => API.get(`/api/groups/${groupId}/balances`).then((r) => r.data),
    getUserBalance: (userId) => API.get(`/api/users/${userId}/balance`).then((r) => r.data),
  },
  settlements: {
    create: (data) => API.post("/api/settlements", data).then((r) => r.data),
    getAll: () => API.get("/api/settlements").then((r) => r.data),
    getGroupSettlements: (groupId) => API.get(`/api/groups/${groupId}/settlements`).then((r) => r.data),
  },
  csv: {
    import: (file, groupId) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("group_id", groupId);
      return API.post("/api/import/csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data);
    },
  },
};

export default api;
