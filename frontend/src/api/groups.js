import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchMyGroups   = (token)             => axios.get(`${API}/groups/me`, authHeaders(token));
export const createGroup     = (token, name, desc) => axios.post(`${API}/groups`, { name, description: desc }, authHeaders(token));
export const getGroupPreview = (token, joinCode)   => axios.get(`${API}/groups/join/${joinCode}`, authHeaders(token));
export const joinGroup       = (token, joinCode)   => axios.post(`${API}/groups/join`, { join_code: joinCode }, authHeaders(token));
