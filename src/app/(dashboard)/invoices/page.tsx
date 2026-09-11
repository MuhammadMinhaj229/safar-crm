'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SAFAR_SERVICES as SERVICE_OPTIONS } from "@/lib/safar-services";
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, ArrowRight } from 'lucide-react';
import type { Contact } from '@/types';

export default function NewServiceRequestPage() {
  const supabase = createClient();
  const { user } = useAuth();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [rate, setRate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchContacts() {
      setLoadingContacts(true);
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (debouncedSearch.trim()) {
        const like = `%${debouncedSearch.trim()}%`;
        query = query.or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`);
      }

      const { data } = await query;
      
      if (data) setContacts(data);
      setLoadingContacts(false);
    }
    fetchContacts();
  }, [supabase, debouncedSearch]);

  async function handleGenerateInvoice() {
    if (!selectedContactId) {
      toast.error('Please select a customer first.');
      return;
    }
    if (!serviceName.trim()) {
      toast.error('Please enter the service name.');
      return;
    }

    setSaving(true);
    try {
      const smSrvSuffix = Math.floor(100000 + Math.random() * 900000);
      const requestId = `SMSRV-${smSrvSuffix}`;
      
      const invoiceDetails = {
        service_name: serviceName.trim(),
        rate: Number(rate) || 0,
        quantity: Number(quantity) || 1,
        total: (Number(rate) || 0) * (Number(quantity) || 1)
      };

      const { error } = await supabase
        .from('service_requests')
        .insert({
          user_id: user?.id,
          contact_id: selectedContactId,
          request_id: requestId,
          status: 'quoting',
          notepad_content: { invoice_details: invoiceDetails }
        });

      if (error) throw error;

      toast.success('Service Request saved! Handoff to Invoice Generator...');
      
      // Navigate out to the decoupled invoicing app (Safar Invoify)
      window.open(`http://localhost:3001/?requestId=${requestId}`, '_blank');
      
      // Reset form
      setSelectedContactId('');
      setServiceName('');
      setRate('');
      setQuantity('1');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate request');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="size-6 text-primary" />
          New Service Request
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a customer and list the services provided. Clicking generate will securely handoff the data to the external SAFAR Invoicing App.
        </p>
      </div>

      <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
        
        {/* Customer Selection */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">1. Select Customer Directory</Label>
          <Input 
            placeholder="Search customer by name, phone, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card border-border"
          />
          <Select value={selectedContactId} onValueChange={(val) => setSelectedContactId(val || '')}>
            <SelectTrigger className="w-full bg-muted border-border">
              <SelectValue placeholder={loadingContacts ? "Searching..." : contacts.length === 0 ? "No customers found" : "Select a customer..."} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {contacts.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name || 'Unnamed'} {c.phone ? `— ${c.phone}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedContactId && (() => {
            const c = contacts.find(x => x.id === selectedContactId);
            if (!c) return null;
            return (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border text-sm">
                <h3 className="font-semibold text-foreground mb-2">Bill To Profile:</h3>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <p><strong className="text-foreground">Name:</strong> {c.name || 'N/A'}</p>
                  <p><strong className="text-foreground">Phone:</strong> {c.phone || 'N/A'}</p>
                  <p><strong className="text-foreground">Email:</strong> {c.email || 'N/A'}</p>
                  <p><strong className="text-foreground">Location:</strong> {(c as any).location || 'Unknown'}</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Invoice Fields */}
        <div className="space-y-4 pt-4 border-t border-border">
          <Label className="text-sm font-semibold">2. Invoice Details</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-3">
               <Label className="text-xs text-muted-foreground">Service / Item Name *</Label>
               <Select value={serviceName} onValueChange={(val) => setServiceName(val || '')}>
                 <SelectTrigger className="w-full bg-muted border-border">
                   <SelectValue placeholder="Select a service..." />
                 </SelectTrigger>
                 <SelectContent>
                   {SERVICE_OPTIONS.map(s => (
                     <SelectItem key={s} value={s}>{s}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <Label className="text-xs text-muted-foreground">Rate (Price)</Label>
               <Input 
                 type="number" 
                 value={rate} 
                 onChange={e => setRate(e.target.value)} 
                 placeholder="e.g. 150" 
                 className="bg-muted"
               />
            </div>
            <div className="space-y-2">
               <Label className="text-xs text-muted-foreground">Quantity</Label>
               <Input 
                 type="number" 
                 value={quantity} 
                 onChange={e => setQuantity(e.target.value)} 
                 placeholder="e.g. 1" 
                 className="bg-muted"
               />
            </div>
            <div className="space-y-2">
               <Label className="text-xs text-muted-foreground">Total Auto-Calculated</Label>
               <Input 
                 disabled 
                 value={(Number(rate) || 0) * (Number(quantity) || 1)} 
                 className="bg-muted/50 font-mono font-semibold" 
               />
            </div>
          </div>
        </div>

        {/* Handoff Action */}
        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleGenerateInvoice} 
            disabled={saving || !selectedContactId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 px-6 shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Generate Invoice in Safar Invoify
          </Button>
        </div>

      </div>
    </div>
  );
}
