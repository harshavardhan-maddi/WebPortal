# Techno Elite Web Portal

An ultra-premium, full-stack assessment platform for future tech professionals.

## Features

- **Premium UI/UX:** Built with Next.js, Tailwind CSS, and Framer Motion for a futuristic, enterprise-level experience.
- **Student Assessment:** Domain-based quizzes (Cyber Security, FSD, AI & ML, Data Science) with a high-performance quiz engine.
- **Anti-Cheat System:** Integrated tab-switching detection, copy-paste protection, and fullscreen enforcement.
- **Admin Dashboard:** Role-based access (Super Admin & Domain Admin) with real-time analytics and question management.
- **Google Sheets Integration:** Automatic synchronization of student results to Google Sheets.
- **Mobile Responsive:** Optimized for desktop, tablets, and mobile devices.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- **Backend:** Next.js API Routes, NextAuth.js.
- **Database:** MongoDB (via Mongoose).
- **Charts:** Recharts.
- **Integrations:** Google Spreadsheet API.

## Setup Instructions

Since I cannot run terminal commands directly in this environment, please follow these steps:

### 1. Install Dependencies
Open your terminal in the project root and run:
```bash
npm install
```

### 2. Configure Environment Variables
1. Rename `.env.local.template` to `.env.local`.
2. Fill in your credentials for MongoDB, NextAuth, and Google Sheets.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Admin Credentials (Demo)
- **Super Admin:** `admin@technoelite.com`
- **Domain Admin:** `domain@technoelite.com` (or any email containing "domain")

## Anti-Cheat Logic
The quiz engine monitors the `visibilitychange` event. If a student switches tabs, a warning is issued. After 3 warnings, the quiz is automatically submitted to prevent cheating.

## Google Sheets Sync
Results are appended to the specified Google Sheet via a Service Account. Ensure your service account email has "Editor" access to the spreadsheet.
