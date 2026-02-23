export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  status: "active" | "inactive" | "paused";
  joinDate?: string;
  goal?: string;
  currentProgram?: number;
  initialWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  notes?: string;
  tags?: string[];
  metrics?: {
    weight?: number;
    bodyFat?: number;
    muscle?: number;
  };
}
