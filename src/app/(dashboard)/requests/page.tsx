import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { SAFAR_SERVICES } from '@/lib/safar-services';
import { CreateCategoryDialog } from '@/components/requests/create-category-dialog';

export const dynamic = 'force-dynamic';

export default async function ServiceRequestsDirectory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from('safar_service_categories')
    .select('*')
    .order('created_at', { ascending: true });

  const displayCategories = categories || [];

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <div className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
        <h1 className="text-lg font-semibold tracking-tight">Vendors & Partners Directory</h1>
        <CreateCategoryDialog />
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayCategories.length > 0 ? (
            displayCategories.map((category) => (
              <Link href={`/requests/${category.id}`} key={category.id}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-md text-primary">
                        <UsersRound size={20} />
                      </div>
                      <CardTitle className="text-base leading-tight">
                        {category.name}
                      </CardTitle>
                    </div>
                    {category.description && (
                      <CardDescription className="line-clamp-2">
                        {category.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              <UsersRound className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm">No service categories found.</p>
              <p className="text-xs mt-1 max-w-md mx-auto mb-4">Please apply the latest Supabase migration to initialize your tables, then click "Add Custom Service".</p>
              <form action={async () => {
                'use server';
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();
                const { data: profile } = await supabase.from('profiles').select('account_id').eq('user_id', user?.id).single();
                
                if (user && profile) {
                  for (const s of SAFAR_SERVICES) {
                    await supabase.from('safar_service_categories').insert({
                      name: s.split(' - ')[0],
                      description: s.split(' - ')[1],
                      account_id: profile.account_id,
                      user_id: user.id
                    });
                  }
                }
              }}>
                <Button variant="outline" size="sm">Seed Default Services</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
