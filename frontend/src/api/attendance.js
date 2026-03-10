import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchAttendance = (token, groupId, date) =>
  axios.get(`${API}/groups/${groupId}/attendance`, { ...h(token), params: { date } });

export const castVote = (token, groupId, sessionId, voteType) =>
  axios.post(`${API}/groups/${groupId}/attendance/${sessionId}/vote`, { vote_type: voteType }, h(token));
