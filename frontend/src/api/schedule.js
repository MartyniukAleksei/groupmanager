import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchSchedule       = (token, groupId)              => axios.get(`${API}/groups/${groupId}/schedule`, h(token));
export const createScheduleEntry = (token, groupId, data)        => axios.post(`${API}/groups/${groupId}/schedule`, data, h(token));
export const updateScheduleEntry = (token, groupId, id, data)    => axios.put(`${API}/groups/${groupId}/schedule/${id}`, data, h(token));
export const deleteScheduleEntry = (token, groupId, id)          => axios.delete(`${API}/groups/${groupId}/schedule/${id}`, h(token));
export const setCurrentWeek      = (token, groupId, currentWeek) => axios.put(`${API}/groups/${groupId}/week`, { current_week: currentWeek }, h(token));
