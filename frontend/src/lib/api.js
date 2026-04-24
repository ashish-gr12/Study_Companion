import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 120000,
});

export const getProfile = () => api.get("/profile").then((r) => r.data);
export const updateProfile = (payload) => api.put("/profile", payload).then((r) => r.data);

export const listStudySets = () => api.get("/study-sets").then((r) => r.data);
export const getStudySet = (id) => api.get(`/study-sets/${id}`).then((r) => r.data);
export const deleteStudySet = (id) => api.delete(`/study-sets/${id}`).then((r) => r.data);

export const createFromTopic = (topic) => {
  const form = new FormData();
  form.append("source_type", "topic");
  form.append("text", topic);
  return api.post("/study-sets", form).then((r) => r.data);
};

export const createFromNotes = (title, notes) => {
  const form = new FormData();
  form.append("source_type", "notes");
  if (title) form.append("title", title);
  form.append("text", notes);
  return api.post("/study-sets", form).then((r) => r.data);
};

export const createFromPdf = (file, title) => {
  const form = new FormData();
  form.append("source_type", "pdf");
  if (title) form.append("title", title);
  form.append("file", file);
  return api.post("/study-sets", form).then((r) => r.data);
};

export const submitQuiz = (id, answers) =>
  api.post(`/study-sets/${id}/quiz/submit`, { answers }).then((r) => r.data);

export const chatAboutSet = (id, message) =>
  api.post(`/study-sets/${id}/chat`, { message }).then((r) => r.data);

export const getStats = () => api.get("/stats").then((r) => r.data);
