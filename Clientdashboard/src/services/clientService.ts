import api from "@/lib/api";

export interface Session {
  id: string; // Changed to string based on "sess_001"
  client_id: string;
  trainer_id: string;
  trainer_name?: string;
  trainer_username?: string;
  trainer_phone?: string;
  trainer_avatar?: string;
  title?: string;
  description?: string;
  date: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  duration?: number; // minutes
  location?:
    | string
    | {
        name: string;
        address: string;
        type: string;
        coordinates: { lat: number; lng: number };
      };
  location_type?: string;
  status: string; // "confirmed" | "pending" | "cancelled" | "completed"
  session_type?: string;
  type?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  logs?: any[];
  exercises?: SessionExercise[];
  summary?: {
    total_exercises: number;
    completed_exercises: number;
    total_sets: number;
    completed_sets: number;
    total_volume: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  name: string;
  type: string;
  category: string;
  order: number;
  section_name?: string;
  section_order?: number;
  tracking_fields?: string[];
  sets: SessionSet[];
  notes?: string;
  video_url?: string;
  rest_time?: number;
}

export interface SessionSet {
  set_number: number
  completed: boolean

  target_reps?: number
  target_weight?: number
  target_rpe?: number

  actual_reps?: number
  actual_weight?: number
  actual_rpe?: number

  // ✅ เพิ่มส่วนนี้
  target_duration?: number      // seconds
  actual_duration?: number      // seconds
  rest_duration?: number        // seconds
  actual_rest_duration?: number // seconds

  target_metadata?: Record<string, any>
  actual_metadata?: Record<string, any>
}

export interface ClientMetric {
  id: number;
  client_id: number;
  date: string; // ISO string
  type: string; // "weight", "body_fat", "muscle", etc.
  value: number;
  created_at?: string;
}

export interface ClientProfile {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  goal?: string;
  injuries?: string;
  activity_level?: string;
  medical_conditions?: string;
  target_weight?: number;
  target_date?: string;
  status?: string;
  join_date?: string;
  created_at: string;
  trainer_name?: string; // Added
}

// Deprecated: SessionLog and SessionLogSet are replaced by SessionExercise and SessionSet
// Keeping them temporarily if other parts of the app rely on them, otherwise they can be removed.
export interface SessionLogSet {
  id: number;
  set_number: number;
  planned_weight_kg?: number;
  planned_reps?: number;
  actual_weight_kg?: number;
  actual_reps?: number;
  actual_rpe?: number;
  completed: boolean;
}

export interface SessionLog {
  id: number;
  exercise_id: number;
  name: string;
  category?: string;
  notes?: string;
  status: string;
  order: number;
  sets?: SessionLogSet[];
}

// SessionDetail is now just the Session object with filled exercises
export type SessionDetail = Session;

export interface UpdateSetRequest {
  actual_reps?: number;
  actual_weight?: number;
  actual_rpe?: number;
  completed: boolean;
  notes?: string;
}

export interface UpdateSetResponse {
  set_number: number;
  target_reps: number;
  target_weight: number;
  target_rpe: number;
  actual_reps?: number;
  actual_weight?: number;
  actual_rpe?: number;
  completed: boolean;
  completed_at?: string;
  notes?: string;
}

// ==========================================
// NEW INTERFACES FOR PROGRESS VIEW
// ==========================================

export interface ProgramStats {
  program_id: string;
  period: string;
  date_range: {
    start: string;
    end: string;
  };
  sessions: {
    completed: number;
    scheduled: number;
    completion_rate: number;
    total_duration_minutes: number;
  };
  exercises: {
    total_unique: number;
    weight_training: number;
    cardio: number;
    flexibility: number;
  };
  volume: {
    total_weight_lifted_kg: number;
    total_reps: number;
    total_sets: number;
    average_weight_per_session: number;
  };
  cardio: {
    total_distance_km: number;
    total_duration_minutes: number;
    total_calories: number;
    average_pace: number;
  };
  achievements_this_period: Array<{
    type: string;
    exercise: string;
    description: string;
    date: string;
  }>;
  compliance: {
    sessions_completed_percentage: number;
    consistency_score: number;
    adherence_level: string;
  };
}

export interface MetricItem {
  id: string;
  date: string;
  value: number;
  unit: string;
  notes?: string | null;
}

export interface MetricsResponse {
  goal: string;
  metrics: Record<string, MetricItem[]>;
  summary: Record<string, {
    current: number;
    starting: number;
    change: number;
    change_percentage: number;
    trend: string;
  }>;
  recommendations: string[];
}

export interface ExerciseHistoryItem {
  date: string;
  session_id: string;
  // Weight Training
  weight_kg?: number;
  reps?: number;
  sets?: number;
  volume?: number;
  max_rpe?: number;
  total_reps?: number;
  // Cardio
  distance_km?: number;
  duration_minutes?: number;
  pace_min_per_km?: number;
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  // Flexibility
  difficulty?: string;
  total_duration?: number;
  
