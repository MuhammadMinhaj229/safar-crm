"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export default function FeedbackPage() {
  const params = useParams();
  const requestId = params.id as string;
  const supabase = createClient();

  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [rating, setRating] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [quality, setQuality] = useState(0);
  const [comments, setComments] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);

  useEffect(() => {
    async function fetchService() {
      if (!requestId) return;
      
      const { data, error } = await supabase
        .from("service_requests")
        .select(`
          id,
          service_definitions(service_name)
        `)
        .eq("id", requestId)
        .single();
        
      if (!error && data) {
        setServiceDetails(data);
      }
      setLoading(false);
    }
    fetchService();
  }, [requestId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please provide an overall rating.");
      return;
    }

    setSubmitting(true);
    
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_request_id: requestId,
          rating,
          timeliness_rating: timeliness,
          quality_rating: quality,
          comments,
          would_recommend: wouldRecommend
        })
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div className="flex flex-col space-y-2 mb-6">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-all hover:scale-110 focus:outline-none`}
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-200"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
          <p className="text-slate-600">Your feedback helps SAFAR N MANZIL serve you better.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-emerald-800 px-6 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
          <h1 className="relative z-10 text-3xl font-bold text-white tracking-tight">SAFAR N MANZIL</h1>
          <p className="relative z-10 text-emerald-100 mt-2 font-medium">Customer Feedback</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8">
          <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Service Details</h3>
            <p className="text-slate-900 font-medium text-lg">
              {serviceDetails?.service_definitions?.service_name || "Service Request"}
            </p>
            <p className="text-slate-500 text-sm mt-1">ID: {requestId}</p>
          </div>

          <StarRating value={rating} onChange={setRating} label="Overall Experience *" />
          
          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
            <StarRating value={timeliness} onChange={setTimeliness} label="Timeliness" />
            <StarRating value={quality} onChange={setQuality} label="Quality of Service" />
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-slate-700 block mb-2">Additional Comments</label>
            <Textarea 
              placeholder="Tell us what you liked or how we can improve..."
              className="w-full resize-none h-32 focus-visible:ring-emerald-600"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          <div className="mt-8 flex items-center space-x-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <input 
              type="checkbox" 
              id="recommend" 
              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              checked={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.checked)}
            />
            <label htmlFor="recommend" className="text-sm font-medium text-emerald-900 cursor-pointer">
              I would recommend SAFAR N MANZIL to other Gulf residents
            </label>
          </div>

          <div className="mt-10">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md transition-all shadow-emerald-900/20"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
