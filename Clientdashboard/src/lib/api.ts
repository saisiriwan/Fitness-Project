import axios from "axios";

// Determine the correct API base URL dynamically to support both Host PC and Android Emulator
export const getApiBaseUrl = (): string => {
  let envApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
  if (typeof window !== 'undefined') {
    if (envApiUrl.includes("10.0.2.2") && window.location.hostname === "localhost") {
      envApiUrl = envApiUrl.replace("10.0.2.2", "localhost");
    } else if (envApiUrl.includes("localhost") && window.location.hostname === "10.0.2.2") {
      envApiUrl = envApiUrl.replace("localhost", "10.0.2.2");
    }
  }
  return envApiUrl;
};

export const getWsUrl = (): string => {
  let envWsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";
  if (typeof window !== 'undefined') {
    if (envWsUrl.includes("10.0.2.2") && window.location.hostname === "localhost") {
      envWsUrl = envWsUrl.replace("10.0.2.2", "localhost");
    } else if (envWsUrl.includes("localhost") && window.location.hostname === "10.0.2.2") {
      envWsUrl = envWsUrl.replace("localhost", "10.0.2.2");
    }
  }
  return envWsUrl;
};

// Create an axios instance with the backend base URL
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Necessary for sending cookies (JWT)
  headers: {
    "Content-Type": "application/json",
    "X-Role": "trainee", // Explicitly state role for backend middleware priority
  },
});

// Add a response interceptor to handle common errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized access - session expired");
      // Bug 3 fix: dispatch event so AuthContext can react (clear user, show login)
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
