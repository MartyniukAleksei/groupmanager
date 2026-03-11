import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchProfile = (token) => axios.get(`${API}/users/me`, h(token));
export const updateProfile = (token, data) => axios.patch(`${API}/users/me`, data, h(token));
