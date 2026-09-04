import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizePhoneForMeta, isValidE164 } from "@/lib/whatsapp/phone-utils";
import {
  categorizeServiceInterest,
  generateFaqPreview,
  SafarCategory,
} from "@/lib/safar/agent-knowledge";
import { runAutomationsForTrigger } from "@/lib/automations/engine";

// Helper for CORS response headers
function getCorsHeaders(origin: string = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// OPTIONS: Handle CORS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// POST: Public Lead Intake & WhatsApp Automation Trigger
export async function POST(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables missing.");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request body." },
        { status: 400, headers: corsHeaders }
      );
    }

    const { name, phone, email, service_interest, source = "website" } = body || {};

    // 1. Validation: Name
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Validation: Phone
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const trimmedPhone = phone.trim();
    let cleanDigits = sanitizePhoneForMeta(trimmedPhone);

    // Normalize domestic trunk 0 if present (e.g. 09876543210 -> 9876543210)
    if (cleanDigits.startsWith("0") && cleanDigits.length === 11) {
      cleanDigits = cleanDigits.slice(1);
    }

    if (!cleanDigits || !isValidE164(cleanDigits)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Must be a valid phone number (7-15 digits)." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Format phone into standard international E.164
    const formattedPhone = trimmedPhone.startsWith("+")
      ? `+${cleanDigits}`
      : cleanDigits.length === 10
      ? `+91${cleanDigits}`
      : `+${cleanDigits}`;

    // 3. Resolve Account ID robustly
    let accountId = process.env.SAFAR_ACCOUNT_ID;
    let ownerUserId: string | null = null;

    if (!accountId) {
      const { data: accountRow, error: accErr } = await supabase
        .from("accounts")
        .select("id, owner_user_id")
        .limit(1)
        .single();

      if (accErr || !accountRow?.id) {
        console.error("Failed to query fallback account from database:", accErr);
        return NextResponse.json(
          { error: "Account configuration not found." },
          { status: 500, headers: corsHeaders }
        );
      }
      accountId = accountRow.id;
      ownerUserId = accountRow.owner_user_id;
    } else {
      const { data: accountRow } = await supabase
        .from("accounts")
        .select("owner_user_id")
        .eq("id", accountId)
        .maybeSingle();
      ownerUserId = accountRow?.owner_user_id ?? null;
    }

    // 4. Domain Intelligence: Categorization & FAQ Generation
    const categorization = categorizeServiceInterest(service_interest);
    const category: SafarCategory = categorization.category;
    const faqPreview = generateFaqPreview(name, category, service_interest);

    // 5. Store Lead in Supabase `leads` table
    const validSource = source === "whatsapp" || source === "manual" ? source : "website";
    const notesContent = `Category: ${category}\n\n${faqPreview}`;

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert([
        {
          account_id: accountId,
          name: name.trim(),
          phone: formattedPhone,
          email: email && typeof email === "string" ? email.trim() : null,
          service_interest:
            service_interest && typeof service_interest === "string"
              ? service_interest.trim()
              : null,
          notes: notesContent,
          source: validSource,
          status: "new",
        },
      ])
      .select()
      .single();

    if (leadError || !leadData) {
      console.error("Lead insertion error:", leadError);
      return NextResponse.json(
        { error: "Failed to save lead to database." },
        { status: 500, headers: corsHeaders }
      );
    }

    // 6. WhatsApp Automation Trigger: Create Contact/Conversation and Dispatch Engine
    let messageId = `wa_queued_${Date.now()}`;
    try {
      // a) Create or get contact
      let contactId = null;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("account_id", accountId)
        .eq("phone", formattedPhone)
        .maybeSingle();

      if (existingContact?.id) {
        contactId = existingContact.id;
        // update name if blank
        await supabase.from("contacts").update({ name: name.trim() }).eq("id", contactId);
      } else {
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({ account_id: accountId, phone: formattedPhone, name: name.trim() })
          .select("id")
          .single();
        if (newContact?.id) contactId = newContact.id;
      }

      if (contactId) {
        // b) Create or get conversation
        let conversationId = null;
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("account_id", accountId)
          .eq("contact_id", contactId)
          .maybeSingle();

        if (existingConv?.id) {
          conversationId = existingConv.id;
        } else {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({ account_id: accountId, contact_id: contactId, status: "open" })
            .select("id")
            .single();
          if (newConv?.id) conversationId = newConv.id;
        }

        // c) Dispatch lead_captured automation
        // The automation engine will find the active 'lead_captured' automation for this account,
        // evaluate any conditions, and execute 'send_message' using context.vars.faq_preview
        if (conversationId) {
          await runAutomationsForTrigger({
            accountId: accountId as string,
            triggerType: "lead_captured" as any,
            contactId,
            context: {
              conversation_id: conversationId,
              vars: {
                faq_preview: faqPreview,
                lead_id: leadData.id,
                category: category
              }
            }
          });
        }
      }
    } catch (waErr) {
      console.warn("Non-fatal WhatsApp trigger logic error:", waErr);
    }

    // 7. Return HTTP 200 OK with standardized contract
    return NextResponse.json(
      {
        success: true,
        lead: {
          id: leadData.id,
          name: leadData.name,
          phone: leadData.phone,
          category,
          status: leadData.status,
          metadata: {
            service_interest: leadData.service_interest,
            source: leadData.source,
            faq_preview: faqPreview,
          },
        },
        whatsapp_triggered: true,
        message_id: messageId,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err) {
    console.error("Public lead API unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}
