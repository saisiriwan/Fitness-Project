import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  MoreHorizontal,
  Dumbbell,
  SlidersHorizontal,
  X,
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

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_groups: string[];
  description?: string;
  modality?: string;
  muscleGroups?: string[];
  movementPattern?: string;
  instructions?: string;
  trackingType?: string;
  trackingFields?: string[];
  caloriesEstimate?: string;
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
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null,
  );

  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);

  const [formData, setFormData] = useState<ExerciseFormData>({
    name: "",
    modality: "",
    muscleGroups: [],
    movementPattern: "",
    category: "",
    fields: [],
    instructions: "",
    caloriesEstimate: "",
  });

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const res = await api.get("/exercises");
      const mappedData = (res.data || []).map((ex: any) => ({
        ...ex,
        muscleGroups: ex.muscle_groups || [],
        movementPattern: ex.movement_pattern || "",
        instructions: ex.instructions || ex.description || "",
        trackingType: ex.tracking_type || ex.category || "strength",
        trackingFields: ex.tracking_fields || [],
        caloriesEstimate: ex.calories_estimate || "",
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

  const handleSubmit = async (data: ExerciseFormData) => {
    if (!data.name) {
      toast.error("กรุณากรอกชื่อท่า");
      return;
    }
    const deriveCategory = (modality: string): string => {
      const m = modality.toLowerCase();
      if (m.includes("strength") || m.includes("เสริมแรง"))
        return "weight-training";
      if (m.includes("cardio") || m.includes("คาร์ดิโอ")) return "cardio";
      if (m.includes("flexibility") || m.includes("ยืดหยุ่น"))
        return "flexibility";
      return "weight-training";
    };
    const payload = {
      name: data.name,
      category: deriveCategory(data.modality),
      muscle_groups: data.muscleGroups || [],
      movement_pattern: data.movementPattern,
      modality: data.modality,
      instructions: data.instructions,
      tracking_type: data.category,
      tracking_fields: data.fields || [],
      calories_estimate: data.caloriesEstimate || "",
    };
    try {
      if (isEditing && currentId) {
        await api.put(`/exercises/${currentId}`, payload);
        toast.success("แก้ไขข้อมูลเรียบร้อยแล้ว");
      } else {
        await api.post("/exercises", payload);
        toast.success("เพิ่มท่าใหม่เรียบร้อยแล้ว");
      }
      setShowModal(false);
      fetchExercises();
    } catch (err) {
      console.error(err);
      toast.error(isEditing ? "แก้ไขข้อมูลไม่สำเร็จ" : "เพิ่มข้อมูลไม่สำเร็จ");
    }
  };

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
      modality: ex.modality || "Strength",
      muscleGroups: ex.muscleGroups || [],
      movementPattern: ex.movementPattern || "",
      category: ex.trackingType || "strength",
      fields: ex.trackingFields || [],
      instructions: ex.instructions || "",
      caloriesEstimate: ex.caloriesEstimate || "",
    });
    setIsEditing(true);
    setCurrentId(ex.id);
    setShowModal(true);
  };

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
      (exercise.muscleGroups || []).some((g) =>
        g.toLowerCase().includes(muscleGroupFilter.toLowerCase()),
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

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      "weight-training": "Weight Training",
      cardio: "Cardio",
      flexibility: "Flexibility",
    };
    return map[cat] || cat || "General";
  };

  const modalityBadgeClass = (color: string) => {
    if (color === "badge-red") return "bg-red-50 text-red-700 border-0";
    if (color === "badge-green") return "bg-green-50 text-green-700 border-0";
    if (color === "badge-blue") return "bg-blue-50 text-blue-700 border-0";
    return "bg-purple-50 text-purple-700 border-0";
  };

  const hasActiveFilter = modalityFilter !== "all";

  /* ========================
     LOADING
  ======================== */
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4 px-4 sm:px-6">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 max-w-sm" />
            <Skeleton className="h-10 w-10 sm:w-[160px]" />
            <Skeleton className="h-10 w-10 sm:w-[120px]" />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-14 w-full rounded-xl"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  /* ========================
     MAIN
  ======================== */
  return (
    <Card className="animate-in fade-in duration-500 rounded-2xl border-slate-200">
      {/* ─────────────────────────────────────────
          HEADER
          Mobile: Search + Filter toggle + Add btn
          Desktop: Search | Modality select | Add btn
      ───────────────────────────────────────── */}
      <CardHeader className="pb-3 px-4 sm:px-6 border-b border-slate-100/60 bg-slate-50/50 rounded-t-2xl">
        <div className="flex flex-col gap-1 mb-3">
          <CardTitle className="text-xl sm:text-2xl font-bold text-navy-900">
            คลังท่าออกกำลังกาย
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs sm:text-sm hidden sm:block">
            จัดการ ค้นหา และแก้ไขท่าออกกำลังกายในระบบ
          </CardDescription>
        </div>

        {/* Row 1: Search + Filter toggle + Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="ค้นหาชื่อท่า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 min-h-[44px] rounded-xl border-slate-200"
            />
          </div>

          {/* Mobile: filter toggle */}
          <Button
            variant={hasActiveFilter ? "default" : "outline"}
            size="icon"
            className="sm:hidden min-w-[44px] min-h-[44px] rounded-xl flex-shrink-0"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            {showFilters ? (
              <X className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
          </Button>

          {/* Desktop: modality filter inline */}
          <div className="hidden sm:block">
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl border-slate-200">
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

          {/* Add button */}
          <Button
            onClick={openAddModal}
            className="flex items-center gap-1.5 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] rounded-xl flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">เพิ่มท่าใหม่</span>
          </Button>
        </div>

        {/* Row 2: Mobile collapsible filter */}
        {showFilters && (
          <div className="sm:hidden mt-2">
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger className="w-full min-h-[44px] rounded-xl border-slate-200">
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
        )}

        {/* Count + active filter hint */}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
          <span>{filteredExercises.length} ท่า</span>
          {hasActiveFilter && (
            <span className="flex items-center gap-1">
              •{" "}
              <button
                className="text-primary underline"
                onClick={() => setModalityFilter("all")}
              >
                ล้าง filter
              </button>
            </span>
          )}
        </div>

        <ExerciseForm
          isOpen={showModal}
          onSave={handleSubmit}
          onClose={() => setShowModal(false)}
          initialData={isEditing ? formData : undefined}
        />
      </CardHeader>

      {/* ─────────────────────────────────────────
          MOBILE CARD VIEW  (< sm = 640px)
      ───────────────────────────────────────── */}
      <CardContent className="sm:hidden px-3 pb-4 pt-3">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <div className="inline-flex p-3 bg-slate-100 rounded-full mb-3">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p>
              {searchTerm || hasActiveFilter
                ? "ไม่พบข้อมูลที่ค้นหา"
                : 'ยังไม่มีท่าออกกำลังกาย กด "เพิ่มท่าใหม่" เพื่อเริ่มต้น'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExercises.map((exercise) => {
              const mb = getModalityBadge(exercise.modality);
              return (
                <div
                  key={exercise.id}
                  className="bg-muted/30 border rounded-xl overflow-hidden"
                >
                  {/* Tap → view details or select */}
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (onSelect) {
                        onSelect(exercise);
                      } else {
                        setViewExercise(exercise);
                      }
                    }}
                  >
                    <Avatar className="h-10 w-10 bg-orange-50 ring-1 ring-orange-100 flex-shrink-0">
                      <AvatarFallback className="bg-transparent text-orange-600">
                        <Dumbbell className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm text-navy-900 truncate">
                        {exercise.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {getCategoryLabel(exercise.category)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 flex-shrink-0 ${modalityBadgeClass(mb.color)}`}
                    >
                      {mb.label}
                    </Badge>
                  </button>

                  {/* Bottom row: muscles + action */}
                  <div className="flex items-center gap-2 px-3 pb-2.5 pt-0">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {(exercise.muscleGroups || []).slice(0, 2).map((g) => (
                        <Badge
                          key={g}
                          variant="outline"
                          className="text-[10px] px-1.5"
                        >
                          {g}
                        </Badge>
                      ))}
                      {(exercise.muscleGroups || []).length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 bg-slate-50"
                        >
                          +{(exercise.muscleGroups || []).length - 2}
                        </Badge>
                      )}
                      {(exercise.muscleGroups || []).length === 0 && (
                        <span className="text-[10px] text-slate-400">
                          ไม่ระบุกล้ามเนื้อ
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                          onClick={() => openEditModal(exercise)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span>แก้ไขข้อมูล</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                          onClick={() => {
                            setExerciseToDelete(exercise);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>ลบท่า</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* ─────────────────────────────────────────
          DESKTOP TABLE VIEW  (>= sm = 640px)
      ───────────────────────────────────────── */}
      <CardContent className="hidden sm:block px-4 sm:px-6">
        <div className="table-responsive rounded-xl border border-slate-200 overflow-hidden">
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
                <TableHead className="text-right w-[60px]" />
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
                        {searchTerm || hasActiveFilter
                          ? "ไม่พบข้อมูลที่ค้นหา"
                          : 'ยังไม่มีท่าออกกำลังกาย คลิก "เพิ่มท่าใหม่" เพื่อเริ่มต้น'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExercises.map((exercise) => {
                  const mb = getModalityBadge(exercise.modality);
                  return (
                    <TableRow
                      key={exercise.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (onSelect) {
                          onSelect(exercise);
                        } else {
                          setViewExercise(exercise);
                        }
                      }}
                    >
                      {/* Name + category */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-orange-50 ring-1 ring-orange-100 flex-shrink-0">
                            <AvatarFallback className="bg-transparent text-orange-600">
                              <Dumbbell className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-navy-900 leading-tight">
                              {exercise.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {getCategoryLabel(exercise.category)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Movement pattern */}
                      <TableCell>
                        <span className="text-sm font-medium text-slate-600">
                          {exercise.movementPattern || "-"}
                        </span>
                      </TableCell>

                      {/* Muscle groups */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(exercise.muscleGroups || []).length > 0 ? (
                            (exercise.muscleGroups || [])
                              .slice(0, 2)
                              .map((g) => (
                                <Badge
                                  key={g}
                                  variant="outline"
                                  className="text-xs font-medium text-slate-600 bg-white border-slate-200"
                                >
                                  {g}
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

                      {/* Modality badge */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={modalityBadgeClass(mb.color)}
                        >
                          {mb.label}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
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

      {/* ─────────────────────────────────────────
          Delete Confirmation Dialog — mobile-safe
      ───────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md rounded-2xl"
          aria-describedby="delete-exercise-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">
              ยืนยันการลบ
            </AlertDialogTitle>
            <AlertDialogDescription
              id="delete-exercise-description"
              className="text-slate-500 text-sm sm:text-base"
            >
              คุณแน่ใจหรือไม่ว่าต้องการลบ{" "}
              <span className="font-semibold text-navy-900">
                "{exerciseToDelete?.name}"
              </span>
              ? การดำเนินการนี้ไม่สามารถยกเลิกได้
              และอาจส่งผลต่อโปรแกรมที่มีท่านี้อยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-2">
            <AlertDialogCancel className="min-h-[44px] sm:min-h-0 font-medium rounded-xl">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl min-h-[44px] sm:min-h-0"
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

      {/* ─────────────────────────────────────────
          View Details Dialog — mobile-safe
      ───────────────────────────────────────── */}
      <Dialog
        open={!!viewExercise}
        onOpenChange={(open) => !open && setViewExercise(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 rounded-xl text-orange-600 flex-shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-navy-900 truncate">
                  {viewExercise?.name}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs sm:text-sm">
                  {viewExercise?.modality} • {viewExercise?.category}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Instructions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wide">
                คำแนะนำ / วิธีปฏิบัติ
              </h4>
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl text-slate-600 text-sm leading-relaxed whitespace-pre-line border border-slate-100">
                {viewExercise?.instructions || "ไม่มีคำแนะนำเพิ่มเติม"}
              </div>
            </div>

            {/* Muscle Groups + Movement Pattern */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="text-xs"
                      >
                        {group}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </div>
              </div>

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

            {/* Action buttons in dialog */}
            {!onSelect && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-[44px] sm:min-h-0 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    setViewExercise(null);
                    openEditModal(viewExercise!);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  แก้ไขข้อมูล
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-[44px] sm:min-h-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setViewExercise(null);
                    setExerciseToDelete(viewExercise);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบท่า
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
