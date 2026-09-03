"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface Lead {
  id: string;
  account_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_interest: string | null;
  notes: string | null;
  source: "website" | "whatsapp" | "manual";
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  created_at: string;
  updated_at: string;
}

const SERVICE_OPTIONS = [
  "Packing Materials (Boxes, Bags, Scales)",
  "Home Packing Assistance",
  "Flight Tickets",
  "Visa / Document Guidance",
  "Airport Taxi / Transport",
  "Homemade Food (Pickles, Spices)",
  "Family Grocery Delivery (India)",
  "Home Repair Coordination",
  "Gift Sourcing",
  "Medical Coordination",
  "Local Delivery / Errands",
  "Other",
];

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSaved: () => void;
}

export function LeadForm({ open, onOpenChange, lead, onSaved }: LeadFormProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<Lead["source"]>("manual");
  const [status, setStatus] = useState<Lead["status"]>("new");

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone ?? "");
      setEmail(lead.email ?? "");
      setServiceInterest(lead.service_interest ?? "");
      setNotes(lead.notes ?? "");
      setSource(lead.source);
      setStatus(lead.status);
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setServiceInterest("");
      setNotes("");
      setSource("manual");
      setStatus("new");
    }
  }, [lead, open]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        service_interest: serviceInterest || null,
        notes: notes.trim() || null,
        source,
        status,
      };

      let error;
      if (lead) {
        ({ error } = await supabase.from("leads").update(payload).eq("id", lead.id));
      } else {
        // Get account_id from the current user's account
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error("Not authenticated."); return; }
        const { data: member } = await supabase
          .from("account_members")
          .select("account_id")
          .eq("profile_id", user.id)
          .single();
        if (!member) { toast.error("Account not found."); return; }
        ({ error } = await supabase.from("leads").insert([{ ...payload, account_id: member.account_id }]));
      }

      if (error) {
        toast.error("Failed to save lead: " + error.message);
      } else {
        toast.success(lead ? "Lead updated." : "Lead created.");
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";
  const inputClass = "bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary";
  const selectClass = "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground text-lg font-bold">
            {lead ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div>
            <label className={labelClass}>Full Name *</label>
            <Input
              className={inputClass}
              placeholder="e.g. Ahmed Al-Rashidi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>WhatsApp / Phone</label>
            <Input
              className={inputClass}
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email (optional)</label>
            <Input
              className={inputClass}
              type="email"
              placeholder="e.g. ahmed@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Service Interest */}
          <div>
            <label className={labelClass}>Service Interest</label>
            <select
              className={selectClass}
              value={serviceInterest}
              onChange={(e) => setServiceInterest(e.target.value)}
            >
              <option value="">Select a service...</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Source + Status side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Source</label>
              <select
                className={selectClass}
                value={source}
                onChange={(e) => setSource(e.target.value as Lead["source"])}
              >
                <option value="website">🌐 Website</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="manual">✍️ Manual</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as Lead["status"])}
              >
                <option value="new">🆕 New</option>
                <option value="contacted">📞 Contacted</option>
                <option value="qualified">✅ Qualified</option>
                <option value="converted">🏆 Converted</option>
                <option value="lost">❌ Lost</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${selectClass} min-h-[80px] resize-none`}
              placeholder="Any additional context about this lead..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {lead ? "Save Changes" : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
