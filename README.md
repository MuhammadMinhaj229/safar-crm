# Safar CRM — WhatsApp Multi-Agent Customer Hub & Pipeline Engine

[![Live Production](https://img.shields.io/badge/Live_Site-safar--crm--theta.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://safar-crm-theta.vercel.app)
[![Framework](https://img.shields.io/badge/Framework-Next.js_14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Flow Automations](https://img.shields.io/badge/Automations-@xyflow/react-pink?style=flat-square)](https://reactflow.dev/)
[![Database](https://img.shields.io/badge/Database-Supabase_SSR-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Safar CRM** is a self-hostable, multi-agent WhatsApp customer relationship management platform engineered for SAFAR N MANZIL and powered by Alif Growth Media. It bridges the gap between customer WhatsApp chats and organized business operations.

---

## Core Features

- **Unified Team WhatsApp Inbox:** Multiple team members can reply to incoming WhatsApp inquiries from one shared dashboard.
- **Visual Automation Workflows:** Powered by `@xyflow/react` and `@dagrejs/dagre` for drag-and-drop conversational decision trees and auto-routing.
- **Instant Auto-Responders:** Automated greetings, catalog links, and business hours notices triggered in &lt; 5 seconds.
- **Sales Pipelines & Lead Stages:** Kanban-style lead boards (New Enquiry → In Discussion → Quote Sent → Completed).
- **Customer Profiles & Order History:** See all previous travel inquiries, document requests, and booking statuses on one card.

---

## Tech Stack

- **Framework:** Next.js 14, React, TypeScript
- **Visual Flow Editor:** `@xyflow/react`, `@dagrejs/dagre`
- **Backend & Auth:** Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **UI & Styling:** Tailwind CSS, Base UI, Lucide Icons
- **Deployment:** Vercel

---

## Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/MuhammadMinhaj229/safar-crm.git
cd safar-crm

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
```

Populate `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
# 4. Start Next.js dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## How to Deploy to Vercel

1. Push your repository to GitHub.
2. In **Vercel**, select **Add New Project** and import `safar-crm`.
3. Framework: **Next.js**.
4. Configure environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
5. Click **Deploy**.

---

## Author & Support
Engineered by **Mohammed Minhaj Mahmood** for SAFAR N MANZIL & Alif Growth Media.  
Contact: [minhajmuhammad229@gmail.com](mailto:minhajmuhammad229@gmail.com).
