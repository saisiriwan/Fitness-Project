import axios from 'axios';

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

// สร้าง instance ของ Axios
const api = axios.create({
  baseURL: getApiBaseUrl(), // URL หลักของ API (Dynamic)
  withCredentials: true, // สำคัญ! ส่ง Cookie ไปด้วยทุกครั้งอัตโนมัติ
  headers: {
    'Content-Type': 'application/json',
    'X-Role': 'trainer', // Explicitly state role for backend middleware priority
  },
});

// Interceptor: ดักจับ Response ก่อนส่งถึงหน้าจอ
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // ถ้า Backend บอกว่า 401 (Token หมดอายุ / ไม่ได้ Login)
    if (error.response && error.response.status === 401) {
      // เช็คว่าไม่ใช่หน้า Login อยู่แล้ว (เพื่อกัน Loop)
      if (window.location.pathname !== '/signin') {
         window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export default api;