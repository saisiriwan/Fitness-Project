import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  MoreHorizontal,
  Dumbbell,
  Eye,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  // State สำหรับดึงลบข้อมูล (Delete Confirm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null,
  );

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

  /* ฟังก์ชัน: fetchExercises — ดึงท่าออกกำลังกายทั้งหมดจาก API + map โครงสร้างให้ตรงกับ frontend */
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
          ex.modality ||
          (ex.category === "cardio"
            ? "cardio"
            : ex.category === "flexibility"
              ? "flexibility"
              : "strength"),
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

  /* ฟังก์ชัน: handleSubmit — สร้างท่าใหม่ (POST) หรือแก้ไขท่าเดิม (PUT) */
  const handleSubmit = async (data: ExerciseFormData) => {
    if (!data.name) {
      toast.error("กรุณากรอกชื่อท่า");
      return;
    }

    // Map modality → exercise category (weight-training/cardio/flexibility)
    const trackingType = data.category; // form "category" = tracking_type
    const deriveCategory = (modality: string): string => {
      const m = modality.toLowerCase();
      if (m.includes("strength") || m.includes("เสริมแรง"))
        return "weight-training";
      if (m.includes("cardio") || m.includes("คาร์ดิโอ")) return "cardio";
      if (m.includes("flexibility") || m.includes("ยืดหยุ่น"))
        return "flexibility";
      return "weight-training"; // default
    };

    const payload = {
      name: data.name,
      category: deriveCategory(data.modality),
      muscle_groups: data.muscleGroups || [],
      movement_pattern: data.movementPattern,
      modality: data.modality,
      instructions: data.instructions,
      tracking_type: trackingType,
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

  /* ฟังก์ชัน: handleDeleteExercise — ลบท่าจาก API (DELETE) + ลบออกจาก state */
  const handleDeleteExercise = async (id: number) => {
    try {
      await api.delete(`/exercises/${id}`);
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
      toast.success("ลบท่าออกกำลังกายเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error("Failed to delete exercise", err);
      toast.error("เกิดข้อผิดพลาดในการลบ");
    }
  };

  /* ฟังก์ชัน: openAddModal — เปิด modal โหมดเพิ่มท่าใหม่ (reset form) */
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

  /* ฟังก์ชัน: openEditModal — เปิด modal โหมดแก้ไข (pre-fill ข้อมูลเดิม) */
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
      "weight-training": { label: "Weight Training", color: "badge-red" },
      weight_training: { label: "Weight Training", color: "badge-red" },
      strength: { label: "Weight Training", color: "badge-red" },
      cardio: { label: "Cardio", color: "badge-green" },
      flexibility: { label: "Flexibility", color: "badge-blue" },
    };
    const key =
      Object.keys(modalityMap).find((k) =>
        modality.toLowerCase().includes(k),
      ) || "weight-training";
    return modalityMap[key];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-4 flex-1 w-full md:w-auto">
              <Skeleton className="h-10 w-full md:w-[250px]" />
              <Skeleton className="h-10 w-full md:w-[150px]" />
            </div>
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-in fade-in duration-500 rounded-2xl border-slate-200">
      <CardHeader className="pb-4 border-b border-slate-100/60 mb-4 bg-slate-50/50 rounded-t-2xl">
        <div className="flex flex-col gap-1 mb-4">
          <CardTitle className="text-2xl font-bold text-navy-900">
            คลังท่าออกกำลังกาย
          </CardTitle>
          <CardDescription className="text-slate-500">
            จัดการ ค้นหา และแก้ไขท่าออกกำลังกายในระบบ
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="ค้นหาชื่อท่าออกกำลังกาย..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 mr-2 h-10 w-full rounded-xl border-slate-200"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mr-auto">
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl border-slate-200">
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

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <Button
              onClick={openAddModal}
              className="flex items-center gap-2 whitespace-nowrap bg-navy-900 text-white hover:bg-navy-800 rounded-xl h-10 px-4"
            >
              <Plus className="h-4 w-4" />
              เพิ่มท่าใหม่
            </Button>
          </div>
        </div>

        <ExerciseForm
          isOpen={showModal}
          onSave={handleSubmit}
          onClose={() => setShowModal(false)}
          initialData={isEditing ? formData : undefined}
        />
      </CardHeader>

      <CardContent>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-600">
                  ท่าออกกำลังกาย
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  รูปแบบ (Pattern)
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  กล้ามเนื้อที่ใช้
                </TableHead>
                <TableHead className="font-semibold text-slate-600">
                  ประเภท
                </TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExercises.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-100 rounded-full">
                        <BookOpen className="h-6 w-6 text-slate-400" />
                      </div>
                      <p>
                        {searchTerm || modalityFilter !== "all"
                          ? "ไม่พบข้อมูลที่ค้นหา"
                          : 'ยังไม่มีท่าออกกำลังกาย คลิก "เพิ่มท่าใหม่" เพื่อเริ่มต้น'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExercises.map((exercise) => {
                  const modalityBadge = getModalityBadge(exercise.modality);
                  return (
                    <TableRow
                      key={exercise.id}
                      className={`hover:bg-slate-50 transition-colors ${onSelect ? "cursor-pointer" : "cursor-pointer"}`}
                      onClick={() => {
                        if (onSelect) {
                          onSelect(exercise);
                        } else {
                          openEditModal(exercise);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 flex items-center justify-center bg-orange-50 ring-1 ring-orange-100">
                            <AvatarFallback className="bg-transparent text-orange-600">
                              <Dumbbell className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-navy-900 leading-tight">
                              {exercise.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {exercise.category === "weight-training"
                                ? "Weight Training"
                                : exercise.category === "cardio"
                                  ? "Cardio"
                                  : exercise.category === "flexibility"
                                    ? "Flexibility"
                                    : exercise.category || "General"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-600">
                          {exercise.movementPattern || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(exercise.muscleGroups || []).length > 0 ? (
                            (exercise.muscleGroups || [])
                              .slice(0, 2)
                              .map((group) => (
                                <Badge
                                  key={group}
                                  variant="outline"
                                  className="text-xs font-medium text-slate-600 bg-white border-slate-200"
                                >
                                  {group}
                                </Badge>
                              ))
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                          {(exercise.muscleGroups || []).length > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs font-medium text-slate-500 bg-slate-50 border-slate-200"
                            >
                              +{(exercise.muscleGroups || []).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${
                            modalityBadge.color === "badge-red"
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : modalityBadge.color === "badge-green"
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : modalityBadge.color === "badge-blue"
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                          } border-0`}
                        >
                          {modalityBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(exercise);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="font-medium">แก้ไขข้อมูล</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExerciseToDelete(exercise);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="font-medium">ลบท่า</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-base">
              คุณแน่ใจหรือไม่ว่าต้องการลบ{" "}
              <span className="font-semibold text-navy-900">
                "{exerciseToDelete?.name}"
              </span>
              ? การดำเนินการนี้ไม่สามารถยกเลิกได้
              และอาจส่งผลต่อโปรแกรมที่มีท่านี้อยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="font-medium rounded-xl">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl"
              onClick={() => {
                if (exerciseToDelete) {
                  handleDeleteExercise(exerciseToDelete.id);
                  setDeleteDialogOpen(false);
                  setExerciseToDelete(null);
                }
              }}
            >
              ลบท่าออกกำลังกาย
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </Card>
  );
}
