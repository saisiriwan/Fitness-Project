
// ==========================================
// 1. Interfaces & Types
// ==========================================

// --- Shared Types ---
export interface Metric {
  date: string;
  value: number;
}

export type TrainingType = 'weight-training' | 'cardio' | 'flexibility' | 'mobility' | 'sport-specific';
export type Modality = 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'flexibility' | 'recovery';
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core' | 'Full Body' | 'Cardio';

// --- Exercise ---
export interface Exercise {
  id: string;
  name: string;
  trainingType: TrainingType;
  modality: Modality; // specific focus
  muscleGroups: string[];
  movementPattern: string; // Squat, Hinge, Push, Pull, Lunge, Rotate, Carry
  instructions: string;
  category: string; // Compound, Isolation, Machine, Cable, Bodyweight
  isDefault?: boolean;
  createdBy?: string;
  createdAt?: string;
  videoUrl?: string; // Optional: Link to demo video
  thumbnailUrl?: string; // Optional: Image
}

// --- Client ---
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  goal: string;
  status: 'active' | 'paused' | 'inactive';
  tags: string[];
  joinDate: string;
  nextSession?: string;
  currentProgram?: string;
  avatar?: string;
  metrics?: {
    weight?: number; // Current weight
    height?: number;
    bodyFat?: number;
    muscle?: number;
  };
  notes: string;
  personalNotes?: string;
  preferences?: {
    likedExercises?: string[];
    dislikedExercises?: string[];
    injuries?: string[];
    specialNotes?: string;
  };
  userId?: string;
  trainers?: string[];
  username?: string;
  password?: string;
  joinedAt?: string;
}

// --- Trainer ---
export interface Trainer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  avatar?: string;
  username: string;
  trainerCode: string;
  clients?: string[];
}

// --- Connection Request ---
export interface ConnectionRequest {
  id: string;
  clientId: string;
  trainerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  message?: string;
}

// --- Program & Templates ---

export interface ProgramExercise {
  exerciseId: string;
  sets: number;
  reps: string; // "8-12", "AMRAP", "30s"
  weight?: string; // "70% 1RM", "RPE 8"
  rest: number; // seconds
  notes?: string;
  tempo?: string; // "3-0-1-0"
  rpe?: number;
}

export interface ProgramSection {
  id: string;
  sectionType: 'warmup' | 'main' | 'skill' | 'cooldown' | 'custom';
  sectionFormat: 'circuit' | 'straight-sets' | 'superset' | 'amrap' | 'emom' | 'tabata' | 'custom';
  name: string;
  duration?: number;
  exercises?: ProgramExercise[]; // Legacy/Simple support
  notes?: string;
  rounds?: number;
  workTime?: number;
  restTime?: number;
}

export interface ProgramDay {
  dayNumber: number;
  name: string;
  isRestDay?: boolean;
  sections?: ProgramSection[];
  // Legacy support
  exercises?: ProgramExercise[]; 
}

export interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  duration: number; // weeks
  daysPerWeek: number;
  weeks: ProgramWeek[];
  createdAt: string;
  createdBy?: string;
  isArchived?: boolean;
  // Tags/Labels could be added here
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// Deprecated: Alias for backward compatibility if needed, but we should migrate to ProgramTemplate
export interface Program extends ProgramTemplate {
  assignedClients: string[]; // Legacy: specific assignments
}

export interface ProgramInstance {
  id: string;
  templateId: string;
  clientId: string;
  trainerId: string;
  assignedAt: string;
  startDate: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currentWeek: number;
  currentDay: number;
  completedWeeks: number[];
  completedDays: { week: number; day: number }[];
  notes?: string;
  // Allows customization per client without changing the template
  modifiedExercises?: {
    weekNumber: number;
    dayNumber: number;
    exercises: ProgramExercise[];
  }[];
}

export interface ProgramAssignment {
  id: string;
  clientId: string;
  programId: string;
  assignmentStartDate: string;
  startingDay: number;
  notifyClient: boolean;
  assignedAt: string;
}

export interface ClientProgramDay {
  dayNumber: number;
  dayData: ProgramDay;
  weekNumber: number;
}

