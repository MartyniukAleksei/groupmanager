import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchQueue = (token, groupId, subjectName = "") =>
  axios.get(`${API}/groups/${groupId}/queue`, {
    ...h(token),
    params: subjectName ? { subject_name: subjectName } : {},
  });

export const joinQueue = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/queue/join`, data, h(token));

export const leaveQueue = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/queue/leave`, data, h(token));

export const clearQueue = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/queue/clear`, data, h(token));
