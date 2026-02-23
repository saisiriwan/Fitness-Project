import axios from 'axios';

// สร้าง instance ของ Axios
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1', // URL หลักของ API
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