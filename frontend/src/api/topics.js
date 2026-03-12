import axios from "axios";

const BASE = import.meta.env.VITE_API_URL;
const h = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const fetchSubjects = (token, groupId) =>
  axios.get(`${BASE}/groups/${groupId}/topics/subjects`, h(token));

export const fetchProjects = (token, groupId, subjectName) =>
  axios.get(`${BASE}/groups/${groupId}/topics/projects`, {
    ...h(token),
    params: { subject_name: subjectName },
  });

export const createProject = (token, groupId, data) =>
  axios.post(`${BASE}/groups/${groupId}/topics/projects`, data, h(token));

export const deleteProject = (token, groupId, projectId) =>
  axios.delete(`${BASE}/groups/${groupId}/topics/projects/${projectId}`, h(token));

export const clearProjectEntries = (token, groupId, projectId) =>
  axios.delete(`${BASE}/groups/${groupId}/topics/projects/${projectId}/entries`, h(token));

export const fetchEntries = (token, groupId, projectId) =>
  axios.get(`${BASE}/groups/${groupId}/topics/entries`, {
    ...h(token),
    params: { project_id: projectId },
  });

export const createEntry = (token, groupId, data) =>
  axios.post(`${BASE}/groups/${groupId}/topics/entries`, data, h(token));

export const deleteEntry = (token, groupId, entryId) =>
  axios.delete(`${BASE}/groups/${groupId}/topics/entries/${entryId}`, h(token));
