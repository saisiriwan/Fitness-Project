import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Star,
  Calendar,
  Clock,
  MessageSquare,
  Target,
  TrendingUp,
  Dumbbell,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Session } from "@/services/clientService";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

interface SessionCardsViewProps {
  cards: Session[];
}

// Helper: Parse feedback into comment and goals
const parseFeedback = (feedback?: string) => {
  if (!feedback) return { comment: "", goals: [] };

  // Split by "Next Goals:" or similar markers (case-insensitive)
  const parts = feedback.split(/Next Goals:|Goals:|เป้าหมายครั้งต่อไป:/i);
  const comment = parts[0].trim();
  const goalsRaw = parts.length > 1 ? parts[1].trim() : "";

  // Split goals by newlines, bullets, or hyphens
  const goals = goalsRaw
    .split(/\n|•|-/)
    .map((g) => g.trim())
    .filter((g) => g.length > 0);

  return { comment, goals };
};

const getTypeColor = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "cardio":
    case "hiit":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "strength":
    case "weight training":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "flexibility":
    case "yoga":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700";
  }
};

export function SessionCardsView({ cards }: SessionCardsViewProps) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          สรุปผลการฝึก
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          รีวิวเซสชั่นที่ผ่านมาและคำแนะนำจากเทรนเนอร์
        </p>
      </div>

      {/* Session Summary Cards */}
      <div className="grid gap-6">
        {cards.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-muted-foreground">
              ยังไม่มีประวัติการฝึกที่มีการบันทึกผล
            </p>
          </div>
        ) : (
          [...cards]
            .sort((a, b) => {
              const da = a.start_time
                ? parseISO(a.start_time)
                : parseISO(a.date);
              const db = b.start_time
                ? parseISO(b.start_time)
                : parseISO(b.date);
              return db.getTime() - da.getTime(); // Descending: newest first
            })
            .map((session) => {
              const { comment, goals } = parseFeedback(session.feedback);
              const typeColor = getTypeColor(session.title || "general");
              const logs = session.logs || [];

              return (
                <div
                  key={session.id}
                  className="group bg-card hover:bg-card/90 border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  {/* 📌 Card Header */}
                  <div className="p-5 sm:p-6 border-b border-border/50 bg-slate-50/30 dark:bg-slate-900/30">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                          <AvatarImage src={session.trainer_avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {session.trainer_name?.charAt(0) || "T"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-bold text-foreground leading-tight mb-0.5">
                            {session.trainer_name || session.trainer_username
                              ? `โค้ช ${session.trainer_name || session.trainer_username}`
                              : "Trainer"}
                          </h3>
                          {session.trainer_username && (
                            <p className="text-sm text-muted-foreground font-medium mb-1">
                              @{session.trainer_username}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-primary/70" />
                              <span>
                                {session.start_time
                                  ? format(
                                      parseISO(session.start_time),
                                      "d MMM yyyy",
                                      { locale: th },
                                    )
                                  : session.date}
                              </span>
                            </div>
                            {session.start_time && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary/70" />
                                <span>
                                  {format(
                                    parseISO(session.start_time),
                                    "HH:mm",
                                  )}
                                  {session.end_time &&
                                    ` - ${format(
                                      parseISO(session.end_time),
                                      "HH:mm",
                                    )}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`px-3 py-1 text-xs font-medium rounded-full ${typeColor}`}
                      >
                        {session.title || "Strength Training"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-6">
                    {/* ⭐ Rating Section */}
                    <div className="flex items-center gap-2 mb-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg w-fit border border-amber-100 dark:border-amber-900/20">
                      {session.rating && session.rating > 0 ? (
                        <>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 transition-colors ${
                                  star <= session.rating!
                                    ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                                    : "text-amber-200 dark:text-amber-900"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400 ml-2">
                            {session.rating}/5
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-amber-700/70 dark:text-amber-400/70">
                          รอการประเมินจากเทรนเนอร์
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Column: Feedback & Goals */}
                      <div className="space-y-6">
                        {/* 💬 Feedback */}
                        {comment ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                              <MessageSquare className="w-4 h-4" />
                              <h4 className="font-semibold text-sm uppercase tracking-wide">
                                ความคิดเห็นจากเทรนเนอร์
                              </h4>
                            </div>
                            <div className="bg-muted/30 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed border border-border/50">
                              {comment}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MessageSquare className="w-4 h-4" />
                              <h4 className="font-semibold text-sm uppercase tracking-wide">
                                ความคิดเห็นจากเทรนเนอร์
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground italic pl-6">
                              ไม่มีความคิดเห็นเพิ่มเติม
                            </p>
                          </div>
                        )}

                        {/* 🎯 Next Goals */}
                        {goals.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <Target className="w-4 h-4" />
                              <h4 className="font-semibold text-sm uppercase tracking-wide">
                                เป้าหมายครั้งต่อไป
                              </h4>
                            </div>
                            <ul className="space-y-2 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30">
                              {goals.map((goal, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-3"
                                >
                                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-sm text-foreground/80 font-medium">
                                    {goal}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Target className="w-4 h-4" />
                              <h4 className="font-semibold text-sm uppercase tracking-wide">
                                เป้าหมายครั้งต่อไป
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground italic pl-6">
                              ยังไม่มีเป้าหมายถูกระบุ
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Exercises */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                          <Dumbbell className="w-4 h-4" />
                          <h4 className="font-semibold text-sm uppercase tracking-wide">
                            รายการการฝึก
                          </h4>
                        </div>

                        {logs.length > 0 ? (
                          <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/50">
                            {logs.map((log: any, index: number) => {
                              const sets = log.sets || [];
                              const totalSets = sets.length;

                              const maxActualWeight = sets.reduce(
                                (max: number, s: any) =>
                                  Math.max(max, s.actual_weight || 0),
                                0,
                              );
                              const maxTargetWeight = sets.reduce(
                                (max: number, s: any) =>
                                  Math.max(max, s.target_weight || 0),
                                0,
                              );
                              const maxActualReps = sets.reduce(
                                (max: number, s: any) =>
                                  Math.max(max, s.actual_reps || 0),
                                0,
                              );
                              const maxTargetReps = sets.reduce(
                                (max: number, s: any) =>
                                  Math.max(max, s.target_reps || 0),
                                0,
                              );

                              const weightDiff =
                                maxActualWeight - maxTargetWeight;
                              const repsDiff = maxActualReps - maxTargetReps;
                              const isCompleted =
                                totalSets > 0 &&
                                sets.some((s: any) => s.completed);

                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 px-4 hover:bg-muted/20 transition-colors"
                                >
                                  <div>
                                    <p className="font-medium text-sm text-foreground">
                                      {log.exercise_name || log.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-border"
                                      >
                                        {totalSets} sets
                                      </Badge>
                                      {maxActualWeight > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          • Max {maxActualWeight}kg
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {weightDiff > 0 ? (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1 text-[10px] h-6 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                    >
                                      <TrendingUp className="w-3 h-3" />+
                                      {weightDiff}kg
                                    </Badge>
                                  ) : repsDiff > 0 ? (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1 text-[10px] h-6 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                    >
                                      <TrendingUp className="w-3 h-3" />+
                                      {repsDiff} reps
                                    </Badge>
                                  ) : (
                                    isCompleted && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-2 text-muted-foreground border-border"
                                      >
                                        Done
                                      </Badge>
                                    )
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-muted/10 rounded-xl border border-dashed border-border p-8 text-center">
                            <Dumbbell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              ยังไม่มีการบันทึกรายการฝึก
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
