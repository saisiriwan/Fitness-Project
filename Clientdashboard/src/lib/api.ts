import axios from "axios";

// Create an axios instance with the backend base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1", // Adjust if your backend URL differs
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
      // Handle unauthorized access (e.g., redirect to login)
      console.error("Unauthorized access - redirecting to login");
      // window.location.href = "/login"; // Uncomment when login page is ready
    }
    return Promise.reject(error);
  }
);

export default api;
