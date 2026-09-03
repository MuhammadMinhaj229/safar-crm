import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";

export function RecentFeedback() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeedback() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_feedback")
        .select(`
          id,
          rating,
          comments,
          created_at,
          service_requests(
            service_definitions(service_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setFeedback(data);
      }
      setLoading(false);
    }
    loadFeedback();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 mt-5">
        <div className="h-6 w-1/4 bg-slate-200 animate-pulse rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (feedback.length === 0) {
    return null; // Don't show the widget if there's no feedback yet
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm mt-5 overflow-hidden">
      <div className="p-6 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">Recent Customer Feedback</h3>
        <p className="text-sm text-muted-foreground mt-2">Latest service reviews from SAFAR N MANZIL customers.</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {feedback.map((item) => (
            <div key={item.id} className="flex items-start space-x-4 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex bg-yellow-50 p-2 rounded-lg items-center">
                <span className="text-yellow-600 font-bold mr-1">{item.rating}</span>
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {item.service_requests?.service_definitions?.service_name || "Service Request"}
                </p>
                {item.comments && (
                  <p className="text-sm text-slate-600 mt-1 italic">"{item.comments}"</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
