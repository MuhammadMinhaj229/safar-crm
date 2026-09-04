# SAFAR N MANZIL Ecosystem Identity (Local Copy)
Source: C:\Users\User\.gemini\config\skills\safar-ecosystem\SKILL.md

## 1. Brand Identity & Typography
- Core Theme: SAFAR Orange (#FF9B6A).
- Typography: Dancing Script (700) and Nunito (400/600/700/800).
- UI Paradigm: Clean glassmorphism, floating cards.

## 2. Architecture & Ecosystem
Two-repo architecture:
1. Static Website Repo: MuhammadMinhaj229/safar (HTML/CSS/JS).
2. CRM Repo: MuhammadMinhaj229/safar-crm (Next.js, Supabase, Tailwind, wacrm fork).
- Leads table in supabase/migrations/044_safar_leads_table.sql
- Static website form sends to /api/public/lead

## 3. Business Logic
- Core Value Proposition: Safar Go (India to Gulf) and Safar Home (Gulf support back home).
- Data model segregation: leads (unqualified form captures) vs contacts (verified active customers).
- WhatsApp automation via automation_logs / flows.