// --- Session (Workout Log) ---
export interface SessionExercise {
  exerciseId: string;
  sets: {
    reps?: number;
    weight?: number;
    rpe?: number;
    rest?: number;
    duration?: number; // seconds
    distance?: number; // meters/km
    heartRate?: number;
    completed: boolean;
  }[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  clientId: string;
  trainerId?: string;
  programId?: string; // Legacy
  programInstanceId?: string;
  weekNumber?: number;
  dayNumber?: number;
  date: string;
  endTime?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  exercises: SessionExercise[];
  duration?: number; // minutes
  notes?: string; // Trainer notes
  summary?: string; // Client feedback
  sharedWithClient?: boolean;
  
  // Dashboard Metrics
  type?: TrainingType;
  rating?: number; // 1-5
  bodyWeight?: number;
  PRs?: string[]; // Personal Records broken
}

// --- Calendar ---
export interface CalendarNote {
  id: string;
  date: string;
  type: 'note' | 'rest-day';
  title?: string;
  content?: string;
  createdAt: string;
}

// ==========================================
// 2. Default/Mock Data
// ==========================================

export const defaultExercises: Exercise[] = [
  // Strength - Legs
  {
    id: 'ex-1',
    name: 'Barbell Squat',
    trainingType: 'weight-training',
    modality: 'strength',
    muscleGroups: ['Legs', 'Glutes', 'Core'],
    movementPattern: 'Squat',
    instructions: 'วางบาร์เบลบนบ่า ยืนกางขาเท่าช่วงไหล่ หย่อนสะโพกและย่อเข่าลงจนต้นขาขนานพื้น แล้วดันตัวขึ้น',
    category: 'Compound',
    isDefault: true
  },
  {
    id: 'ex-10',
    name: 'Walking Lunges',
    trainingType: 'weight-training',
    modality: 'strength',
    muscleGroups: ['Legs', 'Glutes'],
    movementPattern: 'Lunge',
    instructions: 'ก้าวขาไปข้างหน้า ย่อตัวลงจนเข่าหลังเกือบแตะพื้น แล้วก้าวขาอีกข้างตาม ทำสลับกัน',
    category: 'Bodyweight',
    isDefault: true
  },
  // Strength - Push
  {
    id: 'ex-2',
    name: 'Bench Press',
    trainingType: 'weight-training',
    modality: 'strength',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    movementPattern: 'Push',
    instructions: 'นอนราบ ดันบาร์เบลขึ้นจากระดับอกจนแขนตึง ควบคุมจังหวะลงช้าๆ',
    category: 'Compound',
    isDefault: true
  },
  {
    id: 'ex-5',
    name: 'Overhead Press',
    trainingType: 'weight-training',
    modality: 'strength',
    muscleGroups: ['Shoulders', 'Triceps'],
    movementPattern: 'Push',
    instructions: 'ยืนตรง ดันบาร์เบลจากระดับไหล่ขึ้นเหนือศีรษะจนแขนตึง',
    category: 'Compound',
    isDefault: true
  },
  // Strength - Pull
  {
    id: 'ex-3',
    name: 'Deadlift',
    trainingType: 'weight-training',
    modality: 'strength',
    muscleGroups: ['Back', 'Legs', 'Core'],
    movementPattern: 'Hinge',
    instructions: 'ยืนหลังตรง พับสะโพกจับบาร์เบล ยกขึ้นโดยใช้แรงจากสะโพกและขา ล็อคหลังให้ตรงตลอดเวลา',
    category: 'Compound',
    isDefault: true
  },
  {
    id: 'ex-4',
    name: 'Lat Pulldown',
    trainingType: 'weight-training',
    modality: 'hypertrophy',
    muscleGroups: ['Back', 'Biceps'],
    movementPattern: 'Pull',
    instructions: 'จับบาร์กว้างกว่าไหล่ ดึงลงมาจนถึงระดับอกบน แล้วค่อยๆ ผ่อนกลับขึ้นไป',
    category: 'Machine',
    isDefault: true
  },
  // Cardio
  {
    id: 'ex-16',
    name: 'Burpees',
    trainingType: 'cardio',
    modality: 'endurance',
    muscleGroups: ['Full Body'],
    movementPattern: 'Plyometric',
    instructions: 'ย่อตัวลงมือแตะพื้น ดีดขาไปด้านหลัง วิดพื้น 1 ครั้ง ดีดขากลับ แล้วกระโดดขึ้น',
    category: 'HIIT',
    isDefault: true
  },
  {
    id: 'ex-cardio-1',
    name: 'Running (Treadmill)',
    trainingType: 'cardio',
    modality: 'endurance',
    muscleGroups: ['Legs', 'Cardio'],
    movementPattern: 'Locomotion',
    instructions: 'วิ่งบนลู่วิ่ง รักษาจังหวะการหายใจและท่าทางให้เหมาะสม',
    category: 'Cardio',
    isDefault: true
  },
  // Core
  {
    id: 'ex-18',
    name: 'Plank',
    trainingType: 'weight-training',
    modality: 'strength',
    muscleGroups: ['Core'],
    movementPattern: 'Stability',
    instructions: 'นอนคว่ำ ตั้งศอก วางเท้าจิกพื้น ยกตัวขึ้นให้เป็นเส้นตรง เกร็งหน้าท้องค้างไว้',
    category: 'Bodyweight',
    isDefault: true
  },
  // Flexibility/Recovery
  {
    id: 'ex-20',
    name: 'Full Body Stretching',
    trainingType: 'flexibility',
    modality: 'recovery',
    muscleGroups: ['Full Body'],
    movementPattern: 'Stretch',
    instructions: 'ยืดเหยียดกล้ามเนื้อทั่วร่างกาย เน้นจุดที่ตึงเครียด',
    category: 'Recovery',
    isDefault: true
  }
];

export const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'สมชาย ใจดี (Weight Loss)',
    email: 'somchai@example.com',
    phone: '081-234-5678',
    goal: 'ลดน้ำหนัก 5 กิโล ภายใน 2 เดือน',
    status: 'active',
    tags: ['weight-loss', 'beginner', 'office-syndrome'],
    joinDate: '2024-01-15',
    currentProgram: 'program-1',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    metrics: { weight: 85, height: 175, bodyFat: 28 },
    notes: 'ทำงานออฟฟิศ นั่งนาน มีอาการปวดหลังล่างเล็กน้อย ต้องการลดพุง',
    userId: 'user-1',
    username: 'somchai',
    trainers: ['trainer-1']
  },
  {
    id: 'client-2',
    name: 'มาลี แข็งแกร่ง (Muscle Gain)',
    email: 'malee@example.com',
    phone: '082-345-6789',
    goal: 'สร้างกล้ามเนื้อ ขาและก้น',
    status: 'active',
    tags: ['hypertrophy', 'intermediate', 'glute-focus'],
    joinDate: '2024-02-01',
    currentProgram: 'program-2',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    metrics: { weight: 52, height: 160, bodyFat: 22 },
    notes: 'เคยเล่นเวทมาบ้างแล้ว 1 ปี โฟกัสฟอร์มการเล่นดีมาก',
    userId: 'user-2',
    username: 'malee',
    trainers: ['trainer-1']
  },
  {
    id: 'client-new',
    name: 'น้องใหม่ ไฟแรง',
    email: 'new@example.com',
    phone: '090-000-0000',
    goal: 'สุขภาพทั่วไป',
    status: 'active',
    tags: ['beginner', 'health'],
    joinDate: '2024-12-20',
    metrics: { weight: 60, height: 170 },
    notes: 'เพิ่งเริ่มออกกำลังกายครั้งแรก',
    username: 'newbie',
    trainers: ['trainer-1']
  }
];

