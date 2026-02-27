# WhatsApp CRM (Supabase Powered) 🚀

Modern, enterprise-grade WhatsApp CRM for Indian businesses. Powered by Node.js, React, and Supabase.

## ✨ Features
- **Real-time Analytics:** Dashboard with total leads, today's counts, and hot lead tracking.
- **Advanced Inbox:** Live conversation stream with lead intelligence.
- **Supabase Integration:** Real data storage with zero Prisma dependency.
- **Indian Context:** Support for Rupee symbols, Indian phone number formats, and business-first UI.

## 🛠️ Setup Instructions

### 1. Supabase Configuration
Create a project on [Supabase](https://supabase.com/) and ensure you have the following tables:
- `whatsapp_conversations`
- `whatsapp_messages`
- `lead_insights`
- `contacts`
- `users` / `roles` / `agent_status` (optional for full auth flow)

### 2. Backend Setup
1. Navigate to `/backend`
2. `npm install`
3. Create `.env` based on `.env.example`:
   ```env
   PORT=3010
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (recommended)
   API_KEY=demo123
   DISABLE_AUTH=true (for local development)
   ```
4. `npm run dev`

### 3. Frontend Setup
1. Navigate to `/frontend`
2. `npm install`
3. Create `.env` based on `.env.example`:
   ```env
   VITE_API_BASE_URL=http://localhost:3010
   VITE_API_KEY=demo123
   ```
4. `npm run dev`

## 🔑 Key Rotation & Security
- **Supabase Keys:** If you need to rotate keys, update the `.env` in the backend and restart the server.
- **API Auth:** In production, set `DISABLE_AUTH=false` and ensure a strong `API_KEY` is shared between frontend and backend.

## 🚀 Troubleshooting
- **EADDRINUSE:** Ensure port 3010 is free or change it in `backend/.env`.
- **Supabase Errors:** Check if your table names and columns match the service mapping in `backend/src/services.ts`.
