"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Loader2,
  Star,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
} from "lucide-react";

type Feedback = {
  id: string;
  service_request_id: string | null;
  customer_name: string | null;
  rating: number;
  comments: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  service_requests?: {
    request_id: string;
    contacts?: {
      safar_customer_id: string;
      name: string;
    } | null;
  } | null;
};

const PAGE_SIZE = 25;

export default function ReviewsPage() {
  const supabase = createClient();

  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ customer_name: "", rating: 5, comments: "" });

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ customer_name: "", rating: 5, comments: "", status: "approved" });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const term = search.trim();

    let query = supabase
      .from("customer_feedback")
      .select("*, service_requests(request_id, contacts(safar_customer_id, name))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (term) {
      const like = `%${term}%`;
      query = query.or(`customer_name.ilike.${like},comments.ilike.${like}`);
    }

    const { data, count, error } = await query;
    if (error) {
      toast.error("Failed to load reviews.");
    } else {
      setReviews(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase, page, search, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from("customer_feedback")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success(`Review marked as ${newStatus}.`);
      fetchReviews();
    }
  }

  function confirmDelete(review: Feedback) {
    setDeleteTarget(review);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("customer_feedback")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete review.");
    } else {
      toast.success("Review deleted.");
      fetchReviews();
    }
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteTarget(null);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  function openEdit(review: Feedback) {
    setEditTarget(review);
    setEditForm({
      customer_name: review.customer_name || "",
      rating: review.rating,
      comments: review.comments || "",
    });
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditing(true);
    const { error } = await supabase
      .from("customer_feedback")
      .update({
        customer_name: editForm.customer_name,
        rating: editForm.rating,
        comments: editForm.comments,
      })
      .eq("id", editTarget.id);

    if (error) {
      toast.error("Failed to update review.");
    } else {
      toast.success("Review updated.");
      fetchReviews();
      setEditOpen(false);
      setEditTarget(null);
    }
    setEditing(false);
  }

  async function handleAddSave() {
    setAdding(true);
    const { error } = await supabase
      .from("customer_feedback")
      .insert({
        customer_name: addForm.customer_name,
        rating: addForm.rating,
        comments: addForm.comments,
        status: addForm.status,
      });

    if (error) {
      toast.error("Failed to add review.");
    } else {
      toast.success("Review added.");
      fetchReviews();
      setAddOpen(false);
      setAddForm({ customer_name: "", rating: 5, comments: "", status: "approved" });
    }
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="size-6 text-primary" />
            Customer Reviews
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount > 0
              ? `${totalCount} review${totalCount !== 1 ? "s" : ""} collected`
              : "No reviews yet. Share your feedback link!"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          Add Review
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {["all", "pending", "approved", "rejected"].map((key) => (
          <button
            key={key}
            onClick={() => {
              setStatusFilter(key);
              setPage(0);
            }}
            className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
              statusFilter === key
                ? "bg-primary/10 text-primary border-primary/20 ring-2 ring-primary/30"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider">{key}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name or comments…"
            className="pl-8 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Customer</TableHead>
              <TableHead className="text-muted-foreground">Request ID</TableHead>
              <TableHead className="text-muted-foreground">Rating</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">Comments</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground hidden lg:table-cell">Date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading reviews…</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Star className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "No reviews match your search."
                        : "No reviews yet. Check back later!"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => {
                return (
                  <TableRow key={review.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">
                      {review.service_requests?.contacts?.name || review.customer_name || "Anonymous"}
                      {review.service_requests?.contacts?.safar_customer_id && (
                        <div className="text-xs text-muted-foreground">
                          {review.service_requests.contacts.safar_customer_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {review.service_requests?.request_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                          {review.service_requests.request_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-4 ${
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted border-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-[300px] truncate">
                      {review.comments || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          review.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : review.status === "rejected"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {review.status || "pending"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem
                            onClick={() => openEdit(review)}
                            className="text-foreground focus:bg-muted"
                          >
                            <Edit className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {review.status !== "approved" && (
                            <DropdownMenuItem
                              onClick={() => updateStatus(review.id, "approved")}
                              className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400"
                            >
                              <CheckCircle className="size-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {review.status !== "rejected" && (
                            <DropdownMenuItem
                              onClick={() => updateStatus(review.id, "rejected")}
                              className="text-amber-400 focus:bg-amber-500/10 focus:text-amber-400"
                            >
                              <XCircle className="size-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => confirmDelete(review)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="border-border text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="border-border text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">Delete Review</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this review? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">Edit Review</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify the review details before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={editForm.customer_name}
                onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={editForm.rating}
                onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) || 5 })}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                value={editForm.comments}
                onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                className="bg-card border-border min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editing}>
              {editing && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">Add Review</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manually add a customer review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={addForm.customer_name}
                onChange={(e) => setAddForm({ ...addForm, customer_name: e.target.value })}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={addForm.rating}
                onChange={(e) => setAddForm({ ...addForm, rating: parseInt(e.target.value) || 5 })}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                value={addForm.comments}
                onChange={(e) => setAddForm({ ...addForm, comments: e.target.value })}
                className="bg-card border-border min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button onClick={handleAddSave} disabled={adding}>
              {adding && <Loader2 className="size-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
