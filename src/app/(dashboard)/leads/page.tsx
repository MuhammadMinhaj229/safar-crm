"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { LeadForm, type Lead } from "@/components/leads/lead-form";

const PAGE_SIZE = 25;

const STATUS_CONFIG: Record<
  Lead["status"],
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  contacted: {
    label: "Contacted",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  qualified: {
    label: "Qualified",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  converted: {
    label: "Converted",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  lost: {
    label: "Lost",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const SOURCE_CONFIG: Record<
  Lead["source"],
  { label: string; className: string }
> = {
  website: {
    label: "🌐 Website",
    className: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  whatsapp: {
    label: "💬 WhatsApp",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  manual: {
    label: "✍️ Manual",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export default function LeadsPage() {
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Lead["status"] | "all">("all");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const term = search.trim();

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (term) {
      const like = `%${term}%`;
      query = query.or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like},service_interest.ilike.${like}`);
    }

    const { data, count, error } = await query;
    if (error) {
      toast.error("Failed to load leads.");
    } else {
      setLeads(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase, page, search, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function openAdd() {
    setEditLead(null);
    setFormOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditLead(lead);
    setFormOpen(true);
  }

  function confirmDelete(lead: Lead) {
    setDeleteTarget(lead);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("leads").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete lead.");
    } else {
      toast.success("Lead deleted.");
      fetchLeads();
    }
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteTarget(null);
  }

  function confirmConvert(lead: Lead) {
    setConvertTarget(lead);
    setConvertOpen(true);
  }

  async function handleConvert() {
    if (!convertTarget) return;
    setConverting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");

      // Get account_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("user_id", userData.user.id)
        .single();
      
      const accountId = profile?.account_id;
      if (!accountId) throw new Error("Account not found");

      // 1. Insert into contacts (DB trigger will automatically assign safar_customer_id)
      const { data: newContact, error: contactError } = await supabase.from("contacts").insert([{
        user_id: userData.user.id,
        account_id: accountId,
        name: convertTarget.name,
        phone: convertTarget.phone ?? "0000000000",
        email: convertTarget.email ?? null,
      }]).select("id, safar_customer_id").single();
      
      if (contactError || !newContact) throw contactError || new Error("Failed to create contact");

      // 2. Save basic info in contact notes
      await supabase.from("contact_notes").insert([{
        user_id: userData.user.id,
        account_id: accountId,
        contact_id: newContact.id,
        note_text: `Customer ID: ${newContact.safar_customer_id}\nLocation: ${convertTarget.location || 'Unknown'}\nService Interest: ${convertTarget.service_interest || 'None'}`
      }]);

      // Spawn a service request if there is a service interest
      if (convertTarget.service_interest) {
        const smSrvSuffix = Math.floor(100000 + Math.random() * 900000);
        const reqId = `SMSRV-${smSrvSuffix}`;
        await supabase.from("service_requests").insert([{
          user_id: userData.user.id,
          contact_id: newContact.id,
          request_id: reqId,
          status: "triage",
          notepad_content: {
            invoice_details: {
              service_name: convertTarget.service_interest,
              rate: 0,
              quantity: 1,
              total: 0
            }
          }
        }]);
      }

      // Update lead status to converted
      await supabase
        .from("leads")
        .update({ status: "converted" })
        .eq("id", convertTarget.id);

      toast.success(`${convertTarget.name} converted to customer! ✅`);
      fetchLeads();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Conversion failed.";
      toast.error(message);
    } finally {
      setConverting(false);
      setConvertOpen(false);
      setConvertTarget(null);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const statusCounts = {
    new: leads.filter((l) => l.status === "new").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="size-6 text-primary" />
            Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount > 0
              ? `${totalCount} lead${totalCount !== 1 ? "s" : ""} — potential customers from website & WhatsApp`
              : "No leads yet. Share your website to start capturing leads."}
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
        >
          <Plus className="size-4" />
          Add Lead
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-3">
        {(Object.entries(STATUS_CONFIG) as [Lead["status"], typeof STATUS_CONFIG[Lead["status"]]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(statusFilter === key ? "all" : key); setPage(0); }}
            className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
              statusFilter === key
                ? `${cfg.className} ring-2 ring-primary/30`
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider">{cfg.label}</p>
            <p className="text-2xl font-bold mt-1">
              {statusFilter === key || statusFilter === "all"
                ? leads.filter((l) => l.status === key).length
                : "—"}
            </p>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, phone, service…"
            className="pl-8 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {statusFilter !== "all" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="border-border text-muted-foreground hover:bg-muted shrink-0 self-center"
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Phone</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">Service Interest</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Source</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground hidden lg:table-cell">Date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading leads…</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "No leads match your search."
                        : "No leads yet. Add one manually or share your website!"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAdd}
                      className="mt-2 border-border text-muted-foreground hover:bg-muted"
                    >
                      <Plus className="size-3.5" />
                      Add first lead
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const statusCfg = STATUS_CONFIG[lead.status];
                const sourceCfg = SOURCE_CONFIG[lead.source];
                return (
                  <TableRow key={lead.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-foreground">
                      {lead.name}
                      {lead.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.email}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {lead.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-[180px] truncate">
                      {lead.service_interest ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceCfg.className}`}
                      >
                        {sourceCfg.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                      {new Date(lead.created_at).toLocaleDateString("en-US", {
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
                            onClick={() => openEdit(lead)}
                            className="text-popover-foreground focus:bg-muted"
                          >
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          {lead.status !== "converted" && (
                            <DropdownMenuItem
                              onClick={() => confirmConvert(lead)}
                              className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400"
                            >
                              <UserCheck className="size-4" />
                              Convert to Customer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => confirmDelete(lead)}
                          >
                            <Trash2 className="size-4" />
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

      {/* Lead Form Modal */}
      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editLead}
        onSaved={fetchLeads}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">Delete Lead</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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

      {/* Convert to Customer Confirmation */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-400" />
              Convert to Customer
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will add <strong>{convertTarget?.name}</strong> to your Contacts (Customers) and mark this lead as Converted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={converting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {converting && <Loader2 className="size-4 animate-spin" />}
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
