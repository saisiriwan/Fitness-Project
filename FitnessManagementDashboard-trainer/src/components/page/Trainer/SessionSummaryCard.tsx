import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import {
  Download,
  Copy,
  CheckCircle2,
  Dumbbell,
  Target,
  MessageSquare,
  Star,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export interface SummaryExercise {
  name: string;
  setsCount: number;
  completed: boolean;
}

export interface SessionSummaryCardProps {
  clientName: string;
  sessionTitle: string;
  date: string;
  time: string;
  rating: number;
  comment: string;
  nextGoals: string;
  exercises: SummaryExercise[];
  completedCount: number;
  totalCount: number;
  onClose: () => void;
}

export default function SessionSummaryCard({
  clientName,
  sessionTitle,
  date,
  time,
  rating,
  comment,
  nextGoals,
  exercises,
  completedCount,
  totalCount,
  onClose,
}: SessionSummaryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  /* ฟังก์ชัน: captureCard — จับภาพหน้าจอการ์ดสรุปเป็น PNG (ใช้ html2canvas + แก้ oklch CSS) */
  const captureCard = async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error("No card ref");
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        // ลบ CSS custom properties ที่ใช้ oklch() ออกจาก :root
        const root = clonedDoc.documentElement;
        const computedStyle = getComputedStyle(root);
        for (let i = 0; i < computedStyle.length; i++) {
          const prop = computedStyle[i];
          if (prop.startsWith("--")) {
            const value = computedStyle.getPropertyValue(prop);
            if (value.includes("oklch")) {
              root.style.setProperty(prop, "transparent");
            }
          }
        }
        // ลบ oklch จาก element ทั้งหมดภายใน card
        const allElements = clonedDoc.querySelectorAll("*");
        allElements.forEach((el) => {
          const style = getComputedStyle(el);
          const htmlEl = el as HTMLElement;
          if (style.backgroundColor?.includes("oklch")) {
            htmlEl.style.backgroundColor = "transparent";
          }
          if (style.color?.includes("oklch")) {
            htmlEl.style.color = "#000000";
          }
          if (style.borderColor?.includes("oklch")) {
            htmlEl.style.borderColor = "transparent";
          }
        });
      },
    });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("Failed to generate image");
    return blob;
  };

  /* ฟังก์ชัน: handleDownload — ดาวน์โหลด PNG สรุปเซสชัน */
  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-summary-${clientName.replace(/\s+/g, "-")}-${date}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลดรูปสรุปเรียบร้อย!");
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถสร้างรูปได้");
    } finally {
      setExporting(false);
    }
  };

  /* ฟังก์ชัน: handleCopy — คัดลอก PNG ไป clipboard */
  const handleCopy = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("คัดลอกรูปไปยังคลิปบอร์ดแล้ว!");
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถคัดลอกได้ ลองดาวน์โหลดแทน");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 max-h-[95vh] overflow-y-auto">
        {/* === CARD (จะถูก capture เป็นรูป) === */}
        <div
          ref={cardRef}
          style={{
            width: 420,
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          }}
          className="rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* ── Header ── */}
          <div
            style={{
              background:
                "linear-gradient(135deg, #002140 0%, #003d75 50%, #FF6B35 100%)",
              padding: "28px 24px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  border: "2px solid rgba(255,255,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: 18,
                    lineHeight: 1.2,
                  }}
                >
                  {clientName}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {date} • {time}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Workout
                </div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                  {sessionTitle || "Training Session"}
                </div>
              </div>
              {rating > 0 && (
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 16,
                        color:
                          s <= rating ? "#FBBF24" : "rgba(255,255,255,0.25)",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ background: "white", padding: "20px 24px 24px" }}>
            {/* Stats Row */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: "#F0FDF4",
                  borderRadius: 14,
                  padding: "12px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}
                >
                  {completedCount}/{totalCount}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#15803D",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  ท่าที่สำเร็จ
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  background:
                    completionPercent === 100
                      ? "linear-gradient(135deg, #F0FDF4, #DCFCE7)"
                      : "#FFF7ED",
                  borderRadius: 14,
                  padding: "12px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: completionPercent === 100 ? "#166534" : "#C2410C",
                  }}
                >
                  {completionPercent}%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    marginTop: 2,
                    color: completionPercent === 100 ? "#15803D" : "#EA580C",
                  }}
                >
                  สำเร็จ
                </div>
              </div>
            </div>

            {/* Exercise List */}
            {exercises.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  <span style={{ fontSize: 14 }}>💪</span>
                  รายการท่าฝึก
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {exercises.slice(0, 8).map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        background: ex.completed ? "#F0FDF4" : "#F8FAFC",
                        borderRadius: 10,
                        border: `1px solid ${ex.completed ? "#BBF7D0" : "#E2E8F0"}`,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        {ex.completed ? "✅" : "⬜"}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1E293B",
                        }}
                      >
                        {ex.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#94A3B8",
                          fontWeight: 500,
                        }}
                      >
                        {ex.setsCount} sets
                      </span>
                    </div>
                  ))}
                  {exercises.length > 8 && (
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        color: "#94A3B8",
                        padding: 4,
                      }}
                    >
                      +{exercises.length - 8} ท่าเพิ่มเติม
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trainer Comment */}
            {comment && (
              <div
                style={{
                  background: "#EFF6FF",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 12,
                  borderLeft: "3px solid #3B82F6",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#1D4ED8",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  💬 ความเห็นจากเทรนเนอร์
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#1E40AF",
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {comment}
                </div>
              </div>
            )}

            {/* Next Goals */}
            {nextGoals && (
              <div
                style={{
                  background: "#FFF7ED",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 12,
                  borderLeft: "3px solid #F97316",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#C2410C",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  🎯 เป้าหมายครั้งต่อไป
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#9A3412",
                    lineHeight: 1.5,
                    fontWeight: 500,
                    whiteSpace: "pre-line",
                  }}
                >
                  {nextGoals}
                </div>
              </div>
            )}

            {/* Footer Branding */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "linear-gradient(135deg, #002140, #FF6B35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  F
                </div>
                <span
                  style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}
                >
                  FitPro Trainer
                </span>
              </div>
              <span style={{ fontSize: 10, color: "#CBD5E1" }}>fitpro.app</span>
            </div>
          </div>
        </div>

        {/* === Action Buttons (ไม่อยู่ใน capture) === */}
        <div className="flex items-center gap-3 w-full max-w-[420px]">
          <Button
            onClick={handleDownload}
            disabled={exporting}
            className="flex-1 h-12 bg-[#002140] hover:bg-[#003a6b] text-white rounded-2xl font-bold text-sm shadow-lg gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            ดาวน์โหลดรูป
          </Button>
          <Button
            onClick={handleCopy}
            disabled={exporting}
            variant="outline"
            className="h-12 px-5 rounded-2xl border-2 border-slate-200 font-bold text-sm gap-2"
          >
            <Copy className="h-4 w-4" />
            คัดลอก
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-12 w-12 rounded-2xl text-slate-400 hover:text-slate-600 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
