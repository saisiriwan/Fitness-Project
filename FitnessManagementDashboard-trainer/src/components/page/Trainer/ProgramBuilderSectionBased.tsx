import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Copy,
  Edit,
  Trash,
  Search,
  Dumbbell,
  Star,
  Settings,
  Flame,
  Wind,
  Target,
  Zap,
  Calendar as CalendarIcon,
  BookOpen,
  MoreHorizontal,
  X,
  Moon,
  Repeat,
  FileText,
  Users,
  Activity,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import AssignProgramModal from "./AssignProgramModal";

import { SharedExercise, DEFAULT_TRACKING_FIELDS } from "@/types/exercise";

// --- Interfaces ---

interface ProgramExercise {
  id?: string;
  exerciseId: string;
  sets: number;
  reps: any;
  weight: any;
  rest: number;
  rpe?: number;
  notes?: any; // ✅ FIX #1: เปลี่ยนเป็น any เพราะอาจเป็น Array
  duration?: any;
  distance?: any;
  pace?: any;
  side?: any;
  tempo?: any;
  hold_time?: any;
  time?: any;
  speed?: any;
  cadence?: any;
  distance_long?: any;
  distance_short?: any;
  one_rm?: any;
  rir?: any;
  heart_rate?: any;
  hr_zone?: any;
  watts?: any;
  rpm?: any;
  rounds?: any;
  video_link?: string;
  trackingFields?: string[];
}

interface ProgramSection {
  id: string;
  sectionType: string;
  sectionFormat: string;
  name: string;
  duration?: number;
  exercises: ProgramExercise[];
  notes?: string;
  rounds?: number;
  workTime?: number;
  restTime?: number;
}

interface ProgramDay {
  id: string;
  programId?: string;
  weekNumber?: number;
  dayNumber: number;
  name: string;
  sections: ProgramSection[];
  isRestDay: boolean;
}

interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

interface Program {
  id: string;
  name: string;
  description?: string;
  duration: number;
  daysPerWeek: number;
  weeks: ProgramWeek[];
  isTemplate: boolean;
  assignedClients?: string[];
  assigned_client_count?: number;
  clientId?: string;
  originalTemplateId?: string;
}

interface ExerciseSet {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number | string;
  distance?: number;
  rest?: number | string;
  rpe?: number;
  notes?: string;
  pace?: string;
  side?: string;
  hold_time?: number | string;
  tempo?: string;
  time?: number | string;
  speed?: number;
  cadence?: number;
  distance_long?: number;
  distance_short?: number;
  one_rm?: number;
  rir?: number;
  heart_rate?: number;
  hr_zone?: number;
  watts?: number;
  rpm?: number;
  rounds?: number;
  video_link?: string;
}

interface NewSectionExercise {
  exerciseId: string;
  trackingFields?: string[];
  sets: ExerciseSet[];
}

interface ExerciseData extends Omit<SharedExercise, "id"> {
  id: string;
}

const FIELD_CONFIG: Record<
  string,
  { label: string; placeholder: string; type: string }
> = {
  reps: { label: "REPS", placeholder: "10", type: "text" },
  weight: { label: "WEIGHT", placeholder: "0", type: "number" },
  distance: { label: "Distance", placeholder: "0", type: "text" },
  pace: { label: "Pace", placeholder: "6:00", type: "text" },
  duration: { label: "Duration", placeholder: "0", type: "text" },
  hold_time: { label: "Hold Time", placeholder: "30", type: "text" },
  tempo: { label: "Tempo", placeholder: "3-1-1", type: "text" },
  rest: { label: "REST TIME", placeholder: "00:00", type: "text" },
  rpe: { label: "RPE", placeholder: "1-10", type: "number" },
  side: { label: "Side", placeholder: "L/R", type: "text" },
  time: { label: "Time", placeholder: "00:00", type: "text" },
  speed: { label: "Speed", placeholder: "0", type: "number" },
  cadence: { label: "Cadence", placeholder: "0", type: "number" },
  distance_long: { label: "Distance (long)", placeholder: "0", type: "number" },
  distance_short: {
    label: "Distance (short)",
    placeholder: "0",
    type: "number",
  },
  one_rm: { label: "%1RM", placeholder: "0", type: "number" },
  rir: { label: "RIR", placeholder: "0", type: "number" },
  heart_rate: { label: "Heart Rate", placeholder: "0", type: "number" },
  hr_zone: { label: "%HR", placeholder: "0", type: "number" },
  watts: { label: "Watts", placeholder: "0", type: "number" },
  rpm: { label: "RPM", placeholder: "0", type: "number" },
  rounds: { label: "Rounds", placeholder: "0", type: "number" },
  sets: { label: "Sets", placeholder: "3", type: "number" },
  notes: { label: "Notes", placeholder: "tempo, technique...", type: "text" },
  work_time: { label: "Work", placeholder: "00:30", type: "text" },
  rest_time: { label: "Rest", placeholder: "00:10", type: "text" },
};

const SECTION_TYPES = [
  {
    value: "warmup",
    label: "Warm-up (อบอุ่นร่างกาย)",
    icon: Flame,
    color: "text-orange-500",
  },
  {
    value: "main",
    label: "Main Work (ฝึกซ้อมหลัก)",
    icon: Dumbbell,
    color: "text-blue-500",
  },
  {
    value: "skill",
    label: "Skill Development (พัฒนาทักษะ)",
    icon: Target,
    color: "text-purple-500",
  },
  {
    value: "cooldown",
    label: "Cool-down (คลายกล้ามเนื้อ)",
    icon: Wind,
    color: "text-green-500",
  },
  {
    value: "custom",
    label: "Custom (กำหนดเอง)",
    icon: Settings,
    color: "text-gray-500",
  },
];

// ✅ FIX Bug #8: Static map แทน dynamic Tailwind class
const SECTION_BG_MAP: Record<string, string> = {
  warmup: "bg-orange-100",
  main: "bg-blue-100",
  skill: "bg-purple-100",
  cooldown: "bg-green-100",
  custom: "bg-gray-100",
};

// ✅ FIX Duration Bug: Helper กลางแปลงเวลา
const parseTimeToSeconds = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const setsToSecondsArray = (
  sets: ExerciseSet[],
  field: keyof ExerciseSet,
): number[] => {
  return sets.map((s) => parseTimeToSeconds(s[field]));
};

