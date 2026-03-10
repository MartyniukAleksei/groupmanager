import axios from "axios";
const API = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchMaterials = (token, groupId, subjectName = "") =>
  axios.get(`${API}/groups/${groupId}/materials`, {
    ...h(token),
    params: subjectName ? { subject_name: subjectName } : {},
  });

export const createFolder = (token, groupId, data) =>
  axios.post(`${API}/groups/${groupId}/materials/folders`, data, h(token));

export const deleteFolder = (token, groupId, folderId) =>
  axios.delete(`${API}/groups/${groupId}/materials/folders/${folderId}`, h(token));

export const createLink = (token, groupId, folderId, data) =>
  axios.post(`${API}/groups/${groupId}/materials/folders/${folderId}/links`, data, h(token));

export const deleteLink = (token, groupId, folderId, linkId) =>
  axios.delete(`${API}/groups/${groupId}/materials/folders/${folderId}/links/${linkId}`, h(token));
