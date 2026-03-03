import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Calendar, Clock, User, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import {
  clientService,
  Session,
  SessionDetail,
  SessionExercise,
} from "@/services/clientService";

interface SessionDetailModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function SessionDetailModal({
  session,
  isOpen,
  onClose,
  onUpdate,
}: SessionDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    if (isOpen && session) {
      loadSessionDetail(session.id, session.client_id);
    } else {
      setDetail(null);
    }
  }, [isOpen, session]);

  const loadSessionDetail = async (
    sessionId: string | number,
    clientId: string | number,
  ) => {
    try {
      setLoading(true);
      const data = await clientService.getSessionDetail(clientId, sessionId);
      setDetail(data);
    } catch (error) {
      console.error("Failed to load session detail", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(parseISO(dateString), "d MMMM yyyy", { locale: th });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    return format(parseISO(dateString), "HH:mm");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold">
                {session?.title || "รายละเอียดการฝึก"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {session?.start_time
                  ? formatDate(session.start_time)
                  : session?.date}
                {session?.start_time && (
                  <>
                    <span className="mx-1">•</span>
                    <Clock className="w-4 h-4" />
                    {formatTime(session.start_time)} -{" "}
                    {formatTime(session?.end_time)}
                  </>
                )}
              </DialogDescription>
            </div>
            {session?.status && (
              <Badge
                variant={
                  session.status === "completed" ? "default" : "secondary"
                }
                className={
                  session.status === "completed"
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }
              >
                {session.status === "completed" ? "เสร็จสิ้น" : "นัดหมาย"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Trainer Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  เทรนเนอร์
                </h4>
                <p className="font-medium">
                  {session?.trainer_name || "Trainer"}
                </p>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                กำลังโหลดรายละเอียด...
              </div>
            ) : detail ? (
              <div className="space-y-6">
                {/* Summary/Notes */}
                {detail?.notes && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      บันทึกเพิ่มเติม
                    </h3>
                    <p className="text-muted-foreground bg-muted/30 p-4 rounded-lg text-sm">
                      {detail.notes}
                    </p>
                  </div>
                )}

                {/* Exercises List */}
                <div className="space-y-6">
                  {/* Group by Section */}
                  {Object.values(
                    (detail.exercises || []).reduce(
                      (acc, ex) => {
                        const sectionName = ex.section_name || "ทั่วไป";
                        const order = ex.section_order ?? 999;
                        const key = `${order}-${sectionName}`;
                        if (!acc[key]) {
                          acc[key] = {
                            name: sectionName,
                            order: order,
                            exercises: [],
                          };
                        }
                        acc[key].exercises.push(ex);
                        return acc;
                      },
                      {} as Record<
                        string,
                        {
                          name: string;
                          order: number;
                          exercises: SessionExercise[];
                        }
                      >,
                    ),
                  )
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <div key={section.name} className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <h3 className="font-semibold text-lg text-primary">
                            {section.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {section.exercises.length} ท่า
                          </Badge>
                        </div>

                        <div className="grid gap-4">
                          {section.exercises.map((exercise, index) => {
                            // Determine display fields
                            const displayFields =
                              exercise.tracking_fields &&
                              exercise.tracking_fields.length > 0
                                ? exercise.tracking_fields
                                : ["reps", "weight"]; // Default fallback

                            // Helper for Thai labels
                            const getFieldLabel = (field: string) => {
                              const labels: Record<string, string> = {
                                reps: "REPS",
                                weight: "WEIGHT",
                                rpe: "RPE",
                                duration: "เวลา",
                                distance: "ระยะทาง",
                                speed: "ความเร็ว",
                                watts: "วัตต์",
                                cadence: "รอบขา",
                                heart_rate: "HR",
                                calories: "แคลอรี่",
                                incline: "ความชัน",
                                level: "ระดับ",
                                laps: "รอบ",
                                rest: "REST",
                              };
                              return labels[field] || field;
                            };

                            // Map tracking field names to actual SessionSet property names
                            // (some fields don't follow the simple actual_${field} pattern)
                            const getSetValue = (
                              set: any,
                              field: string,
                            ): string => {
                              // Special field mappings
                              const fieldMap: Record<
                                string,
                                { actual: string; target: string }
                              > = {
                                rest: {
                                  actual: "actual_rest_duration",
                                  target: "rest_duration",
                                },
                                weight: {
                                  actual: "actual_weight",
                                  target: "target_weight",
                                },
                                reps: {
                                  actual: "actual_reps",
                                  target: "target_reps",
                                },
                                rpe: {
                                  actual: "actual_rpe",
                                  target: "target_rpe",
                                },
                                duration: {
                                  actual: "actual_duration",
                                  target: "target_duration",
                                },
                              };

                              const mapping = fieldMap[field];
                              const actualKey = mapping
                                ? mapping.actual
                                : `actual_${field}`;
                              const targetKey = mapping
                                ? mapping.target
                                : `target_${field}`;

                              const actualVal = set[actualKey];
                              if (
                                actualVal !== undefined &&
                                actualVal !== null
                              ) {
                                // Format seconds as mm:ss for rest/duration fields
                                if (
                                  (field === "rest" || field === "duration") &&
                                  typeof actualVal === "number"
                                ) {
                                  const m = Math.floor(actualVal / 60);
                                  const s = actualVal % 60;
                                  return `${m}:${s.toString().padStart(2, "0")}`;
                                }
                                return String(actualVal);
                              }

                              // Fallback: actual_metadata
                              const metaVal = set.actual_metadata?.[field];
                              if (metaVal !== undefined && metaVal !== null)
                                return String(metaVal);

                              // Fallback: target value
                              const targetVal = set[targetKey];
                              if (
                                targetVal !== undefined &&
                                targetVal !== null
                              ) {
                                if (
                                  (field === "rest" || field === "duration") &&
                                  typeof targetVal === "number"
                                ) {
                                  const m = Math.floor(targetVal / 60);
                                  const s = targetVal % 60;
                                  return `${m}:${s.toString().padStart(2, "0")}`;
                                }
                                return String(targetVal);
                              }

                              // Fallback: target_metadata
                              const tMetaVal = set.target_metadata?.[field];
                              if (tMetaVal !== undefined && tMetaVal !== null)
                                return String(tMetaVal);

                              return "-";
                            };

                            return (
                              <div
                                key={exercise.id}
                                className="border rounded-lg p-4 space-y-3 bg-card"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <div>
                                      <h4 className="font-semibold">
                                        {exercise.name}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        {exercise.category || "General"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Sets Table */}
                                {exercise.sets && exercise.sets.length > 0 && (
                                  <div className="bg-muted/30 rounded-md overflow-hidden overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                      <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                          <th className="px-4 py-2 font-medium w-16">
                                            เซต
                                          </th>
                                          {displayFields.map((field) => (
                                            <th
                                              key={field}
                                              className="px-4 py-2 font-medium min-w-[80px]"
                                            >
                                              {getFieldLabel(field)}
                                            </th>
                                          ))}
                                          <th className="px-4 py-2 font-medium w-20 text-center">
                                            สถานะ
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/50">
                                        {exercise.sets.map((set) => (
                                          <tr key={set.set_number}>
                                            <td className="px-4 py-2 font-medium text-muted-foreground">
                                              {set.set_number}
                                            </td>
                                            {displayFields.map((field) => (
                                              <td
                                                key={field}
                                                className="px-4 py-2"
                                              >
                                                {getSetValue(set, field)}
                                              </td>
                                            ))}
                                            <td className="px-4 py-2 text-center">
                                              {set.completed ? (
                                                <span className="text-green-600 text-xs font-bold">
                                                  ✓
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground text-xs">
                                                  -
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {exercise.notes && (
                                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    <span className="font-semibold">
                                      บันทึก:{" "}
                                    </span>
                                    {exercise.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                ไม่พบข้อมูล
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
