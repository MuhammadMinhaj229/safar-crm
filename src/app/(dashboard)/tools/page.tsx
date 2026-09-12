import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Zap, Share2, BarChart } from "lucide-react";
import Link from "next/link";

export default function ToolsPage() {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground mt-2">
            Access professional tools and utilities powered by Alif Growth Media.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="https://invofy-lh33t1c53-mohammed-minhajs-projects-8071d846.vercel.app/en" target="_blank" rel="noopener noreferrer" className="group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md bg-card/50 hover:bg-card">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-5" />
                  </div>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                </div>
                <CardTitle className="text-xl">Safar Invoify</CardTitle>
                <CardDescription className="line-clamp-2">
                  Professional invoice generator. Create, customize, and download beautiful PDF invoices directly in your browser.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-medium text-muted-foreground flex items-center">
                  Powered by Alif Growth Media
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="https://safar-postiz.vercel.app" target="_blank" rel="noopener noreferrer" className="group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md bg-card/50 hover:bg-card">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 w-fit rounded-lg bg-blue-500/10 text-blue-500">
                    <Share2 className="size-5" />
                  </div>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                </div>
                <CardTitle className="text-xl">Social Media Hub</CardTitle>
                <CardDescription className="line-clamp-2">
                  Combine and manage all your social media platforms in one place. Schedule posts and track engagement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-medium text-muted-foreground flex items-center">
                  Powered by Alif Growth Media
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="#" target="_blank" rel="noopener noreferrer" className="group">
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md bg-card/50 hover:bg-card">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-500">
                    <BarChart className="size-5" />
                  </div>
                  <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                </div>
                <CardTitle className="text-xl">Business Intelligence</CardTitle>
                <CardDescription className="line-clamp-2">
                  Powerful analytics and Power BI dashboards. Visualize your CRM data to drive growth and insights.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-medium text-muted-foreground flex items-center">
                  Powered by Alif Growth Media
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
