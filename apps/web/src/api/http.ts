import axios from "axios";

export const http = axios.create({
  baseURL: "/api",
  timeout: 15000
});

http.interceptors.response.use((response) => response.data, (error) => Promise.reject(error));
