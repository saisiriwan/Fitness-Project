import api from "@/lib/api";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  profileImage?: string;
  createdAt?: string;
}

export const authService = {
  async login(credentials: { email: string; password: string }) {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async register(data: any) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async logout() {
    await api.post("/auth/logout");
  },

  async getMe(): Promise<User> {
    const response = await api.get("/auth/me");
    return response.data; // Assuming the backend returns the user object directly or in a 'user' field. Adjust if needed.
  },
};
