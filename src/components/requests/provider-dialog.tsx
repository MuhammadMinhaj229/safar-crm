"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function ProviderDialog({ open, onOpenChange, categoryId, provider, onSave }: any) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { accountId } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setName(provider?.name || "");
      setPhone(provider?.phone || "");
      setLocation(provider?.location || "");
      setNotes(provider?.notes || "");
    }
  }, [open, provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        category_id: categoryId,
        account_id: accountId,
      };

      let res;
      if (provider) {
        const { data, error } = await supabase.from('safar_service_providers').update(payload).eq('id', provider.id).select();
        if (error) throw error;
        res = data?.[0] || { ...payload, id: provider.id };
      } else {
        const authUser = await supabase.auth.getUser();
        const insertPayload = { ...payload, user_id: authUser.data.user?.id };
        const { data, error } = await supabase.from('safar_service_providers').insert(insertPayload).select();
        if (error) throw error;
        res = data?.[0] || { ...insertPayload, id: crypto.randomUUID() };
      }

      toast.success(provider ? "Provider updated" : "Provider added");
      onSave(res);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save provider error:", error);
      toast.error(error.message || "Failed to save provider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{provider ? "Edit Service Provider" : "Add Service Provider"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Provider Name / Business Name *</Label>
            <Input id="p-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-phone">Phone Number</Label>
            <Input id="p-phone" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-location">Location / Area</Label>
            <Input id="p-location" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-notes">Notes / Collaboration details</Label>
            <Input id="p-notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
