import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchLinks = (token, groupId) =>
  axios.get(`${API}/groups/${groupId}/links`, h(token));

export const createLink = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/links`, data, h(token));

export const deleteLink = (token, groupId, linkId) =>
  axios.delete(`${API}/groups/${groupId}/links/${linkId}`, h(token));
