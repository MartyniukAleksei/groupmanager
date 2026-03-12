import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchDeadlines = (token, groupId) =>
  axios.get(`${API}/groups/${groupId}/deadlines`, h(token));

export const createDeadline = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/deadlines`, data, h(token));

export const updateDeadline = (token, groupId, id, data) =>
  axios.patch(`${API}/groups/${groupId}/deadlines/${id}`, data, h(token));

export const deleteDeadline = (token, groupId, id) =>
  axios.delete(`${API}/groups/${groupId}/deadlines/${id}`, h(token));
