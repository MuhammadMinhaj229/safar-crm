"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Mail, MapPin, Calendar, IndianRupee, Package, Receipt, TrendingUp, User, Trash2, Pencil, Save, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  service_code: string | null;
  total_amount: number | null;
  currency: string | null;
  status: string;
  created_at: string;
  line_items: Array<{ name: string; quantity: number; unitPrice: number; total: number }> | null;
  raw_note: string;
}

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  location?: string | null;
  created_at: string;
  safar_customer_id?: string | null;
  contact_notes?: Array<{ note_text: string; created_at: string }>;
}

interface CustomerDirectoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-500/15 text-green-400 border-green-500/30",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DRAFT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, string> = {
  PAID: "✅",
  SENT: "📤",
  DRAFT: "📝",
  CANCELLED: "❌",
};

export function CustomerDirectory({ open, onOpenChange, contact }: CustomerDirectoryProps) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [custId, setCustId] = useState<string>("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    invoice_number: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    service_code: "",
    total_amount: "",
    currency: "INR",
    status: "PAID",
    itemsText: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openServiceForm = (inv?: Invoice) => {
    if (inv) {
      setEditInvoice(inv);
      setServiceForm({
        invoice_number: inv.invoice_number === 'Unknown' ? '' : inv.invoice_number,
        invoice_date: inv.invoice_date || format(new Date(), "yyyy-MM-dd"),
        service_code: inv.service_code || "",
        total_amount: String(inv.total_amount || ""),
        currency: inv.currency || "INR",
        status: inv.status || "PAID",
        itemsText: inv.line_items?.map(i => `${i.name} (x${i.quantity}) = ${i.total}`).join('\n') || ""
      });
    } else {
      setEditInvoice(null);
      setServiceForm({
        invoice_number: `MANUAL-${Math.floor(Math.random()*10000)}`,
        invoice_date: format(new Date(), "yyyy-MM-dd"),
        service_code: "",
        total_amount: "",
        currency: "INR",
        status: "PAID",
        itemsText: ""
      });
    }
    setServiceFormOpen(true);
  };

  const fetchInvoices = useCallback(async () => {
    if (!contact) return;
    setLoading(true);

    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false });

    setInvoices((data ?? []) as Invoice[]);

    // Extract customer ID from notes
    const noteWithId = contact.contact_notes?.find((n) => n.note_text?.includes("Customer ID:"));
    const match = noteWithId?.note_text?.match(/Customer ID:\s*(CUS_SNM-\d+)/);
    setCustId(match?.[1] ?? contact.safar_customer_id ?? "");
    setLoading(false);
  }, [contact, supabase]);

  useEffect(() => {
    if (open && contact) {
      fetchInvoices();
    }
  }, [open, contact, fetchInvoices]);

  const totalSpent = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + (i.total_amount ?? 0), 0);

  const location = contact?.location || contact?.contact_notes?.find(
    (n) => n.note_text?.includes("Location:")
  )?.note_text?.match(/Location:\s*(.+)/)?.[1]?.trim();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try { return format(parseISO(dateStr), "dd MMM yyyy"); }
    catch { return dateStr; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("invoices").delete().eq("id", deleteId);
    if (error) {
      toast.error("Failed to delete service history");
    } else {
      toast.success("Service history deleted");
      fetchInvoices();
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const handleSaveService = async () => {
    if (!contact) return;
    setSavingEdit(true);

    const formattedDate = serviceForm.invoice_date 
      ? format(new Date(serviceForm.invoice_date), "yyyy-MM-dd") 
      : format(new Date(), "yyyy-MM-dd");
    
    let line_items: any[] = [];
    if (serviceForm.itemsText) {
      const lines = serviceForm.itemsText.split('\n').filter(Boolean);
      lines.forEach(line => {
        if (line.includes('(x')) {
            const m = line.match(/(.*) \(x(\d+)\) = ([\d.]+)/);
            if (m) {
                line_items.push({ name: m[1].trim(), quantity: parseInt(m[2], 10), unitPrice: 0, total: parseFloat(m[3]) });
            } else {
                line_items.push({ name: line.trim(), quantity: 1, unitPrice: 0, total: 0 });
            }
        } else {
           line_items.push({ name: line.trim(), quantity: 1, unitPrice: 0, total: parseFloat(serviceForm.total_amount || "0") });
        }
      });
    }

    const payload = {
        invoice_number: serviceForm.invoice_number || 'MANUAL',
        invoice_date: formattedDate,
        total_amount: parseFloat(serviceForm.total_amount || "0"),
        currency: serviceForm.currency || 'INR',
        service_code: serviceForm.service_code || 'Custom Service',
        line_items,
        status: serviceForm.status || 'PAID'
    };

    if (editInvoice) {
      const { error } = await supabase
        .from("invoices")
        .update(payload)
        .eq("id", editInvoice.id);
      
      if (error) toast.error("Failed to update service history");
      else {
        toast.success("Service history updated");
        fetchInvoices();
        setServiceFormOpen(false);
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: c } = await supabase.from('contacts').select('account_id').eq('id', contact.id).single();
      
      const { error } = await supabase.from("invoices").insert({
        contact_id: contact.id,
        user_id: userData?.user?.id,
        account_id: c?.account_id,
        ...payload
      });

      if (error) toast.error("Failed to add service history");
      else {
        toast.success("Service history added");
        fetchInvoices();
        setServiceFormOpen(false);
      }
    }
    setSavingEdit(false);
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl bg-background border-border p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
              <User className="size-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-foreground text-xl font-bold truncate">
                {contact?.name ?? "Unknown Customer"}
              </SheetTitle>
              {custId && (
                <span className="inline-block mt-1 font-mono text-xs font-bold px-2.5 py-1 bg-primary/15 text-primary rounded-full border border-primary/25">
                  {custId}
                </span>
              )}
            </div>
          </div>

          {/* Contact details row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {contact?.phone && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="size-3.5" />
                {contact.phone}
              </span>
            )}
            {contact?.email && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" />
                {contact.email}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {location}
              </span>
            )}
            {contact?.created_at && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                Customer since {formatDate(contact.created_at)}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-border mx-0">
          <StatCard
            icon={<Receipt className="size-4 text-blue-400" />}
            label="Total Services"
            value={String(invoices.length)}
          />
          <StatCard
            icon={<IndianRupee className="size-4 text-green-400" />}
            label="Total Spent"
            value={`₹${totalSpent.toLocaleString("en-IN")}`}
          />
          <StatCard
            icon={<TrendingUp className="size-4 text-purple-400" />}
            label="Last Service"
            value={invoices[0] ? formatDate(invoices[0].invoice_date ?? invoices[0].created_at) : "—"}
          />
        </div>

        {/* Invoice History */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Service History
            </h3>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openServiceForm()}>
              Add Service
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading service history...
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
                <Receipt className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No services yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate an invoice in Safar Invoify and it will appear here automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv, idx) => (
                <InvoiceRow 
                  key={inv.id} 
                  invoice={inv} 
                  index={idx} 
                  formatDate={formatDate} 
                  onDelete={() => setDeleteId(inv.id)}
                  onEdit={() => openServiceForm(inv)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Delete Confirmation */}
    <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle>Delete Service History</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this service record? This action cannot be undone.
        </p>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Service Form Dialog */}
    <Dialog open={serviceFormOpen} onOpenChange={(o) => !o && setServiceFormOpen(false)}>
      <DialogContent className="sm:max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle>{editInvoice ? "Edit Service History" : "Add Service History"}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={serviceForm.invoice_date} onChange={(e) => setServiceForm({...serviceForm, invoice_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Invoice/Ref Number</Label>
              <Input value={serviceForm.invoice_number} onChange={(e) => setServiceForm({...serviceForm, invoice_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input type="number" value={serviceForm.total_amount} onChange={(e) => setServiceForm({...serviceForm, total_amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Service Code / Name</Label>
              <Input value={serviceForm.service_code} onChange={(e) => setServiceForm({...serviceForm, service_code: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                value={serviceForm.status}
                onChange={(e) => setServiceForm({...serviceForm, status: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="UNPAID">Unpaid</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Line Items (Optional)</Label>
            <Textarea 
              value={serviceForm.itemsText}
              onChange={(e) => setServiceForm({...serviceForm, itemsText: e.target.value})}
              className="min-h-[100px] bg-muted/50 border-border"
              placeholder="e.g. Flight Booking"
            />
            <p className="text-xs text-muted-foreground">Each line will be saved as a separate item.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setServiceFormOpen(false)} disabled={savingEdit}>
            Cancel
          </Button>
          <Button onClick={handleSaveService} disabled={savingEdit}>
            {savingEdit ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-background px-3 py-3 text-center">
      {icon}
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InvoiceRow({
  invoice,
  index,
  formatDate,
  onDelete,
  onEdit
}: {
  invoice: Invoice;
  index: number;
  formatDate: (d: string | null) => string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = STATUS_COLORS[invoice.status] ?? "bg-muted text-muted-foreground";
  const statusIcon = STATUS_ICONS[invoice.status] ?? "❓";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden group">
      <div className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors relative">
        {/* Timeline dot */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="size-2.5 rounded-full bg-primary" />
          {index < 999 && <div className="w-px flex-1 bg-border" style={{ minHeight: 8 }} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-foreground">{invoice.invoice_number}</span>
            {invoice.service_code && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                {invoice.service_code}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colorClass}`}>
              {statusIcon} {invoice.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(invoice.invoice_date ?? invoice.created_at)}
            {invoice.line_items?.[0]?.name && ` · ${invoice.line_items[0].name}`}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="font-bold text-foreground">
            ₹{(invoice.total_amount ?? 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-primary transition-all rounded hover:bg-primary/10"
              title="Edit service record"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded hover:bg-destructive/10"
              title="Delete service record"
            >
              <Trash2 className="size-3.5" />
            </button>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-muted-foreground hover:text-foreground transition-all rounded hover:bg-muted"
            >
              <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded line items */}
      {expanded && invoice.line_items && invoice.line_items.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left pb-1 font-medium">Item</th>
                <th className="text-right pb-1 font-medium">Qty</th>
                <th className="text-right pb-1 font-medium">Unit</th>
                <th className="text-right pb-1 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.line_items.map((item, i) => (
                <tr key={i} className="text-foreground">
                  <td className="py-1 pr-2 font-medium">{item.name}</td>
                  <td className="py-1 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-1 text-right text-muted-foreground">₹{item.unitPrice}</td>
                  <td className="py-1 text-right font-semibold">₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
