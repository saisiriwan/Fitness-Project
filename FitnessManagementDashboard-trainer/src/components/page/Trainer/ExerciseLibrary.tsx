import { useState, useEffect } from "react";
import { Search, Plus, BookOpen, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from "sonner";
import api from "@/lib/api";
import ExerciseForm, {
  ExerciseFormData,
} from "@/components/forms/ExerciseForm";

// Interface ให้ตรงกับ DB และ Frontend logic
interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_groups: string[]; // รับจาก DB เป็น Array of String (TEXT[])
  description?: string;

  // Helper fields for Frontend
  modality?: string;
  muscleGroups?: string[];
  movementPattern?: string;
  instructions?: string;
  trackingType?: string;
  trackingFields?: string[];
  caloriesEstimate?: string; // Added to fix data loss
}

interface ExerciseLibraryProps {
  onSelect?: (exercise: Exercise) => void;
}

export default function ExerciseLibrary({ onSelect }: ExerciseLibraryProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [muscleGroupFilter] = useState("all");

  // State สำหรับ Modal (Add/Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // State สำหรับดูรายละเอียด (View Details)
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);

  // State สำหรับ Form Data (ใช้สำหรับ initial data ของ form)
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: "",
    modality: "",
    muscleGroups: [],
    movementPattern: "",
    category: "",
    fields: [],
    instructions: "",
    caloriesEstimate: "", // Initialize
  });

  // 1. READ: Fetch Exercises
  const fetchExercises = async () => {
    try {
      setLoading(true);
      const res = await api.get("/exercises");

      // Map ข้อมูลจาก DB ให้ตรงกับ Frontend
      const mappedData = (res.data || []).map((ex: any) => ({
        ...ex,
        // Backend ส่ง muscle_groups เป็น Array แล้ว ใช้ได้เลย
        muscleGroups: ex.muscle_groups || [],
        // Map fields
        movementPattern: ex.movement_pattern || "",
        instructions: ex.instructions || ex.description || "",
        trackingType: ex.tracking_type || ex.category || "strength",
        trackingFields: ex.tracking_fields || [],
        caloriesEstimate: ex.calories_estimate || "", // Map from DB
        modality:
          ex.modality || (ex.category ? ex.category.toLowerCase() : "strength"),
      }));

      setExercises(mappedData);
    } catch (err) {
      console.error("Failed to fetch exercises", err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  // 2. CREATE & UPDATE: Handle Submit
  const handleSubmit = async (data: ExerciseFormData) => {
    if (!data.name) {
      toast.error("กรุณากรอกชื่อท่า");
      return;
    }

    // Payload ต้องใช้ key 'muscle_groups' ให้ตรงกับ JSON tag ใน Go struct
    const payload = {
      name: data.name,
      // Usually tracking type in form
      category: data.category, // Usually tracking type in form
      muscle_groups: data.muscleGroups || [],
      movement_pattern: data.movementPattern,
      modality: data.modality, // Correctly mapped
      instructions: data.instructions, // Correctly mapped
      tracking_type: data.category, // Using category as tracking_type based on form logic
      tracking_fields: data.fields || [],
      calories_estimate: data.caloriesEstimate || "",
    };

    try {
      if (isEditing && currentId) {
        // Update
        await api.put(`/exercises/${currentId}`, payload);
        toast.success("แก้ไขข้อมูลเรียบร้อยแล้ว");
      } else {
        // Create
        await api.post("/exercises", payload);
        toast.success("เพิ่มท่าใหม่เรียบร้อยแล้ว");
      }

      setShowModal(false);
      fetchExercises(); // Reload ข้อมูลใหม่
    } catch (err) {
      console.error(err);
      toast.error(isEditing ? "แก้ไขข้อมูลไม่สำเร็จ" : "เพิ่มข้อมูลไม่สำเร็จ");
    }
  };

  // 3. DELETE: Handle Delete
  const handleDeleteExercise = async (id: number) => {
    if (
      !window.confirm(
        "คำเตือน: การลบท่านี้จะลบออกจากทุกโปรแกรมและประวัติการฝึกทั้งหมด คุณแน่ใจหรือไม่?",
      )
    )
      return;

    try {
      await api.delete(`/exercises/${id}`);
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
      toast.success("ลบท่าออกกำลังกายเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error("Failed to delete exercise", err);
      toast.error("เกิดข้อผิดพลาดในการลบ");
    }
  };

  // Helper Functions
  const openAddModal = () => {
    setFormData({
      name: "",
      modality: "",
      muscleGroups: [],
      movementPattern: "",
      category: "",
      fields: [],
      instructions: "",
      caloriesEstimate: "",
    });
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const openEditModal = (ex: Exercise) => {
    setFormData({
      name: ex.name,
      modality: ex.modality || "Strength", // Default to Strength if missing
      muscleGroups: ex.muscleGroups || [],
      movementPattern: ex.movementPattern || "",
      category: ex.trackingType || "strength", // Default tracking type
      fields: ex.trackingFields || [], // Backend fields
      instructions: ex.instructions || "",
      caloriesEstimate: ex.caloriesEstimate || "", // Load existing value
    });
    setIsEditing(true);
    setCurrentId(ex.id);
    setShowModal(true);
  };

  // Filter Logic
  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesModality =
      modalityFilter === "all" ||
      (exercise.modality || "")
        .toLowerCase()
        .includes(modalityFilter.toLowerCase());
    const matchesMuscleGroup =
      muscleGroupFilter === "all" ||
      (exercise.muscleGroups || []).some((group) =>
        group.toLowerCase().includes(muscleGroupFilter.toLowerCase()),
      );
    return matchesSearch && matchesModality && matchesMuscleGroup;
  });

  const getModalityBadge = (modality: string = "") => {
    const modalityMap: Record<string, { label: string; color: string }> = {
      weight_training: { label: "Weight Training", color: "badge-red" },
      strength: { label: "Weight Training", color: "badge-red" },
      cardio: { label: "Cardio", color: "badge-green" },
      aerobic: { label: "Aerobic", color: "badge-purple" },
      flexibility: { label: "Flexibility", color: "badge-blue" },
      yoga: { label: "Yoga", color: "badge-blue" },
    };
    const key =
      Object.keys(modalityMap).find((k) =>
        modality.toLowerCase().includes(k),
      ) || "weight_training";
    return modalityMap[key];
  };

  if (loading)
    return (
      <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="glass-card border-slate-200/60 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full md:w-[200px]" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="glass-card border-slate-200/60">
              <CardHeader className="pb-3">
                <div className="flex justify-between gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-3 w-20 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              คลังท่าออกกำลังกาย
            </h1>
            <p className="text-slate-300 max-w-lg text-sm leading-relaxed">
              จัดการและค้นหาท่าออกกำลังกายทั้งหมดของคุณได้ที่นี่
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={openAddModal}
              className="bg-white text-navy-900 hover:bg-slate-100 shadow-lg border-0 font-semibold h-12 px-6 rounded-full transition-transform active:scale-95"
            >
              <Plus className="h-5 w-5 mr-2 text-orange-600" /> เพิ่มท่าใหม่
            </Button>
          </div>
        </div>

        {/* Unified Add/Edit Modal */}
        <ExerciseForm
          isOpen={showModal}
          onSave={handleSubmit}
          onClose={() => setShowModal(false)}
          initialData={isEditing ? formData : undefined}
        />
      </div>

      {/* Stats & Filters */}
      <Card className="border-slate-100 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อท่า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-10 rounded-xl border-slate-200">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ประเภททั้งหมด</SelectItem>
                <SelectItem value="strength">Weight Training</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 ring-1 ring-slate-100">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-navy-900">
              ไม่พบท่าออกกำลังกาย
            </h3>
            <p className="text-slate-500 max-w-sm mt-1">
              ลองปรับคำค้นหาหรือตัวกรอง หรือเพิ่มท่าออกกำลังกายใหม่
            </p>
          </div>
        ) : (
          filteredExercises.map((exercise) => {
            const modalityBadge = getModalityBadge(exercise.modality);
            return (
              <Card
                key={exercise.id}
                className={`border-slate-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl group hover:-translate-y-1 ${
                  !onSelect ? "cursor-pointer" : ""
                }`}
                onClick={() => {
                  if (!onSelect) setViewExercise(exercise);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-semibold text-navy-800 leading-tight">
                      {exercise.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={`${
                        modalityBadge.color === "badge-red"
                          ? "bg-red-100 text-red-700"
                          : modalityBadge.color === "badge-green"
                            ? "bg-green-100 text-green-700"
                            : modalityBadge.color === "badge-blue"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                      } border-0 font-medium whitespace-nowrap`}
                    >
                      {modalityBadge.label}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-500 font-medium">
                    {exercise.movementPattern || "ไม่ระบุรูปแบบ"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                        กล้ามเนื้อที่ใช้
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(exercise.muscleGroups || []).length > 0 ? (
                          (exercise.muscleGroups || []).map((group) => (
                            <Badge
                              key={group}
                              variant="outline"
                              className="bg-white/50 text-slate-600 border-slate-200"
                            >
                              {group}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400 italic">
                            -
                          </span>
                        )}
                      </div>
                    </div>

                    {exercise.instructions && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          คำแนะนำ
                        </p>
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {exercise.instructions}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 mt-auto">
                      <Button
                        size="sm"
                        variant={onSelect ? "default" : "outline"}
                        className={
                          onSelect
                            ? "flex-1 bg-navy-900 text-white hover:bg-navy-800"
                            : "flex-1 bg-white/50 hover:bg-white hover:text-primary hover:border-primary/30 transition-colors"
                        }
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          if (onSelect) {
                            onSelect(exercise);
                          } else {
                            setViewExercise(exercise);
                          }
                        }}
                      >
                        {onSelect ? "เลือกท่านี้" : "ดูรายละเอียด"}
                      </Button>

                      <div className="flex items-center gap-1 border-l pl-2 ml-1 border-slate-200">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-orange-500 hover:bg-orange-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(exercise);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>แก้ไข</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteExercise(exercise.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ลบ</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog
        open={!!viewExercise}
        onOpenChange={(open) => !open && setViewExercise(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 rounded-xl text-orange-600">
                {/* Dynamic Icon based on category could go here */}
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-navy-900">
                  {viewExercise?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  {viewExercise?.modality} • {viewExercise?.category}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Instructions */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
                คำแนะนำ / วิธีปฏิบัติ
              </h4>
              <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed whitespace-pre-line border border-slate-100">
                {viewExercise?.instructions || "ไม่มีคำแนะนำเพิ่มเติม"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Muscle Groups */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  กล้ามเนื้อที่ใช้
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewExercise?.muscleGroups &&
                  viewExercise.muscleGroups.length > 0 ? (
                    viewExercise.muscleGroups.map((group) => (
                      <Badge
                        key={group}
                        variant="secondary"
                        className="bg-navy-50 text-navy-700 hover:bg-navy-100"
                      >
                        {group}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </div>
              </div>

              {/* Movement Pattern */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  รูปแบบการเคลื่อนไหว
                </h4>
                <div className="text-sm font-medium text-navy-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg inline-block shadow-sm">
                  {viewExercise?.movementPattern || "ไม่ระบุ"}
                </div>
              </div>
            </div>

            {/* Tracking Fields */}
            {viewExercise?.trackingFields &&
              viewExercise.trackingFields.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    ตัวชี้วัดที่ต้องบันทึก
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewExercise.trackingFields.map((field) => (
                      <div
                        key={field}
                        className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200"
                      >
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
