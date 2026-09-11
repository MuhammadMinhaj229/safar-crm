"use client";

import { useState } from "react";
import { Plus, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ProviderDialog } from "./provider-dialog";

export function ProviderTable({ categoryId, initialProviders }: { categoryId: string, initialProviders: any[] }) {
  const [providers, setProviders] = useState(initialProviders);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const supabase = createClient();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this service provider?")) return;
    
    try {
      const { error } = await supabase.from('safar_service_providers').delete().eq('id', id);
      if (error) throw error;
      setProviders((prev) => prev.filter(p => p.id !== id));
      toast.success("Provider removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingProvider(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service Provider
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length > 0 ? (
              providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.phone || '-'}</TableCell>
                  <TableCell>{p.location || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.notes || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-2 hover:bg-muted rounded-md cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingProvider(p); setDialogOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No service providers found. Add your first collaborated business!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProviderDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        categoryId={categoryId} 
        provider={editingProvider} 
        onSave={(saved: any) => {
          if (editingProvider) {
            setProviders(prev => prev.map(p => p.id === saved.id ? saved : p));
          } else {
            setProviders(prev => [saved, ...prev]);
          }
        }}
      />
    </div>
  );
}
