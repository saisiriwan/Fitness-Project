import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ChevronLeft,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/page/Trainer/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

import type { Client } from "../ClientProfilePage";

interface ClientNotesProps {
  client: Client;
}

interface Note {
  id: number;
  content: string;
  type: string;
  created_at: string;
  created_by: string;
}

export default function ClientNotes({ client }: ClientNotesProps) {
  const { user } = useAuth();
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    if (!client?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/clients/${client.id}/notes`);
      setNotes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notes", err);
      toast.error("โหลดข้อมูลโน้ตไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [client?.id]);

  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error("กรุณากรอกเนื้อหาโน้ต");
      return;
    }

    try {
      if (editingNote) {
        // Edit Mode
        const res = await api.put(`/notes/${editingNote.id}`, {
          content: newNoteContent,
          type: "general",
          updated_by: user?.name || "Trainer",
        });

        setNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? res.data : n)),
        );
        toast.success("แก้ไขโน้ตเรียบร้อยแล้ว");
      } else {
        // Add Mode
        const res = await api.post(`/clients/${client.id}/notes`, {
          content: newNoteContent,
          type: "general",
          created_by: user?.name || "Trainer",
        });
        setNotes((prev) => [res.data, ...prev]);
        toast.success("เพิ่มโน้ตเรียบร้อยแล้ว");
      }

      setShowAddNoteDialog(false);
      setNewNoteContent("");
      setEditingNote(null);
    } catch (err) {
      toast.error(editingNote ? "แก้ไขโน้ตไม่สำเร็จ" : "บันทึกโน้ตไม่สำเร็จ");
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      await api.delete(`/notes/${noteToDelete}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      toast.success("ลบโน้ตเรียบร้อยแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("ลบโน้ตไม่สำเร็จ");
    } finally {
      setShowDeleteAlert(false);
      setNoteToDelete(null);
    }
  };

  const openAddDialog = () => {
    setEditingNote(null);
    setNewNoteContent("");
    setShowAddNoteDialog(true);
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setNewNoteContent(note.content);
    setShowAddNoteDialog(true);
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFirstLine = (content: string) => {
    const lines = content.split("\n");
    return lines[0] || content;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Search Bar & Add Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="ค้นหาโน้ต..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 focus:ring-primary/10 rounded-xl transition-all h-10 w-full text-sm"
              />
            </div>
            <Button
              className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 rounded-xl px-6 h-10 font-medium shrink-0"
              onClick={openAddDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มโน้ต
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            บันทึกทั้งหมด{" "}
            <span className="text-muted-foreground/70 font-normal">
              ({filteredNotes.length})
            </span>
          </h2>
        </div>

        {/* Notes List */}
        <div className="bg-card rounded-2xl border border-border divide-y divide-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse">
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="bg-muted p-4 rounded-full">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  {searchQuery ? "ไม่พบโน้ตที่ค้นหา" : "ยังไม่มีบันทึก"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "ลองใช้คำค้นหาอื่น"
                    : "เริ่มจดบันทึกแรกของคุณได้เลย"}
                </p>
              </div>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="px-6 py-5 hover:bg-muted/30 transition-colors flex justify-between items-start group"
              >
                <div className="flex-1 mr-4 space-y-1">
                  <h3 className="text-base font-medium text-foreground line-clamp-1">
                    {getFirstLine(note.content)}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatNoteDate(note.created_at)}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => openEditDialog(note)}
                      className="cursor-pointer rounded-lg"
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setNoteToDelete(note.id);
                        setShowDeleteAlert(true);
                      }}
                      className="text-destructive focus:text-destructive cursor-pointer rounded-lg"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      ลบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
              {editingNote ? "แก้ไขบันทึก" : "บันทึกใหม่"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingNote
                ? "อัปเดตข้อมูลบันทึกของคุณ"
                : "เพิ่มรายละเอียดหรือข้อสังเกตเกี่ยวกับลูกค้า"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="เขียนรายละเอียดที่นี่..."
              rows={8}
              className="resize-none bg-muted/30 border-input focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-xl text-sm leading-relaxed p-4"
              autoFocus
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddNoteDialog(false);
                  setNewNoteContent("");
                  setEditingNote(null);
                }}
                className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveNote}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 font-medium px-6"
              >
                {editingNote ? "บันทึกการแก้ไข" : "สร้างบันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              ยืนยันการลบ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              คุณต้องการลบบันทึกนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-border text-foreground font-medium hover:bg-muted">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-medium shadow-lg shadow-destructive/20 border-0"
            >
              ลบทิ้ง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
