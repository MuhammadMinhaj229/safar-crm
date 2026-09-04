# SAFAR N MANZIL Ecosystem Identity

Context and constraints for the SAFAR N MANZIL business identity, CRM architecture, and design aesthetics.

## 1. Brand Identity & Typography
- **Core Theme:** SAFAR Orange (`#FF9B6A`).
- **Typography:** Use `Dancing Script` (700) for decorative accents and `Nunito` (400/600/700/800) for primary text.
- **UI Paradigm:** Dribbble-inspired presentation background, floating cards, micro-interactions, clean glassmorphism. Never use standard generic themes; it must feel extremely premium, trustworthy, and simple for visitors.

## 2. Architecture & Ecosystem
The business uses a two-repo architecture:
1. **Static Website Repo:** `MuhammadMinhaj229/safar` (HTML/CSS/JS). This is the public face with lead capture forms.
2. **CRM Repo:** `MuhammadMinhaj229/safar-crm` (Next.js, Supabase, Tailwind, wacrm fork).
   - Contains a custom `safar` theme in `src/lib/themes.ts` and `globals.css`.
   - Contains a `leads` table migrated in `supabase/migrations/044_safar_leads_table.sql`.
   - The static website form sends data to `https://safar-crm.vercel.app/api/public/lead` (or whichever URL is live).

## 3. Business Logic
- **Core Value Proposition:** Assisting people traveling from India to the Gulf ("Safar Go") and helping those already in the Gulf support their families back home ("Safar Home").
- **Data Model Segregation:** 
  - `leads`: Unqualified form captures from the website or WhatsApp.
  - `contacts`: Verified, active customers paying for services.
- **WhatsApp Focus:** The primary method of communication and automation is through WhatsApp Business API integration.

## 4. Agentic System Guidelines
When building agents for SAFAR N MANZIL:
- Ensure they understand the distinction between Leads and Contacts.
- Keep the tone highly professional, trustworthy, and simple.
- Agents must be equipped to handle WhatsApp automation concepts (sending broadcast messages, qualifying leads via flow steps).
