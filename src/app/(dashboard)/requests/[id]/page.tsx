import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ProviderTable } from '@/components/requests/provider-table';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ServiceCategoryPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch category
  const { data: category } = await supabase
    .from('safar_service_categories')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!category) {
    return notFound();
  }

  // Fetch providers for this category
  const { data: providers } = await supabase
    .from('safar_service_providers')
    .select('*')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="flex flex-col gap-4 p-4 lg:p-6">
        <div>
          <Link href="/requests" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ChevronLeft size={16} />
            Back to Directory
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
        </div>

        <div className="mt-4">
          <ProviderTable categoryId={category.id} initialProviders={providers || []} />
        </div>
      </div>
    </div>
  );
}
