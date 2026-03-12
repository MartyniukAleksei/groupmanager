import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchBoard = (token, groupId) =>
  axios.get(`${API}/groups/${groupId}/board`, h(token));

export const createBoardItem = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/board`, data, h(token));

export const moveBoardItem = (token, groupId, id, data) =>
  axios.patch(`${API}/groups/${groupId}/board/${id}/position`, data, h(token));

export const deleteBoardItem = (token, groupId, id) =>
  axios.delete(`${API}/groups/${groupId}/board/${id}`, h(token));

export const clearBoard = (token, groupId) =>
  axios.delete(`${API}/groups/${groupId}/board`, h(token));
