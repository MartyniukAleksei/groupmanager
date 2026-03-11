import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchMembers = (token, groupId) =>
  axios.get(`${API}/groups/${groupId}/members`, h(token));

export const updateMemberRole = (token, groupId, userId, role) =>
  axios.patch(`${API}/groups/${groupId}/members/${userId}/role`, { role }, h(token));

export const removeMember = (token, groupId, userId) =>
  axios.delete(`${API}/groups/${groupId}/members/${userId}`, h(token));