export const mockTrainers: Trainer[] = [
  {
    id: 'trainer-1',
    name: 'โค้ชเอก (Trainer Pro)',
    email: 'trainer1@example.com',
    phone: '081-999-9999',
    specialty: 'Body Transformation',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face',
    username: 'coach_ake',
    trainerCode: 'AKE2024',
    clients: ['client-1', 'client-2', 'client-new']
  }
];

// Example Program: 8 Weeks Weight Loss (Detailed)
export const mockPrograms: Program[] = [
  {
    id: 'program-1',
    name: '⭐ 8-Week Weight Loss Transformation',
    description: 'โปรแกรมลดไขมันเน้นการเผาผลาญพลังงานด้วย Circuit Training และสร้างกล้ามเนื้อพื้นฐาน เหมาะสำหรับผู้เริ่มต้น',
    duration: 8,
    daysPerWeek: 3,
    difficulty: 'beginner',
    createdAt: '2024-01-01',
    assignedClients: [],
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            dayNumber: 1,
            name: 'Day 1: Full Body Circuit',
            sections: [
              {
                id: 'sec-warmup',
                sectionType: 'warmup',
                sectionFormat: 'straight-sets',
                name: 'Dynamic Warmup',
                exercises: [
                  { exerciseId: 'ex-20', sets: 1, reps: '5 mins', rest: 0, notes: 'หมุนแขน, เหวี่ยงขา, กระโดดตบเบาๆ' }
                ]
              },
              {
                id: 'sec-main',
                sectionType: 'main',
                sectionFormat: 'circuit',
                name: 'Main Circuit (3 Rounds)',
                rounds: 3,
                notes: 'พัก 60 วินาทีระหว่างรอบ',
                exercises: [
                  { exerciseId: 'ex-1', sets: 1, reps: '15', rest: 15, notes: 'Bodyweight Squats' },
                  { exerciseId: 'ex-5', sets: 1, reps: '12', rest: 15, notes: 'ใช้ดัมเบลเบาๆ' },
                  { exerciseId: 'ex-4', sets: 1, reps: '12', rest: 15, notes: 'ยางยืดหรือเครื่อง' },
                  { exerciseId: 'ex-18', sets: 1, reps: '30s', rest: 60, notes: 'Plank' }
                ]
              },
              {
                id: 'sec-cool',
                sectionType: 'cooldown',
                sectionFormat: 'straight-sets',
                name: 'Cooldown',
                exercises: [
                  { exerciseId: 'ex-20', sets: 1, reps: '5 mins', rest: 0, notes: 'ยืดเหยียดกล้ามเนื้อที่ใช้งาน' }
                ]
              }
            ]
          },
          {
            dayNumber: 2,
            name: 'Day 2: Cardio & Core',
            sections: [
              {
                id: 'sec-main-2',
                sectionType: 'main',
                sectionFormat: 'straight-sets',
                name: 'Steady State Cardio',
                exercises: [
                  { exerciseId: 'ex-cardio-1', sets: 1, reps: '30 mins', rest: 0, notes: 'เดินชัน หรือวิ่งเหยาะๆ โซน 2' }
                ]
              }
            ]
          }
        ]
      },
      // ... more weeks conceptually
    ]
  },
  {
    id: 'program-2',
    name: '💪 Beginner Strength Foundation',
    description: 'เน้นสร้างความแข็งแรงและขนาดกล้ามเนื้อ (Hypertrophy) ด้วยท่าหลัก Compound Movement',
    duration: 12,
    daysPerWeek: 4,
    difficulty: 'intermediate',
    createdAt: '2024-02-01',
    assignedClients: [],
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            dayNumber: 1,
            name: 'Upper Body Power',
            sections: [
              {
                id: 'sec-main-upper',
                sectionType: 'main',
                sectionFormat: 'straight-sets',
                name: 'Main Lifts',
                exercises: [
                  { exerciseId: 'ex-2', sets: 4, reps: '6-8', weight: 'RPE 8', rest: 90, notes: 'เน้นควบคุมบาร์ลงช้าๆ' },
                  { exerciseId: 'ex-4', sets: 3, reps: '10-12', weight: 'RPE 8', rest: 60, notes: '' },
                  { exerciseId: 'ex-5', sets: 3, reps: '8-10', weight: 'RPE 8', rest: 60, notes: '' }
                ]
              }
            ]
          },
          {
            dayNumber: 2,
            name: 'Lower Body Power',
            sections: [
              {
                id: 'sec-main-lower',
                sectionType: 'main',
                sectionFormat: 'straight-sets',
                name: 'Legs',
                exercises: [
                  { exerciseId: 'ex-1', sets: 4, reps: '6-8', weight: 'RPE 8', rest: 120, notes: 'Squat ลึกขนานพื้น' },
                  { exerciseId: 'ex-3', sets: 3, reps: '8-10', weight: 'RPE 7', rest: 90, notes: 'Romanian Deadlift' }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const mockSessions: WorkoutSession[] = [
  {
    id: 'session-completed-1',
    clientId: 'client-1',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    status: 'completed',
    duration: 55,
    type: 'weight-training',
    notes: 'ลูกค้าทำได้ดีมาก โฟกัส squat ได้ดีขึ้น ไม่ปวดหลังแล้ว',
    summary: 'รู้สึกสดชื่น ไม่เหนื่อยจนเกินไป',
    rating: 5,
    exercises: [
      {
        exerciseId: 'ex-1',
        sets: [
          { reps: 15, weight: 0, completed: true },
          { reps: 15, weight: 0, completed: true },
          { reps: 15, weight: 0, completed: true }
        ]
      },
      {
        exerciseId: 'ex-18',
        sets: [
          { duration: 30, completed: true },
          { duration: 30, completed: true },
          { duration: 45, completed: true } // Progress!
        ]
      }
    ]
  },
  {
    id: 'session-scheduled-1',
    clientId: 'client-1',
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'scheduled',
    notes: 'เตรียมสอนท่านใหม่',
    exercises: [] // To be filled
  }
];

export const mockCalendarNotes: CalendarNote[] = [
  {
    id: 'note-1',
    date: new Date().toISOString().split('T')[0], // Today
    type: 'note',
    title: 'นัดคุยเรื่องโภชนาการ',
    content: 'นัดคุณสมชาย คุยเรื่องการปรับอาหารมื้อเย็น',
    createdAt: new Date().toISOString()
  }
];

export const mockProgramAssignments: ProgramAssignment[] = [];
export const mockConnectionRequests: ConnectionRequest[] = [];

// Helper
export const getDefaultExercisesWithIds = () => defaultExercises;