  // Dynamic fields
  watts?: number;
  cadence?: number;
  speed?: number;
  resistance?: number;
  incline?: number;
  level?: number;
  rpe?: number;
  
  notes?: string | null;
}

export interface ExerciseHistoryRecord {
  exercise: string;
  exercise_name?: string;
  exercise_id: string;
  type: string;
  is_bodyweight: boolean;
  muscle_groups: string[];
  tracking_fields?: string[];
  history: ExerciseHistoryItem[];
  statistics: {
    total_sessions: number;
    first_date: string;
    last_date: string;
    progress_percentage: number;
    // Type specific stats
    average_weight?: number;
    max_weight?: number;
    total_volume?: number;
    average_reps?: number;
    max_reps?: number;
    total_reps?: number;
    total_distance_km?: number;
    total_duration_minutes?: number;
    total_calories?: number;
    best_pace?: number;
    average_pace?: number;
    pace_improvement_percentage?: number;
    average_duration?: number;
    max_duration?: number;
  };
}

export interface ExerciseHistoryResponse {
  exercises: ExerciseHistoryRecord[];
  total_exercises: number;
  date_range: {
    from: string;
    to: string;
  };
}

export interface TrainingProgram {
  id: number;
  client_id: string;
  name: string;
  description: string;
  duration_weeks: number;
  current_week: number;
  start_date: string;
  end_date: string;
  goal: string;
  status: string;
  exercises: ProgramExercise[];
  created_at: string;
  updated_at: string;
}

export interface ProgramExercise {
  id: string;
  name: string;
  type: string; // weight_training, cardio, flexibility
  category: string;
  muscle_groups: string[];
  is_bodyweight: boolean;
  tracking_fields?: string[];
  program_prescription: {
    sets?: number;
    reps?: number;
    rest_seconds?: number;
    frequency_per_week?: number;
    distance_km?: number;
    target_duration_minutes?: number;
    intensity?: string;
    duration_minutes?: number; 
    notes?: string;
  };
  current_performance?: {
    weight_kg?: number;
    reps?: number;
    sets?: number;
    date: string;
    total_reps?: number;
    distance_km?: number;
    duration_minutes?: number;
    pace_min_per_km?: number;
    calories?: number;
  };
  previous_performance?: {
    weight_kg?: number;
    reps?: number;
    sets?: number;
    date: string;
    total_reps?: number;
    distance_km?: number;
    duration_minutes?: number;
    pace_min_per_km?: number;
    calories?: number;
  };
  progress_percentage: number;
}

export const clientService = {
  // ... (keep existing methods)
  async getMe(retries = 3, delay = 500): Promise<ClientProfile> {
      try {
        const response = await api.get("/trainee/me");
        // Ensure the response matches ClientProfile
        // Backend returns JSON fields like: { id, name, email, avatar_url, ... }
        // which matches ClientProfile interface (assuming snake_case to camelCase handled or interface uses snake_case keys?)
        // Looking at ClientProfile interface above: it uses snake_case for keys (e.g. avatar_url, phone_number).
        // So direct return is likely fine if backend returns strict JSON struct.
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
             throw error; 
        }
        if (retries > 0) {
          console.warn(`getMe failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return clientService.getMe(retries - 1, delay * 2);
        }
        throw error;
      }
  },

  async getClientSessions(
    clientId: string | number,
    params?: {
      start_date?: string;
      end_date?: string;
      status?: string;
      filter?: string;
      include?: string[];
      page?: number;
      limit?: number;
    }
  ): Promise<{ sessions: Session[]; pagination: any }> {
    const response = await api.get(`/clients/${clientId}/sessions`, { params });
    // The API returns { success: true, data: { sessions: [...], pagination: {...} } }
    return response.data.data; 
  },

  async getMySchedules(): Promise<Session[]> {
      // Updated to use Trainee endpoint
      const response = await api.get("/trainee/sessions");
      // API returns { success: true, data: { sessions: [...] } }
      return response.data.data?.sessions || [];
  },

  async getSessionDetail(
    _clientId: string | number,
    sessionId: string | number
  ): Promise<Session> {
    // Updated to use Trainee endpoint (clientId is ignored as backend uses token)
    const response = await api.get(
      `/trainee/sessions/${sessionId.toString()}`,
      {
        params: { include: ["exercises"] },
      }
    );
    // API returns { success: true, data: { ...session } }
    return response.data.data;
  },
  
  async updateExerciseSet(
    clientId: string,
    sessionId: string,
    exerciseId: string,
    setNumber: number,
    data: UpdateSetRequest
  ): Promise<UpdateSetResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await api.patch(
        `/clients/${clientId}/sessions/${sessionId}/exercises/${exerciseId}/sets/${setNumber}`,
        data,
        {
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      return response.data.data; // Assuming API returns { success: true, data: ... }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
         throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
      }

      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          throw new Error('กรุณาเข้าสู่ระบบใหม่');
        } else if (status === 403) {
          throw new Error('คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลนี้');
        } else if (status === 404) {
           throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข');
        } else if (status >= 500) {
           throw new Error('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง');
        }
      }
      
      throw new Error(error.message || 'ไม่สามารถบันทึกข้อมูลได้');
    }
  },

  // Fetch metrics like weight history
  // Uses shared /client-metrics endpoint (accessible to both trainer and trainee)
  async getClientMetrics(clientId: string | number, type?: string): Promise<ClientMetric[]> {
    const response = await api.get(`/client-metrics`, {
      params: { client_id: clientId, type }
    });
    // Bug 2 fix: unwrap .data.data (array) — API returns { success, data: [...] }
    return response.data.data || response.data;
  },

  /**
   * Get current training program with exercises and performance comparison
   */
  async getCurrentProgram(_clientId: string): Promise<TrainingProgram> {
    // Updated to use Trainee endpoint (clientId ignored)
    const response = await api.get(`/trainee/program/current`);
    return response.data;
  },

  /**
   * Get specific program details (includes days and sections)
   */
  async getProgramDetails(programId: string | number): Promise<any> {
    const response = await api.get(`/programs/${programId}`);
    return response.data;
  },

  /**
   * Get exercise history for progress tracking
   */
  async getExerciseHistory(
    _clientId: string,
    params?: {
      exercise_name?: string;
      type?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
    }
  ): Promise<ExerciseHistoryResponse> {
    const response = await api.get(`/trainee/exercises/history`, { params });
    return response.data;
  },

  /**
   * Get all exercises (for mapping IDs to names)
   */
  async getExercises(): Promise<any[]> {
    const response = await api.get("/exercises");
    return response.data;
  },

  /**
   * Get metrics with goal-based filtering (enhanced)
   */
  async getMetrics(
    clientId: string,
    params?: {
      type?: string;
      goal?: string;
      from_date?: string;
      to_date?: string;
      group_by?: string;
    }
  ): Promise<MetricsResponse> {
    // Uses shared /client-metrics endpoint (accessible to both trainer and trainee)
    const response = await api.get(`/client-metrics`, {
      params: { client_id: clientId, ...params }
    });
    return response.data;
  },

  /**
   * Get program statistics
   */
  async getProgramStatistics(
    _clientId: string,
    params?: { period?: string }
  ): Promise<ProgramStats> {
    const response = await api.get(`/trainee/program/current/statistics`, { params });
    return response.data;
  },

  async getClientProgram(clientId: string | number) {
    // Deprecated? Or alias to getCurrentProgram?
    try {
      return await this.getCurrentProgram(clientId.toString());
    } catch (e) {
      return null;
    } 
  },
  
  async getDashboardStats() {
    // Note: /dashboard/stats is trainer-only; trainee returns null gracefully
     try {
       const response = await api.get("/dashboard/stats");
       return response.data;
     } catch (e: any) {
       if (e.response?.status === 403) {
         console.warn("Dashboard stats is not available for trainee role");
       }
       return null;
     }
  },

  async getMyExerciseHistory(_clientId?: string | number): Promise<ExerciseHistoryRecord[]> {
    const response = await api.get("/trainee/exercises/history");
    return response.data.exercises || []; // Unwrap the object
  },
};

export const getExerciseHistory = (id: string | number) => clientService.getMyExerciseHistory(id);