export default function ProgramBuilderSectionBased() {
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [exercisesList, setExercisesList] = useState<ExerciseData[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );
  const [selectedProgramDetail, setSelectedProgramDetail] =
    useState<Program | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "template" | "custom">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    description: "",
    isTemplate: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  );
  const [newSection, setNewSection] = useState<Partial<ProgramSection>>({
    sectionType: "warmup",
    sectionFormat: "straight-sets",
    name: "",
    duration: 10,
    rounds: 3,
    workTime: 30,
    restTime: 15,
    exercises: [],
    notes: "",
  });
  const [newSectionExercises, setNewSectionExercises] = useState<
    NewSectionExercise[]
  >([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(
    null,
  );
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] =
    useState<ProgramExercise | null>(null);
  const [editingExerciseSets, setEditingExerciseSets] = useState<ExerciseSet[]>(
    [],
  );
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [weekToDelete, setWeekToDelete] = useState<ProgramWeek | null>(null);
  const [showDayOptionsDialog, setShowDayOptionsDialog] = useState(false);
  const [selectedDayForOptions, setSelectedDayForOptions] =
    useState<ProgramDay | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showWorkoutChoiceDialog, setShowWorkoutChoiceDialog] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new-program") {
      setCreateFormData({ name: "", description: "", isTemplate: true });
      setIsEditing(false);
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [progRes, exRes, clientRes] = await Promise.all([
        api.get("/programs"),
        api.get("/exercises"),
        api.get("/clients"),
      ]);
      const allPrograms = progRes.data || [];
      const allClients = clientRes.data || [];

      const mappedPrograms = allPrograms.map((p: any) => ({
        ...p,
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        duration: p.duration_weeks,
        daysPerWeek: p.days_per_week,
        isTemplate: p.is_template,
        assigned_client_count: 0,
        assignedClients: [],
        clientId: p.client_id,
        parentProgramId: p.parent_program_id,
      }));

      const programsMap = new Map<string, any>();
      const assignments: any[] = [];
      mappedPrograms.forEach((p: any) => {
        if (!p.parentProgramId) programsMap.set(p.id, p);
        else assignments.push(p);
      });

      assignments.forEach((assign: any) => {
        const parentId = assign.parentProgramId.toString();
        if (programsMap.has(parentId)) {
          const parent = programsMap.get(parentId);
          parent.assigned_client_count =
            (parent.assigned_client_count || 0) + 1;
          const client = allClients.find(
            (c: any) =>
              c.user_id === assign.clientId || c.id === assign.clientId,
          );
          if (client) {
            if (!parent.assignedClients) parent.assignedClients = [];
            if (!parent.assignedClients.includes(client.name))
              parent.assignedClients.push(client.name);
          }
        } else {
          programsMap.set(assign.id, assign);
        }
      });

      setPrograms(Array.from(programsMap.values()));
      setExercisesList(
        (exRes.data || []).map((ex: any) => ({
          ...ex,
          id: ex.id.toString(),
          muscleGroups: ex.muscle_groups || [],
          category: ex.category || "strength",
          trackingFields:
            ex.tracking_fields && ex.tracking_fields.length > 0
              ? ex.tracking_fields.map((f: string) => f.toLowerCase())
              : DEFAULT_TRACKING_FIELDS[ex.category || "strength"] ||
                DEFAULT_TRACKING_FIELDS["strength"],
        })),
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    }
  };

  useEffect(() => {
    if (selectedProgramId) fetchProgramDetail(selectedProgramId);
  }, [selectedProgramId]);

  const fetchProgramDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/programs/${id}`);
      const programData = res.data?.program || res.data || {};
      const daysData = res.data?.schedule || res.data?.days || [];
      if (!programData.id)
        throw new Error("Invalid program data structure (Missing ID)");

      const weeksMap = new Map<number, ProgramDay[]>();
      daysData.forEach((day: any) => {
        const uiDay: ProgramDay = {
          id: day.id.toString(),
          programId: day.program_id?.toString(),
          weekNumber: day.week_number || 1,
          dayNumber: day.day_number || 1,
          name: day.name || `Day ${day.day_number}`,
          isRestDay: day.is_rest_day,
          sections:
            day.sections
              ?.map((sec: any) => ({
                id: sec.id.toString(),
                name: sec.name,
                sectionType: sec.type,
                sectionFormat: sec.format,
                duration: sec.duration_seconds
                  ? Math.round(sec.duration_seconds / 60)
                  : 0,
                notes: sec.notes,
                exercises:
                  sec.exercises
                    ?.map((ex: any) => ({
                      id: ex.id.toString(),
                      exerciseId: ex.exercise_id.toString(),
                      sets: ex.sets,
                      reps: ex.reps,
                      weight: ex.weight,
                      notes: ex.notes,
                      distance: ex.distance,
                      pace: ex.pace,
                      tempo: ex.tempo,
                      side: ex.side,
                      duration:
                        ex.duration ||
                        (ex.duration_seconds
                          ? ex.duration_seconds.toString()
                          : undefined),
                      hold_time: ex.hold_time,
                      rest:
                        ex.rest ||
                        (ex.rest_seconds
                          ? ex.rest_seconds.toString()
                          : undefined),
                      rpe:
                        ex.rpe ||
                        (ex.rpe_target ? ex.rpe_target.toString() : undefined),
                      time: ex.time,
                      speed: ex.speed,
                      cadence: ex.cadence,
                      distance_long: ex.distance_long,
                      distance_short: ex.distance_short,
                      one_rm: ex.one_rm,
                      rir: ex.rir,
                      heart_rate: ex.heart_rate,
                      hr_zone: ex.hr_zone,
                      watts: ex.watts,
                      rpm: ex.rpm,
                      rounds: ex.rounds,
                      video_link: ex.video_link,
                      trackingFields: ex.tracking_fields
                        ? ex.tracking_fields.map((f: string) => f.toLowerCase())
                        : undefined,
                    }))
                    .sort((a: any, b: any) => a.order - b.order) || [],
              }))
              .sort((a: any, b: any) => a.order - b.order) || [],
        };
        if (!weeksMap.has(day.week_number)) weeksMap.set(day.week_number, []);
        weeksMap.get(day.week_number)?.push(uiDay);
      });

      const weeks: ProgramWeek[] = Array.from(weeksMap.entries())
        .map(([weekNum, days]) => ({
          weekNumber: weekNum,
          days: days.sort((a, b) => a.dayNumber - b.dayNumber),
        }))
        .sort((a, b) => a.weekNumber - b.weekNumber);

      const totalActiveDays = daysData.filter(
        (d: any) => !d.is_rest_day,
      ).length;
      const durationWeeks = programData.duration_weeks || 1;
      const calculatedDuration =
        weeks.length > 0
          ? weeks[weeks.length - 1].weekNumber
          : programData.duration_weeks || 1;

      const fullProgram: Program = {
        ...programData,
        id: programData.id?.toString(),
        isTemplate: programData.is_template,
        duration: calculatedDuration,
        daysPerWeek:
          Math.round(totalActiveDays / durationWeeks) ||
          programData.days_per_week,
        assigned_client_count: programData.assigned_clients?.length || 0,
        weeks,
      };

      setSelectedProgramDetail(fullProgram);
      if (weeks.length > 0 && weeks[0].days.length > 0)
        setExpandedDays(new Set([weeks[0].days[0].id]));
      return fullProgram;
    } catch (error) {
      console.error("Error fetching detail:", error);
      toast.error("ไม่สามารถโหลดรายละเอียดได้");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helpers ---
  const formatTimeInput = (value: string) => {
    const clean = value.replace(/[^0-9]/g, "");
    if (clean.length === 3) return `${clean.slice(0, 1)}:${clean.slice(1)}`;
    if (clean.length >= 4) return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
    return clean;
  };

  const getFields = (data: ExerciseData | undefined) => {
    if (!data) return DEFAULT_TRACKING_FIELDS["strength"];
    if (data.trackingFields && data.trackingFields.length > 0)
      return data.trackingFields;
    return (
      DEFAULT_TRACKING_FIELDS[data.category || "strength"] ||
      DEFAULT_TRACKING_FIELDS["strength"]
    );
  };

  const toggleDay = (dayId: string) => {
    const s = new Set(expandedDays);
    if (s.has(dayId)) s.delete(dayId);
    else s.add(dayId);
    setExpandedDays(s);
  };

  const toggleSection = (secId: string) => {
    const s = new Set(expandedSections);
    if (s.has(secId)) s.delete(secId);
    else s.add(secId);
    setExpandedSections(s);
  };

  const getSectionTypeIcon = (type: string) =>
    SECTION_TYPES.find((t) => t.value === type)?.icon || Settings;
  const getSectionTypeColor = (type: string) =>
    SECTION_TYPES.find((t) => t.value === type)?.color || "text-gray-500";

  // ✅ FIX Bug #2 & #7: Helper หา section ID จริง และ order ภายใน section
  const findExerciseSectionInfo = (exerciseId: string | undefined) => {
    if (!selectedProgramDetail || !exerciseId)
      return { sectionId: undefined, order: 0 };
    for (const week of selectedProgramDetail.weeks) {
      for (const day of week.days) {
        for (const sec of day.sections) {
          const idx = (sec.exercises || []).findIndex(
            (e) => e.id === exerciseId,
          );
          if (idx !== -1) return { sectionId: parseInt(sec.id), order: idx };
        }
      }
    }
    return { sectionId: undefined, order: 0 };
  };

  const updateProgramFrequency = async (currentProgram: Program | null) => {
    if (!currentProgram) return;
    const totalDays = currentProgram.weeks.reduce(
      (acc, w) => acc + w.days.length,
      0,
    );
    const totalWeeks = currentProgram.weeks.length;
    const averageFreq = totalWeeks > 0 ? Math.round(totalDays / totalWeeks) : 0;
    if (averageFreq !== currentProgram.daysPerWeek) {
      try {
        await api.put(`/programs/${currentProgram.id}`, {
          name: currentProgram.name,
          description: currentProgram.description,
          is_template: currentProgram.isTemplate,
          duration_weeks: currentProgram.duration,
          days_per_week: averageFreq,
        });
        fetchProgramDetail(currentProgram.id);
      } catch (err) {
        console.warn("Failed to auto-update frequency", err);
      }
    }
  };

  const resetSectionForm = () => {
    setNewSection({
      sectionType: "warmup",
      sectionFormat: "straight-sets",
      name: "",
      duration: 10,
      rounds: 3,
      workTime: 30,
      restTime: 15,
      exercises: [],
      notes: "",
    });
    setNewSectionExercises([]);
    setIsQuickAddMode(false);
    setSelectedDayId(null);
    setSelectedDayNumber(null);
  };

  // --- Actions ---

  const handleCreateProgram = async () => {
    if (!createFormData.name.trim()) {
      toast.error("กรุณาระบุชื่อโปรแกรม");
      return;
    }
    const isDetailView = view === "detail";
    const currentId = selectedProgramId;
    try {
      if (isEditing && selectedProgramId) {
        const originalProgram = programs.find(
          (p) => p.id === selectedProgramId.toString(),
        );
        const durationToSave =
          originalProgram?.duration ||
          (selectedProgramDetail?.id === selectedProgramId.toString()
            ? selectedProgramDetail?.duration
            : 1) ||
          1;
        const daysPerWeekToSave =
          originalProgram?.daysPerWeek ||
          (selectedProgramDetail?.id === selectedProgramId.toString()
            ? selectedProgramDetail?.daysPerWeek
            : 7) ||
          7;
        await api.put(`/programs/${selectedProgramId}`, {
          name: createFormData.name,
          description: createFormData.description,
          is_template: createFormData.isTemplate,
          duration_weeks: durationToSave,
          days_per_week: daysPerWeekToSave,
        });
        toast.success("แก้ไขโปรแกรมเรียบร้อย");
        fetchInitialData();
        if (isDetailView && currentId && selectedProgramDetail) {
          setSelectedProgramDetail({
            ...selectedProgramDetail,
            name: createFormData.name,
            description: createFormData.description,
            isTemplate: createFormData.isTemplate,
            duration: durationToSave,
            daysPerWeek: daysPerWeekToSave,
          });
          fetchProgramDetail(currentId.toString());
        }
      } else {
        const res = await api.post("/programs", {
          name: createFormData.name,
          description: createFormData.description,
          is_template: createFormData.isTemplate,
          duration_weeks: 1,
          days_per_week: 7,
        });
        toast.success("สร้างโปรแกรมเรียบร้อย");
        await fetchInitialData();
        setSelectedProgramId(res.data.id);
        setView("detail");
      }
      setShowCreateModal(false);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error(isEditing ? "แก้ไขโปรแกรมล้มเหลว" : "สร้างโปรแกรมล้มเหลว");
    }
  };

  const handleEditProgram = (program: Program) => {
    setCreateFormData({
      name: program.name,
      description: program.description || "",
      isTemplate: program.isTemplate,
    });
    setSelectedProgramId(program.id);
    setIsEditing(true);
    setShowCreateModal(true);
    setView("detail");
  };

  // ✅ FIX Bug #6: Clone คัดลอก Advanced Fields ครบ
  const handleCloneProgram = async (programId: string) => {
    const originalProgram = programs.find((p) => p.id === programId);
    if (!originalProgram) return;
    setIsLoading(true);
    toast.info("กำลังคัดลอกโปรแกรม...");
    try {
      const progRes = await api.post("/programs", {
        name: `${originalProgram.name} (Copy)`,
        description: originalProgram.description,
        is_template: originalProgram.isTemplate,
        duration_weeks: originalProgram.duration,
        days_per_week: originalProgram.daysPerWeek,
      });
      const newProgramId = progRes.data.id;
      const sourceRes = await api.get(`/programs/${programId}`);
      const sourceDays = sourceRes.data?.schedule || sourceRes.data?.days || [];
      const weeksData = new Map<number, any[]>();
      sourceDays.forEach((d: any) => {
        const w = d.week_number || 1;
        if (!weeksData.has(w)) weeksData.set(w, []);
        weeksData.get(w)?.push(d);
      });

      for (const [, days] of Array.from(weeksData.entries())) {
        for (const day of days) {
          const newDayRes = await api.post("/program-days", {
            program_id: newProgramId,
            week_number: day.week_number,
            day_number: day.day_number,
            name: day.name,
            is_rest_day: day.is_rest_day,
          });
          const newDayId = newDayRes.data.id;
          if (day.sections && day.sections.length > 0) {
            for (const sec of day.sections) {
              const newSecRes = await api.post("/program-sections", {
                program_day_id: newDayId,
                type: sec.type,
                format: sec.format,
                name: sec.name,
                duration_seconds: sec.duration_seconds,
                work_seconds: sec.work_seconds,
                rest_seconds_section: sec.rest_seconds_section,
                rounds: sec.rounds,
                order: sec.order,
                notes: sec.notes,
              });
              const newSecId = newSecRes.data.id;
              if (sec.exercises && sec.exercises.length > 0) {
                await Promise.all(
                  sec.exercises.map((ex: any) =>
                    api.post("/program-exercises", {
                      program_section_id: newSecId,
                      exercise_id: ex.exercise_id,
                      sets: ex.sets,
                      reps: ex.reps,
                      weight: ex.weight,
                      distance: ex.distance,
                      pace: ex.pace,
                      duration_seconds: ex.duration_seconds,
                      rest_seconds: ex.rest_seconds,
                      rpe: ex.rpe,
                      rpe_target: ex.rpe_target,
                      side: ex.side,
                      notes: ex.notes,
                      order: ex.order,
                      // ✅ FIX #6: ฟิลด์ที่เคยหายไป
                      tempo: ex.tempo,
                      hold_time: ex.hold_time,
                      duration: ex.duration,
                      rest: ex.rest,
                      time: ex.time,
                      speed: ex.speed,
                      cadence: ex.cadence,
                      distance_long: ex.distance_long,
                      distance_short: ex.distance_short,
                      one_rm: ex.one_rm,
                      rir: ex.rir,
                      heart_rate: ex.heart_rate,
                      hr_zone: ex.hr_zone,
                      watts: ex.watts,
                      rpm: ex.rpm,
                      rounds: ex.rounds,
                      video_link: ex.video_link || "",
                      tracking_fields: ex.tracking_fields || [],
                    }),
                  ),
                );
              }
            }
          }
        }
      }
      toast.success("คัดลอกโปรแกรมเรียบร้อย");
      fetchInitialData();
    } catch (err) {
      console.error("Clone Error:", err);
      toast.error("คัดลอกไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExerciseFromSection = async (
    sectionId: string,
    exerciseId: string | undefined,
  ) => {
    if (!selectedProgramDetail) return;
    if (exerciseId) {
      try {
        await api.delete(`/program-exercises/${exerciseId}`);
        if (selectedProgramId) await fetchProgramDetail(selectedProgramId);
        toast.success("ลบท่าออกกำลังกายเรียบร้อย");
      } catch (err) {
        console.error(err);
        toast.error("ลบไม่สำเร็จ");
      }
      return;
    }
    const updatedWeeks = selectedProgramDetail.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        sections: day.sections
          ? day.sections.map((sec) => {
              if (String(sec.id) !== String(sectionId)) return sec;
              return {
                ...sec,
                exercises: sec.exercises.filter(
                  (ex) => String(ex.id) !== String(exerciseId),
                ),
              };
            })
          : [],
      })),
    }));
    setSelectedProgramDetail({ ...selectedProgramDetail, weeks: updatedWeeks });
    toast.success("ลบรายการแล้ว");
  };

  const handleDeleteProgram = (id: string) => {
    setProgramToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteProgram = async () => {
    if (!programToDelete) return;
    try {
      await api.delete(`/programs/${programToDelete}`);
      toast.success("ลบโปรแกรมเรียบร้อย");
      setShowDeleteModal(false);
      if (selectedProgramId === programToDelete) {
        setSelectedProgramId(null);
        setView("list");
      }
      fetchInitialData();
    } catch (err) {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleAddWeek = async () => {
    const currentProgramId = selectedProgramDetail?.id || selectedProgramId;
    if (!currentProgramId) {
      toast.error("ไม่พบข้อมูลโปรแกรม");
      return;
    }
    const programIdInt = parseInt(currentProgramId.toString());
    const currentWeeks = selectedProgramDetail?.weeks || [];
    const nextWeekNum =
      currentWeeks.length > 0
        ? currentWeeks[currentWeeks.length - 1].weekNumber + 1
        : 1;
    setIsLoading(true);
    try {
      const promises = [];
      for (let i = 1; i <= 7; i++) {
        promises.push(
          api.post("/program-days", {
            program_id: programIdInt,
            week_number: nextWeekNum,
            day_number: i,
            name: `Day ${i}`,
            is_rest_day: false,
          }),
        );
      }
      await Promise.all(promises);
      if (selectedProgramDetail) {
        try {
          await api.put(`/programs/${currentProgramId}`, {
            name: selectedProgramDetail.name,
            description: selectedProgramDetail.description,
            duration_weeks: nextWeekNum,
            days_per_week: selectedProgramDetail.daysPerWeek,
            is_template: selectedProgramDetail.isTemplate,
          });
        } catch (e) {
          console.warn("Auto-update duration failed:", e);
        }
      }
      const updated = await fetchProgramDetail(currentProgramId.toString());
      if (updated) await updateProgramFrequency(updated);
      toast.success(`เพิ่มสัปดาห์ที่ ${nextWeekNum} เรียบร้อย`);
    } catch (err: any) {
      console.error(err);
      toast.error(
        "เพิ่มสัปดาห์ไม่สำเร็จ: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIX Bug #9: จัดเรียง day_number ใหม่เมื่อลบวัน
  const handleSetWeekFrequency = async (week: ProgramWeek, days: number) => {
    if (!selectedProgramDetail) return;
    const currentCount = week.days.length;
    if (days === currentCount) return;
    try {
      if (days > currentCount) {
        const promises = [];
        for (let i = currentCount + 1; i <= days; i++) {
          promises.push(
            api.post("/program-days", {
              program_id: parseInt(selectedProgramDetail.id),
              week_number: week.weekNumber,
              day_number: i,
              name: `Day ${i}`,
              is_rest_day: false,
            }),
          );
        }
        await Promise.all(promises);
      } else {
        const sortedDays = [...week.days].sort(
          (a, b) => a.dayNumber - b.dayNumber,
        );
        const daysToRemove = sortedDays.slice(days);
        await Promise.all(
          daysToRemove.flatMap((day) =>
            (day.sections || []).map((sec) =>
              api.delete(`/program-sections/${sec.id}`),
            ),
          ),
        );
        await Promise.all(
          daysToRemove.map((day) => api.delete(`/program-days/${day.id}`)),
        );
        // ✅ FIX: Reorder remaining days
        const remainingDays = sortedDays.slice(0, days);
        await Promise.all(
          remainingDays.map((day, i) =>
            api.patch(`/program-days/${day.id}`, {
              program_id: parseInt(selectedProgramDetail.id),
              week_number: week.weekNumber,
              day_number: i + 1,
              name: day.name,
              is_rest_day: day.isRestDay,
            }),
          ),
        );
      }
      const updated = await fetchProgramDetail(selectedProgramDetail.id);
      if (updated) await updateProgramFrequency(updated);
      toast.success(`ปรับความถี่เป็น ${days} วัน/สัปดาห์`);
    } catch (err) {
      console.error(err);
      toast.error("ปรับความถี่ไม่สำเร็จ");
    }
  };

  const handleDeleteWeek = (week: ProgramWeek) => {
    if (selectedProgramDetail) setWeekToDelete(week);
  };

  const confirmDeleteWeek = async () => {
    if (!selectedProgramDetail || !weekToDelete) return;
    try {
      const currentWeekData = selectedProgramDetail.weeks.find(
        (w) => w.weekNumber === weekToDelete.weekNumber,
      );
      const daysToDelete = currentWeekData?.days || weekToDelete.days || [];
      if (daysToDelete.length === 0) {
        toast.info("ไม่พบข้อมูลวัน");
        setWeekToDelete(null);
        return;
      }
      const results = await Promise.allSettled(
        daysToDelete.map(async (day) => {
          if (day.sections && day.sections.length > 0)
            await Promise.all(
              day.sections.map((sec) =>
                api.delete(`/program-sections/${sec.id}`),
              ),
            );
          await api.delete(`/program-days/${day.id}`);
        }),
      );
      const failCount = results.filter((r) => r.status === "rejected").length;
      if (failCount > 0)
        toast.warning(`ลบได้บางส่วน (ล้มเหลว ${failCount} วัน)`);
      else {
        toast.success("ลบสัปดาห์เรียบร้อย");
        try {
          await api.put(`/programs/${selectedProgramDetail.id}`, {
            name: selectedProgramDetail.name,
            description: selectedProgramDetail.description,
            is_template: selectedProgramDetail.isTemplate,
            duration_weeks: Math.max(1, selectedProgramDetail.weeks.length - 1),
            days_per_week: selectedProgramDetail.daysPerWeek,
          });
        } catch (e) {
          console.warn(e);
        }
      }
      setWeekToDelete(null);
      const updated = await fetchProgramDetail(selectedProgramDetail.id);
      if (updated) await updateProgramFrequency(updated);
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการลบสัปดาห์");
    }
  };

  const handleToggleRestDay = async (day: ProgramDay) => {
    const effectiveProgramId = day.programId || selectedProgramId;
    if (!effectiveProgramId || !day.weekNumber) {
      toast.error("ข้อมูลไม่ครบ");
      return;
    }
    try {
      await api.patch(`/program-days/${day.id}`, {
        program_id: parseInt(effectiveProgramId.toString()),
        week_number: day.weekNumber,
        day_number: day.dayNumber,
        name: day.name,
        is_rest_day: !day.isRestDay,
      });
      if (selectedProgramId) await fetchProgramDetail(selectedProgramId);
      toast.success(day.isRestDay ? "เปลี่ยนเป็นวันฝึก" : "เปลี่ยนเป็นวันพัก");
    } catch (err) {
      console.error(err);
      toast.error("แก้ไขไม่สำเร็จ");
    }
  };

  const handleRemoveDay = async (dayId: string) => {
    if (!selectedProgramDetail) return;
    let dayToDelete: ProgramDay | undefined;
    for (const week of selectedProgramDetail.weeks) {
      dayToDelete = week.days.find((d) => d.id === dayId);
      if (dayToDelete) break;
    }
    try {
      if (dayToDelete?.sections && dayToDelete.sections.length > 0)
        await Promise.all(
          dayToDelete.sections.map((sec) =>
            api.delete(`/program-sections/${sec.id}`),
          ),
        );
      await api.delete(`/program-days/${dayId}`);
      if (selectedProgramId) fetchProgramDetail(selectedProgramId);
      toast.success("ลบวันเรียบร้อย");
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    }
  };

  // ✅ FIX Duration Bug: handleAddSection ใช้ parseTimeToSeconds กลาง
  const handleAddSection = async () => {
    if (!selectedDayId || !newSection.name) return;
    try {
      const res = await api.post("/program-sections", {
        program_day_id: parseInt(selectedDayId),
        type: newSection.sectionType,
        format: newSection.sectionFormat,
        name: newSection.name,
        duration_seconds: (newSection.duration || 10) * 60,
        work_seconds: newSection.workTime,
        rest_seconds_section: newSection.restTime,
        rounds: newSection.rounds,
        notes: newSection.notes,
        order: 99,
      });
      const sectionId = res.data.id;

      if (newSectionExercises.length > 0) {
        const exPromises = newSectionExercises.map((ex, idx) => {
          const durationArr = setsToSecondsArray(ex.sets, "duration");
          const timeArr = setsToSecondsArray(ex.sets, "time");
          const restArr = setsToSecondsArray(ex.sets, "rest");
          const aggDuration =
            durationArr.find((v) => v > 0) || timeArr.find((v) => v > 0) || 0;
          const aggRest = restArr.find((v) => v > 0) || 0;
          const firstSet = ex.sets[0];
          const getSetValues = (
            sets: ExerciseSet[],
            field: string,
            fallback: any = null,
          ): any[] =>
            sets.map((s) => {
              const val = (s as any)[field];
              return val === undefined || val === null || val === ""
                ? fallback
                : val;
            });

          return api.post("/program-exercises", {
            program_section_id: parseInt(sectionId),
            exercise_id: parseInt(ex.exerciseId),
            sets: ex.sets.length,
            reps: getSetValues(ex.sets, "reps", 0),
            weight: getSetValues(ex.sets, "weight", 0),
            distance: getSetValues(ex.sets, "distance", 0),
            pace: getSetValues(ex.sets, "pace", ""),
            side: getSetValues(ex.sets, "side", ""),
            tempo: getSetValues(ex.sets, "tempo", ""),
            speed: getSetValues(ex.sets, "speed", 0),
            cadence: getSetValues(ex.sets, "cadence", 0),
            distance_long: getSetValues(ex.sets, "distance_long", 0),
            distance_short: getSetValues(ex.sets, "distance_short", 0),
            one_rm: getSetValues(ex.sets, "one_rm", 0),
            rir: getSetValues(ex.sets, "rir", 0),
            heart_rate: getSetValues(ex.sets, "heart_rate", 0),
            hr_zone: getSetValues(ex.sets, "hr_zone", 0),
            watts: getSetValues(ex.sets, "watts", 0),
            rpm: getSetValues(ex.sets, "rpm", 0),
            rounds: getSetValues(ex.sets, "rounds", 0),
            rpe: getSetValues(ex.sets, "rpe", 0),
            notes: getSetValues(ex.sets, "notes", ""),
            duration: durationArr,
            rest: restArr,
            time: timeArr,
            hold_time: setsToSecondsArray(ex.sets, "hold_time"),
            duration_seconds: aggDuration,
            rest_seconds: aggRest,
            rpe_target: firstSet?.rpe || undefined,
            order: idx + 1,
            video_link: getSetValues(ex.sets, "video_link", "")[0] || "", // ✅ FIX #10
            tracking_fields: ex.trackingFields || [],
          });
        });
        await Promise.all(exPromises);
      }
      toast.success("สร้าง Section เรียบร้อย");
      setShowAddSectionModal(false);
      resetSectionForm();
      if (selectedDayId)
        setExpandedDays((prev) => new Set([...prev, selectedDayId]));
      if (selectedProgramId) fetchProgramDetail(selectedProgramId);
    } catch (err) {
      toast.error("สร้าง Section ไม่สำเร็จ");
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    setSectionToDelete(sectionId);
  };
  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      await api.delete(`/program-sections/${sectionToDelete}`);
      if (selectedProgramId) fetchProgramDetail(selectedProgramId);
      toast.success("ลบ Section เรียบร้อย");
      setSectionToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleCreateExample = async () => {
    if (exercisesList.length < 1) {
      toast.error("ไม่พบท่าออกกำลังกายในระบบ");
      return;
    }
    setIsLoading(true);
    setShowTutorialModal(false);
    try {
      const progRes = await api.post("/programs", {
        name: "Example: Weight Loss Program",
        description: "โปรแกรมตัวอย่าง 4 สัปดาห์",
        is_template: true,
        duration_weeks: 4,
        days_per_week: 3,
      });
      const programId = progRes.data.id;
      const day1Res = await api.post("/program-days", {
        program_id: programId,
        week_number: 1,
        day_number: 1,
        name: "Full Body A",
        is_rest_day: false,
      });
      const sec1Res = await api.post("/program-sections", {
        program_day_id: day1Res.data.id,
        type: "warmup",
        format: "straight-sets",
        name: "Warm Up",
        duration_seconds: 300,
        notes: "ยืดเหยียดกล้ามเนื้อ",
        order: 1,
      });
      if (exercisesList.length > 0)
        await api.post("/program-exercises", {
          program_section_id: sec1Res.data.id,
          exercise_id: parseInt(exercisesList[0].id),
          sets: 2,
          reps: [15, 15],
          rest_seconds: 30,
          order: 1,
        });
      const sec2Res = await api.post("/program-sections", {
        program_day_id: day1Res.data.id,
        type: "main",
        format: "circuit",
        name: "Circuit Training",
        duration_seconds: 1800,
        notes: "ทำต่อเนื่อง",
        order: 2,
      });
      for (let i = 0; i < Math.min(3, exercisesList.length); i++)
        await api.post("/program-exercises", {
          program_section_id: sec2Res.data.id,
          exercise_id: parseInt(exercisesList[i].id),
          sets: 3,
          reps: [12, 12, 12],
          rest_seconds: 0,
          order: i + 1,
        });
      await api.post("/program-days", {
        program_id: programId,
        week_number: 1,
        day_number: 2,
        name: "Rest Day",
        is_rest_day: true,
      });
      toast.success("สร้างโปรแกรมตัวอย่างเรียบร้อย");
      fetchInitialData();
      setSelectedProgramId(programId);
      setView("detail");
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Section Builder Helpers ---
  const handleRemoveExerciseFromNewSection = (index: number) => {
    const u = [...newSectionExercises];
    u.splice(index, 1);
    setNewSectionExercises(u);
  };

  const handleUpdateTrackingFields = (
    exerciseIndex: number,
    field: string,
    isChecked: boolean,
  ) => {
    const updated = [...newSectionExercises];
    let currentFields = updated[exerciseIndex].trackingFields;
    if (!currentFields) {
      const exData = exercisesList.find(
        (e) => e.id === updated[exerciseIndex].exerciseId,
      );
      currentFields = getFields(exData);
    }
    if (isChecked) {
      if (!currentFields.includes(field))
        currentFields = [...currentFields, field];
    } else {
      currentFields = currentFields.filter((f) => f !== field);
    }
    updated[exerciseIndex].trackingFields = currentFields;
    setNewSectionExercises(updated);
  };

  const handleAddExerciseToNewSection = (exId: string) => {
    const ex = exercisesList.find((e) => e.id === exId);
    if (!ex) return;
    if (swapExerciseIndex !== null) {
      const updated = [...newSectionExercises];
      updated[swapExerciseIndex] = {
        ...updated[swapExerciseIndex],
        exerciseId: ex.id,
        trackingFields: ex.trackingFields,
      };
      setNewSectionExercises(updated);
      setSwapExerciseIndex(null);
    } else {
      setNewSectionExercises([
        ...newSectionExercises,
        {
          exerciseId: ex.id,
          trackingFields: ex.trackingFields,
          sets: Array(newSection.rounds || 3)
            .fill(0)
            .map((_, i) => ({ setNumber: i + 1 })),
        },
      ]);
    }
    setShowExercisePicker(false);
    setExerciseSearchTerm("");
  };

  const handleAddSetToNewSectionExercise = (exIdx: number) => {
    const updated = [...newSectionExercises];
    const currentSets = updated[exIdx].sets;
    const lastSet =
      currentSets.length > 0 ? currentSets[currentSets.length - 1] : null;
    updated[exIdx].sets.push({
      setNumber: currentSets.length + 1,
      reps: Number(lastSet?.reps) || 10,
      weight: Number(lastSet?.weight) || 0,
      rest: Number(lastSet?.rest) || 60,
      rpe: lastSet?.rpe,
      duration: lastSet?.duration || 0,
      distance: Number(lastSet?.distance) || 0,
      pace: lastSet?.pace,
      side: lastSet?.side,
      notes: lastSet?.notes,
      hold_time: Number(lastSet?.hold_time) || 0,
      time: Number(lastSet?.time) || 0,
      speed: Number(lastSet?.speed) || 0,
      cadence: Number(lastSet?.cadence) || 0,
      distance_long: Number(lastSet?.distance_long) || 0,
      distance_short: Number(lastSet?.distance_short) || 0,
      one_rm: Number(lastSet?.one_rm) || 0,
      rir: Number(lastSet?.rir) || 0,
      heart_rate: Number(lastSet?.heart_rate) || 0,
      hr_zone: Number(lastSet?.hr_zone) || 0,
      watts: Number(lastSet?.watts) || 0,
      rpm: Number(lastSet?.rpm) || 0,
      rounds: Number(lastSet?.rounds) || 0,
    });
    setNewSectionExercises(updated);
  };

  // --- Edit Exercise ---
  const handleEditExercise = (exercise: ProgramExercise) => {
    setEditingExercise(exercise);
    const numSets = exercise.sets;
    const initialSets: ExerciseSet[] = [];
    const getVal = (source: any, index: number, fallback: any = null) => {
      if (!Array.isArray(source)) return fallback;
      return source[index] !== undefined
        ? source[index]
        : source[source.length - 1] || fallback;
    };
    for (let i = 0; i < numSets; i++) {
      initialSets.push({
        setNumber: i + 1,
        reps: parseFloat(getVal(exercise.reps, i)) || 10,
        weight: parseFloat(getVal(exercise.weight, i)) || 0,
        distance: parseFloat(getVal(exercise.distance, i)) || 0,
        pace: String(getVal(exercise.pace, i, "")),
        duration: getVal(exercise.duration, i, 0),
        rest:
          getVal(exercise.rest, i) != null && getVal(exercise.rest, i) !== ""
            ? getVal(exercise.rest, i)
            : 60,
        rpe: parseFloat(getVal(exercise.rpe, i)) || 8,
        notes: String(getVal(exercise.notes, i, "")),
        side: String(getVal(exercise.side, i, "")),
        hold_time: String(getVal(exercise.hold_time, i, "")),
        tempo: String(getVal(exercise.tempo, i, "")),
        time: String(getVal(exercise.time, i, "")),
        speed: parseFloat(getVal(exercise.speed, i)) || 0,
        cadence: parseFloat(getVal(exercise.cadence, i)) || 0,
        distance_long: parseFloat(getVal(exercise.distance_long, i)) || 0,
        distance_short: parseFloat(getVal(exercise.distance_short, i)) || 0,
        one_rm: parseFloat(getVal(exercise.one_rm, i)) || 0,
        rir: parseFloat(getVal(exercise.rir, i)) || 0,
        heart_rate: parseFloat(getVal(exercise.heart_rate, i)) || 0,
        hr_zone: parseFloat(getVal(exercise.hr_zone, i)) || 0,
        watts: parseFloat(getVal(exercise.watts, i)) || 0,
        rpm: parseFloat(getVal(exercise.rpm, i)) || 0,
        rounds: parseFloat(getVal(exercise.rounds, i)) || 0,
      });
    }
    setEditingExerciseSets(initialSets);
    setShowEditExerciseModal(true);
  };

  // ✅ FIX Bug #2, #7, #10, Duration: handleSaveEditedExercise
  const handleSaveEditedExercise = async () => {
    if (!editingExercise || !editingExerciseSets.length) return;
    const getSetsArr = (field: keyof ExerciseSet, fallback: any = null) =>
      editingExerciseSets.map((s) => {
        const v = s[field];
        return v === undefined || v === null || v === "" ? fallback : v;
      });
    const durationArray = setsToSecondsArray(editingExerciseSets, "duration");
    const timeArray = setsToSecondsArray(editingExerciseSets, "time");
    const restArray = setsToSecondsArray(editingExerciseSets, "rest");
    const aggDuration =
      durationArray.find((v) => v > 0) || timeArray.find((v) => v > 0) || 0;
    const aggRest = restArray.find((v) => v > 0) || 0;
    const { sectionId: realSectionId, order: exerciseOrder } =
      findExerciseSectionInfo(editingExercise.id);

    const putPayload = {
      program_section_id: realSectionId, // ✅ FIX #2
      exercise_id: parseInt(editingExercise.exerciseId),
      sets: editingExerciseSets.length,
      reps: getSetsArr("reps", 0),
      weight: getSetsArr("weight", 0),
      distance: getSetsArr("distance", 0),
      pace: getSetsArr("pace", ""),
      side: getSetsArr("side", ""),
      tempo: getSetsArr("tempo", ""),
      notes: getSetsArr("notes", ""),
      speed: getSetsArr("speed", 0),
      cadence: getSetsArr("cadence", 0),
      distance_long: getSetsArr("distance_long", 0),
      distance_short: getSetsArr("distance_short", 0),
      one_rm: getSetsArr("one_rm", 0),
      rpe: getSetsArr("rpe", 0),
      rir: getSetsArr("rir", 0),
      heart_rate: getSetsArr("heart_rate", 0),
      hr_zone: getSetsArr("hr_zone", 0),
      watts: getSetsArr("watts", 0),
      rpm: getSetsArr("rpm", 0),
      rounds: getSetsArr("rounds", 0),
      duration: durationArray,
      rest: restArray,
      time: timeArray,
      hold_time: setsToSecondsArray(editingExerciseSets, "hold_time"),
      duration_seconds: aggDuration,
      rest_seconds: aggRest,
      rpe_target: editingExerciseSets[0]?.rpe || undefined,
      video_link: editingExercise.video_link || "", // ✅ FIX #10
      order: exerciseOrder, // ✅ FIX #7
      tracking_fields: editingExercise.trackingFields || [],
    };
    console.log("[DEBUG] Saving Edited Exercise Payload:", putPayload);

    try {
      await api.put(`/program-exercises/${editingExercise.id}`, putPayload);
      toast.success("บันทึกการแก้ไขเรียบร้อย");
      setShowEditExerciseModal(false);
      if (selectedProgramId) fetchProgramDetail(selectedProgramId);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "Unknown error";
      toast.error(
        `บันทึกไม่สำเร็จ: ${errorMsg} (${err.response?.status || "N/A"})`,
      );
      console.error("[Save Exercise Error]", {
        exerciseId: editingExercise.id,
        error: err,
      });
    }
  };

  // --- Render ---
  const filteredPrograms = programs.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === "all" ||
        (filterType === "template" && p.isTemplate) ||
        (filterType === "custom" && !p.isTemplate)),
  );
  const filteredExercises = exercisesList.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()),
  );

  const sharedModals = (
    <>
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "แก้ไขโปรแกรม" : "สร้างโปรแกรมใหม่"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "แก้ไขข้อมูลพื้นฐาน" : "กรอกข้อมูลเบื้องต้น"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อโปรแกรม</Label>
              <Input
                value={createFormData.name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={createFormData.isTemplate}
                onCheckedChange={(c: boolean) =>
                  setCreateFormData({ ...createFormData, isTemplate: c })
                }
              />
              <Label>ตั้งเป็น Template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateProgram}>
              {isEditing ? "บันทึกการแก้ไข" : "สร้าง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              การลบนี้ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProgram}
              className="bg-destructive text-white"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Section?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบนี้ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSection}
              className="bg-destructive text-white"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  const renderList = () => (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/20 p-3">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">โปรแกรมการออกกำลังกาย</h1>
            <p className="text-sm text-muted-foreground mt-1">
              จัดการ Template และโปรแกรมที่ปรับแต่ง
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setCreateFormData({
                name: "",
                description: "",
                isTemplate: true,
              });
              setIsEditing(false);
              setShowCreateModal(true);
            }}
            size="lg"
            className="shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" /> สร้างโปรแกรม
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="ค้นหาโปรแกรม..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs
          value={filterType}
          onValueChange={(v: any) => setFilterType(v)}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="custom">ปรับแต่ง</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.map((program) => (
          <Card
            key={program.id}
            className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
            onClick={() => {
              setSelectedProgramId(program.id);
              setView("detail");
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {program.isTemplate ? (
                    <Badge
                      variant="secondary"
                      className="mb-2 bg-accent/10 text-accent"
                    >
                      Template
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mb-2">
                      Custom
                    </Badge>
                  )}
                  <CardTitle className="text-base line-clamp-1">
                    {program.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs mt-1">
                    {program.description || "ไม่มีรายละเอียด"}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProgram(program);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneProgram(program.id);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" /> คัดลอก
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProgram(program.id);
                      }}
                    >
                      <Trash className="h-4 w-4 mr-2" /> ลบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted p-2 rounded text-center">
                  <p className="text-muted-foreground">สัปดาห์</p>
                  <p className="font-semibold">{program.duration}</p>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <p className="text-muted-foreground">ความถี่</p>
                  <p className="font-semibold">{program.daysPerWeek} วัน</p>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <p className="text-muted-foreground">ผู้ใช้</p>
                  <p className="font-semibold">
                    {program.assigned_client_count || 0}
                  </p>
                </div>
              </div>
              {program.assignedClients &&
                program.assignedClients.length > 0 && (
                  <div className="mt-4 pt-2 border-t text-xs text-muted-foreground">
                    <span className="font-semibold">Used by:</span>{" "}
                    {program.assignedClients.join(", ")}
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (view === "list")
    return (
      <>
        {renderList()}
        {sharedModals}
      </>
    );

  if (!selectedProgramDetail || isLoading)
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
        <Button variant="ghost" size="icon" onClick={() => setView("list")}>
          <ChevronDown className="h-5 w-5 rotate-90" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">
              {selectedProgramDetail.name}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => handleEditProgram(selectedProgramDetail)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {selectedProgramDetail.isTemplate && (
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                Template
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {selectedProgramDetail.description || "ไม่มีคำอธิบาย"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleCloneProgram(selectedProgramDetail.id)}
          >
            <Copy className="h-4 w-4 mr-2" /> คัดลอก
          </Button>
          <Button onClick={() => setShowAssignModal(true)} variant="outline">
            <Users className="h-4 w-4 mr-2" /> มอบหมาย
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CalendarIcon className="h-5 w-5 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">ระยะเวลา</p>
            <p className="font-bold text-lg">
              {selectedProgramDetail.weeks.length} สัปดาห์
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Dumbbell className="h-5 w-5 text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground">Sections</p>
            <p className="font-bold text-lg">
              {selectedProgramDetail.weeks.reduce(
                (acc, w) =>
                  acc +
                  w.days.reduce(
                    (dAcc, d) => dAcc + (d.sections?.length || 0),
                    0,
                  ),
                0,
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Activity className="h-5 w-5 text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">Exercises</p>
            <p className="font-bold text-lg">
              {selectedProgramDetail.weeks.reduce(
                (acc, w) =>
                  acc +
                  w.days.reduce(
                    (dAcc, d) =>
                      dAcc +
                      d.sections.reduce(
                        (sAcc, s) => sAcc + s.exercises.length,
                        0,
                      ),
                    0,
                  ),
                0,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> ตารางฝึกซ้อม
        </h2>

        {selectedProgramDetail.weeks.map((week) => (
          <Card key={week.weekNumber} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-3 border-b flex flex-row justify-between items-center">
              <CardTitle className="text-base">
                สัปดาห์ที่ {week.weekNumber || 1}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteWeek(week);
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" /> ลบสัปดาห์
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem className="opacity-50 pointer-events-none text-xs font-semibold">
                      ตั้งค่าความถี่ฝึก
                    </DropdownMenuItem>
                    {[3, 4, 5, 6, 7].map((days) => (
                      <DropdownMenuItem
                        key={days}
                        onClick={() => handleSetWeekFrequency(week, days)}
                        className={week.days.length === days ? "bg-accent" : ""}
                      >
                        <Dumbbell className="h-4 w-4 mr-2" /> {days} วัน/สัปดาห์
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {week.days.map((day) => (
                  <div key={day.id} className="flex flex-col">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-sm font-medium">
                        Day {day.dayNumber || 1}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDayForOptions(day);
                              setShowDayOptionsDialog(true);
                            }}
                          >
                            จัดการ
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleRestDay(day)}
                          >
                            {day.isRestDay
                              ? "เปลี่ยนเป็นวันฝึก"
                              : "ตั้งเป็นวันพัก"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveDay(day.id)}
                          >
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDayForOptions(day);
                        setShowDayOptionsDialog(true);
                      }}
                      className={`group relative border rounded-lg p-4 transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[120px] text-center ${day.isRestDay ? "bg-muted/20 border-dashed" : "bg-card hover:border-primary/50"}`}
                    >
                      {day.isRestDay ? (
                        <>
                          <Moon className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">
                            Rest Day
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Dumbbell className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-primary">
                              {day.sections.length} Sections
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                            คลิกเพื่อจัดการ
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Expanded Days */}
              {week.days
                .filter((d) => expandedDays.has(d.id) && !d.isRestDay)
                .map((day) => (
                  <Card
                    key={`expanded-${day.id}`}
                    className="mt-6 border-2 border-primary/20 shadow-sm animate-in fade-in zoom-in-95 duration-200"
                  >
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          รายละเอียด Day {day.dayNumber || 1}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDayId(day.id);
                            setSelectedDayNumber(day.dayNumber);
                            setShowAddSectionModal(true);
                            setIsQuickAddMode(false);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" /> เพิ่ม Section
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleDay(day.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {day.sections.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed flex flex-col items-center justify-center">
                          <p>ยังไม่มี Section</p>
                          <p className="text-xs mt-1 mb-4">
                            กดปุ่มด้านล่างเพื่อเริ่มสร้าง
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedDayId(day.id);
                              setSelectedDayNumber(day.dayNumber);
                              setShowAddSectionModal(true);
                              setIsQuickAddMode(false);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" /> เพิ่ม Section
                          </Button>
                        </div>
                      ) : (
                        day.sections.map((section) => {
                          const isSecExpanded = expandedSections.has(
                            section.id,
                          );
                          const Icon = getSectionTypeIcon(section.sectionType);
                          const color = getSectionTypeColor(
                            section.sectionType,
                          );
                          return (
                            <div
                              key={section.id}
                              className="border rounded-xl overflow-hidden bg-white"
                            >
                              <div
                                className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleSection(section.id)}
                              >
                                <div className="flex items-center gap-3">
                                  {isSecExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  {/* ✅ FIX Bug #8: Static BG Map */}
                                  <div
                                    className={`p-1.5 rounded ${SECTION_BG_MAP[section.sectionType] || "bg-gray-100"}`}
                                  >
                                    <Icon className={`h-4 w-4 ${color}`} />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {section.name}
                                    </p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5"
                                      >
                                        {section.sectionFormat}
                                      </Badge>
                                      <span>
                                        {section.exercises.length} ท่า
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSection(section.id);
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>

                              {isSecExpanded && (
                                <div className="p-4 bg-background space-y-4 border-t">
                                  {section.exercises.map((ex, idx) => {
                                    const exData = exercisesList.find(
                                      (e) => e.id.toString() === ex.exerciseId,
                                    );
                                    const getDisplayFields = () => {
                                      if (ex.trackingFields?.length)
                                        return ex.trackingFields
                                          .map((f: string) => f.toLowerCase())
                                          .filter((f: string) => f !== "sets");
                                      if (exData?.trackingFields?.length)
                                        return exData.trackingFields
                                          .map((f: string) => f.toLowerCase())
                                          .filter((f: string) => f !== "sets");
                                      return getFields(exData).filter(
                                        (f) => f !== "sets",
                                      );
                                    };
                                    const fields = getDisplayFields();
                                    const getSetValue = (
                                      fieldName: string,
                                      setIndex: number,
                                    ) => {
                                      let valStr = (ex as any)[fieldName];
                                      if (
                                        valStr === undefined ||
                                        valStr === null
                                      )
                                        return "-";
                                      let finalVal: any = valStr;
                                      if (Array.isArray(valStr))
                                        finalVal =
                                          valStr[setIndex] ??
                                          valStr[valStr.length - 1];
                                      else {
                                        const str = String(valStr);
                                        if (str.includes(",")) {
                                          const parts = str.split(",");
                                          finalVal =
                                            parts[setIndex]?.trim() ||
                                            parts[parts.length - 1]?.trim() ||
                                            "-";
                                        }
                                      }
                                      if (
                                        [
                                          "time",
                                          "duration",
                                          "rest",
                                          "rest_time",
                                          "hold_time",
                                          "work_time",
                                        ].includes(fieldName) &&
                                        finalVal &&
                                        !String(finalVal).includes(":")
                                      ) {
                                        const s = Number(finalVal);
                                        if (!isNaN(s) && s > 0) {
                                          const m = Math.floor(s / 60);
                                          const rem = s % 60;
                                          return `${m}:${rem.toString().padStart(2, "0")}`;
                                        }
                                        if (s === 0) return "0:00";
                                      }
                                      return finalVal;
                                    };
                                    return (
                                      <div
                                        key={idx}
                                        className="border rounded-xl bg-white shadow-sm overflow-hidden"
                                      >
                                        <div className="bg-slate-50 p-3 flex justify-between items-center border-b">
                                          <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                              <Dumbbell className="h-4 w-4" />
                                            </div>
                                            <div>
                                              <span className="font-bold text-sm text-slate-700 block">
                                                {exData?.name ||
                                                  `Exercise ${idx + 1}`}
                                              </span>
                                              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                                                {exData?.category || "Exercise"}
                                              </span>
                                            </div>
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                              >
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleEditExercise(ex)
                                                }
                                              >
                                                <Edit className="h-4 w-4 mr-2" />{" "}
                                                แก้ไข
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() =>
                                                  handleDeleteExerciseFromSection(
                                                    section.id,
                                                    ex.id,
                                                  )
                                                }
                                              >
                                                <Trash className="h-4 w-4 mr-2" />{" "}
                                                ลบ
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                        <div className="p-3 space-y-2">
                                          {Array.from({ length: ex.sets }).map(
                                            (_, setIndex) => (
                                              <div
                                                key={setIndex}
                                                className="border rounded-lg p-2 flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50/50 hover:bg-slate-100 transition-colors"
                                              >
                                                <div className="w-12 h-8 flex items-center justify-center bg-white border rounded text-xs font-semibold text-slate-600 shadow-sm shrink-0">
                                                  Set {setIndex + 1}
                                                </div>
                                                <div className="flex-1 grid grid-flow-col auto-cols-max gap-4 sm:gap-8 items-center overflow-x-auto">
                                                  {/* ✅ FIX Bug #4: ข้าม notes ในตาราง per-set */}
                                                  {fields.map((field) => {
                                                    if (field === "notes")
                                                      return null;
                                                    const config =
                                                      FIELD_CONFIG[field];
                                                    return (
                                                      <div
                                                        key={field}
                                                        className="flex flex-col min-w-[60px]"
                                                      >
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                                                          {config?.label ||
                                                            field}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-700">
                                                          {getSetValue(
                                                            field,
                                                            setIndex,
                                                          )}
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                          {/* ✅ FIX Bug #1: Notes แสดงเป็น Array → join */}
                                          {ex.notes && (
                                            <div className="text-xs text-muted-foreground mt-2 bg-yellow-50/80 p-2 rounded border border-yellow-100 flex gap-2">
                                              <span className="font-semibold text-yellow-700 shrink-0">
                                                Note:
                                              </span>
                                              <span>
                                                {Array.isArray(ex.notes)
                                                  ? ex.notes
                                                      .filter(Boolean)
                                                      .join(" | ")
                                                  : ex.notes}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleAddWeek}
            disabled={isLoading}
            className="border-dashed border-2"
          >
            {isLoading ? (
              <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Plus className="h-5 w-5 mr-2" />
            )}
            เพิ่มสัปดาห์ใหม่
          </Button>
        </div>
      </div>

      {/* Modals */}
      <AlertDialog
        open={!!weekToDelete}
        onOpenChange={(open) => !open && setWeekToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสัปดาห์?</AlertDialogTitle>
            <AlertDialogDescription>
              จะลบ Days และ Sections ทั้งหมด
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmDeleteWeek();
              }}
              className="bg-destructive text-white"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Section Modal */}
      <Dialog open={showAddSectionModal} onOpenChange={setShowAddSectionModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isQuickAddMode
                ? "เพิ่มท่าออกกำลังกาย"
                : "เพิ่มช่วงการฝึก (Section)"}
            </DialogTitle>
            <DialogDescription>
              {isQuickAddMode
                ? "ตั้งค่าจำนวน Set และรายละเอียดท่าฝึก"
                : "กำหนดประเภทและเลือกท่าออกกำลังกาย"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isQuickAddMode && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ประเภทช่วงฝึก</Label>
                  <Select
                    value={newSection.sectionType}
                    onValueChange={(val) =>
                      setNewSection({ ...newSection, sectionType: val })
                    }
                  >
                    <SelectTrigger className="border-slate-300 shadow-sm focus:ring-[#002140]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className={`w-4 h-4 ${t.color}`} />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>รูปแบบ (Format)</Label>
                  <Select
                    value={newSection.sectionFormat}
                    onValueChange={(val) =>
                      setNewSection({ ...newSection, sectionFormat: val })
                    }
                  >
                    <SelectTrigger className="border-slate-300 shadow-sm focus:ring-[#002140]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="amrap">AMRAP</SelectItem>
                      <SelectItem value="timed">Timed</SelectItem>
                      <SelectItem value="interval">Interval</SelectItem>
                      <SelectItem value="freestyle">Freestyle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {!isQuickAddMode && (
              <div className="grid grid-cols-2 gap-4">
                {newSection.sectionFormat === "amrap" && (
                  <div className="space-y-2">
                    <Label>ระยะเวลา (นาที)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newSection.duration}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          duration: parseInt(e.target.value) || 0,
                        })
                      }
                      className="border-slate-300 shadow-sm focus-visible:ring-[#002140]"
                    />
                  </div>
                )}
                {newSection.sectionFormat === "timed" && (
                  <div className="space-y-2">
                    <Label>จำนวนรอบ</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newSection.rounds}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          rounds: parseInt(e.target.value) || 1,
                        })
                      }
                      className="border-slate-300 shadow-sm focus-visible:ring-[#002140]"
                    />
                  </div>
                )}
              </div>
            )}
            {!isQuickAddMode && (
              <div className="space-y-2">
                <Label>ชื่อช่วงฝึก</Label>
                <Input
                  value={newSection.name}
                  onChange={(e) =>
                    setNewSection({ ...newSection, name: e.target.value })
                  }
                  placeholder="เช่น Chest & Triceps"
                  className="border-slate-300 shadow-sm focus-visible:ring-[#002140]"
                />
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex justify-between items-center">
                <Label>ท่าฝึก ({newSectionExercises.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExercisePicker(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> เพิ่มท่า
                </Button>
              </div>
              <div className="space-y-3">
                {newSectionExercises.map((ex, idx) => {
                  const exData = exercisesList.find(
                    (e) => String(e.id) === String(ex.exerciseId),
                  );
                  const fields = ex.trackingFields || getFields(exData);
                  return (
                    <Card key={idx} className="p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-sm">
                          {exData?.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-56 p-3">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-2">
                                  ตัวชี้วัด
                                </h4>
                                {[
                                  "time",
                                  "rest",
                                  "speed",
                                  "cadence",
                                  "distance_long",
                                  "distance_short",
                                  "reps",
                                  "one_rm",
                                  "weight",
                                  "rpe",
                                  "rir",
                                  "heart_rate",
                                  "hr_zone",
                                  "watts",
                                  "rpm",
                                  "rounds",
                                ].map((f) => (
                                  <div
                                    key={f}
                                    className="flex items-center space-x-2"
                                  >
                                    <Switch
                                      id={`field-${idx}-${f}`}
                                      checked={fields.includes(f)}
                                      onCheckedChange={(c) =>
                                        handleUpdateTrackingFields(idx, f, c)
                                      }
                                    />
                                    <Label
                                      htmlFor={`field-${idx}-${f}`}
                                      className="text-xs cursor-pointer flex-1"
                                    >
                                      {FIELD_CONFIG[f]?.label || f}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSwapExerciseIndex(idx);
                                  setShowExercisePicker(true);
                                }}
                              >
                                <Repeat className="h-4 w-4 mr-2" /> เปลี่ยนท่า
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  handleRemoveExerciseFromNewSection(idx)
                                }
                              >
                                <Trash className="h-4 w-4 mr-2" /> ลบท่า
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {ex.sets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className="border rounded-lg p-3 space-y-3 bg-white relative group"
                          >
                            <div className="flex justify-between items-center">
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground"
                              >
                                Set {set.setNumber}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const u = [...newSectionExercises];
                                  u[idx].sets.splice(setIdx, 1);
                                  u[idx].sets.forEach(
                                    (s, i) => (s.setNumber = i + 1),
                                  );
                                  setNewSectionExercises(u);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {fields.map((fieldName) => {
                                let config = FIELD_CONFIG[fieldName];
                                if (!config)
                                  config = {
                                    label: fieldName,
                                    placeholder: "-",
                                    type: "text",
                                  };
                                if (fieldName === "notes")
                                  return (
                                    <div
                                      key={fieldName}
                                      className="col-span-2 sm:col-span-4"
                                    >
                                      <Input
                                        placeholder={config.placeholder}
                                        className="h-8 text-xs border-dashed"
                                        value={(set as any)[fieldName] || ""}
                                        onChange={(e) => {
                                          const u = [...newSectionExercises];
                                          (u[idx].sets[setIdx] as any)[
                                            fieldName
                                          ] = e.target.value;
                                          setNewSectionExercises(u);
                                        }}
                                      />
                                    </div>
                                  );
                                return (
                                  <div key={fieldName} className="space-y-1">
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                      {config.label}
                                    </span>
                                    <Input
                                      type={config.type}
                                      min={
                                        config.type === "number" ? 0 : undefined
                                      }
                                      className="h-8 text-center border-2 border-gray-300"
                                      placeholder={config.placeholder}
                                      value={(set as any)[fieldName] || ""}
                                      onChange={(e) => {
                                        let val: any = e.target.value;
                                        if (
                                          [
                                            "rest",
                                            "time",
                                            "duration",
                                            "work_time",
                                            "rest_time",
                                            "hold_time",
                                          ].includes(fieldName)
                                        )
                                          val = formatTimeInput(val);
                                        if (
                                          config.type === "number" &&
                                          val !== "" &&
                                          ![
                                            "rest",
                                            "time",
                                            "duration",
                                            "hold_time",
                                          ].includes(fieldName)
                                        ) {
                                          const p = parseFloat(val);
                                          val = isNaN(p) ? 0 : p;
                                        }
                                        const u = [...newSectionExercises];
                                        (u[idx].sets[setIdx] as any)[
                                          fieldName
                                        ] = val;
                                        setNewSectionExercises(u);
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-xs"
                          onClick={() => handleAddSetToNewSectionExercise(idx)}
                        >
                          + เพิ่ม Set
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddSectionModal(false);
                resetSectionForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleAddSection}>บันทึกช่วงฝึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Picker */}
      <Dialog
        open={showExercisePicker}
        onOpenChange={(open) => {
          setShowExercisePicker(open);
          if (!open) setSwapExerciseIndex(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {swapExerciseIndex !== null ? "เปลี่ยนท่า" : "เลือกท่าฝึก"}
            </DialogTitle>
            <DialogDescription>
              {swapExerciseIndex !== null ? "เลือกท่าใหม่" : "ค้นหาและเลือกท่า"}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="ค้นหา..."
            value={exerciseSearchTerm}
            onChange={(e) => setExerciseSearchTerm(e.target.value)}
          />
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-2 hover:bg-accent cursor-pointer rounded flex justify-between items-center"
                  onClick={() => handleAddExerciseToNewSection(ex.id)}
                >
                  <span>{ex.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ex.category}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Day Options */}
      <Dialog
        open={showDayOptionsDialog}
        onOpenChange={setShowDayOptionsDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              จัดการ Day {selectedDayNumber}
            </DialogTitle>
            <DialogDescription>เลือกการจัดการ</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <button
              className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-slate-50 hover:border-blue-200 transition-all space-y-3 h-[200px]"
              onClick={() => {
                if (selectedDayForOptions) {
                  if (selectedDayForOptions.isRestDay)
                    handleToggleRestDay(selectedDayForOptions);
                  setSelectedDayId(selectedDayForOptions.id);
                  setSelectedDayNumber(selectedDayForOptions.dayNumber);
                  setShowWorkoutChoiceDialog(true);
                  setShowDayOptionsDialog(false);
                }
              }}
            >
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Workout</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  เพิ่มท่าใหม่
                </p>
              </div>
            </button>
            <button
              className={`flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-slate-50 transition-all space-y-3 h-[200px] ${selectedDayForOptions?.isRestDay ? "border-green-200 bg-green-50/50" : "hover:border-purple-200"}`}
              onClick={async () => {
                if (selectedDayForOptions) {
                  await handleToggleRestDay(selectedDayForOptions);
                  setShowDayOptionsDialog(false);
                }
              }}
            >
              {selectedDayForOptions?.isRestDay ? (
                <>
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <Dumbbell className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">เปลี่ยนเป็นวันฝึก</h3>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                    <Moon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">ตั้งเป็นวันพัก</h3>
                  </div>
                </>
              )}
            </button>
            <button
              className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-slate-50 hover:border-orange-200 transition-all space-y-3 h-[200px]"
              onClick={() => {
                if (selectedDayForOptions) {
                  if (!selectedDayForOptions.isRestDay)
                    toggleDay(selectedDayForOptions.id);
                  setShowDayOptionsDialog(false);
                }
              }}
            >
              <div className="p-3 bg-orange-50 rounded-full text-orange-600">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">ดูรายละเอียด</h3>
              </div>
            </button>
          </div>
          <DialogFooter className="sm:justify-center border-t pt-4 mt-2">
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto"
              onClick={() => {
                if (selectedDayForOptions) {
                  handleRemoveDay(selectedDayForOptions.id);
                  setShowDayOptionsDialog(false);
                }
              }}
            >
              <Trash className="h-4 w-4 mr-2" /> ลบวันนี้
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowDayOptionsDialog(false)}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignProgramModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        programId={selectedProgramId ? parseInt(selectedProgramId) : null}
        programName={selectedProgramDetail?.name || ""}
        onSuccess={() => {
          setTimeout(() => setView("list"), 500);
          fetchInitialData();
        }}
      />

      {/* Workout Choice */}
      <Dialog
        open={showWorkoutChoiceDialog}
        onOpenChange={setShowWorkoutChoiceDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">เพิ่ม Workout</DialogTitle>
            <DialogDescription>เลือกวิธีเพิ่ม</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div
              role="button"
              tabIndex={0}
              className="flex flex-col items-center justify-center p-6 border rounded-xl bg-slate-50/50 hover:bg-slate-100 hover:border-blue-200 transition-all cursor-pointer space-y-3 h-[180px]"
              onClick={() => {
                setShowWorkoutChoiceDialog(false);
                setShowAddSectionModal(true);
                setIsQuickAddMode(false);
                setNewSection({
                  sectionType: "main",
                  sectionFormat: "straight-sets",
                  name: "",
                  duration: 45,
                  exercises: [],
                  notes: "",
                });
                setNewSectionExercises([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setShowWorkoutChoiceDialog(false);
                  setShowAddSectionModal(true);
                  setIsQuickAddMode(false);
                  // same logic...
                }
              }}
            >
              <div className="p-3 bg-slate-200 rounded-full text-slate-700">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Add Section</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  สร้าง Section ใหม่
                </p>
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="flex flex-col items-center justify-center p-6 border rounded-xl bg-slate-50/50 hover:bg-slate-100 hover:border-blue-200 transition-all cursor-pointer space-y-3 h-[180px]"
              onClick={() => {
                setShowWorkoutChoiceDialog(false);
                setShowAddSectionModal(true);
                setIsQuickAddMode(true);
                setNewSection({
                  sectionType: "main",
                  sectionFormat: "straight-sets",
                  name: "Main Workout",
                  exercises: [],
                });
                setNewSectionExercises([]);
                setShowExercisePicker(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setShowWorkoutChoiceDialog(false);
                  setShowAddSectionModal(true);
                  setIsQuickAddMode(true);
                  setShowExercisePicker(true);
                }
              }}
            >
              <div className="p-3 bg-slate-200 rounded-full text-slate-700">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Add Exercise</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  เพิ่มท่าทันที
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowWorkoutChoiceDialog(false)}
            >
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ FIX Bug #3: Edit Exercise Modal — Dynamic Fields */}
      <Dialog
        open={showEditExerciseModal}
        onOpenChange={setShowEditExerciseModal}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไข Sets & Reps</DialogTitle>
            <DialogDescription>
              ปรับปรุงรายละเอียดสำหรับ{" "}
              {exercisesList.find(
                (e) => e.id.toString() === editingExercise?.exerciseId,
              )?.name || "Exercise"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingExercise &&
              (() => {
                const exerciseData = exercisesList.find(
                  (e) => e.id.toString() === editingExercise.exerciseId,
                );
                const editFields = editingExercise.trackingFields?.length
                  ? editingExercise.trackingFields
                  : exerciseData?.trackingFields?.length
                    ? exerciseData.trackingFields
                    : getFields(exerciseData);
                const displayFields = editFields
                  .map((f) => f.toLowerCase())
                  .filter((f) => f !== "sets");

                return (
                  <div className="space-y-2">
                    {editingExerciseSets.map((set, idx) => (
                      <div
                        key={idx}
                        className="border p-3 rounded-lg bg-slate-50 relative group"
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              const n = [...editingExerciseSets];
                              n.splice(idx, 1);
                              n.forEach((s, i) => (s.setNumber = i + 1));
                              setEditingExerciseSets(n);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="w-16">
                            <Label className="text-xs text-muted-foreground">
                              Set
                            </Label>
                            <div className="flex items-center justify-center h-10 font-bold bg-white border rounded text-sm">
                              {set.setNumber}
                            </div>
                          </div>
                          {displayFields.map((fieldName) => {
                            const config = FIELD_CONFIG[fieldName];
                            if (!config) return null;
                            if (fieldName === "notes")
                              return (
                                <div key={fieldName} className="w-full mt-1">
                                  <Label className="text-xs">
                                    {config.label}
                                  </Label>
                                  <Input
                                    value={(set as any)[fieldName] || ""}
                                    onChange={(e) => {
                                      const n = [...editingExerciseSets];
                                      (n[idx] as any)[fieldName] =
                                        e.target.value;
                                      setEditingExerciseSets(n);
                                    }}
                                    placeholder={config.placeholder}
                                    className="h-10"
                                  />
                                </div>
                              );
                            const isTimeField = [
                              "rest",
                              "time",
                              "duration",
                              "hold_time",
                            ].includes(fieldName);
                            return (
                              <div key={fieldName} className="w-20">
                                <Label className="text-xs">
                                  {config.label}
                                </Label>
                                <Input
                                  value={(set as any)[fieldName] ?? ""}
                                  onChange={(e) => {
                                    let val: any = e.target.value;
                                    if (isTimeField) val = formatTimeInput(val);
                                    else if (
                                      config.type === "number" &&
                                      val !== ""
                                    ) {
                                      const p = parseFloat(val);
                                      val = isNaN(p) ? 0 : p;
                                    }
                                    const n = [...editingExerciseSets];
                                    (n[idx] as any)[fieldName] = val;
                                    setEditingExerciseSets(n);
                                  }}
                                  type={isTimeField ? "text" : config.type}
                                  placeholder={config.placeholder}
                                  className="h-10 text-center"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                      onClick={() =>
                        setEditingExerciseSets([
                          ...editingExerciseSets,
                          {
                            setNumber: editingExerciseSets.length + 1,
                            reps: 10,
                            weight: 0,
                            rpe: 8,
                            rest: 60,
                          },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" /> เพิ่ม Set
                    </Button>
                  </div>
                );
              })()}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowEditExerciseModal(false)}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEditedExercise}>
              บันทึกการเปลี่ยนแปลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sharedModals}
    </div>
  );
}
