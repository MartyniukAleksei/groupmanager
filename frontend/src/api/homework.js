import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchHomework = (token, groupId, weekStart) =>
  axios.get(`${API}/groups/${groupId}/homework`, { ...h(token), params: { week_start: weekStart } });

export const saveHomework = (token, groupId, entry) =>
  axios.put(`${API}/groups/${groupId}/homework`, entry, h(token));
