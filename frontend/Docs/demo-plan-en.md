# Demo Plan – AI Teacher Assistant
Subject: Advanced Programming  
Student: Dion Beqiri

## 1. Project Overview

**AI Teacher Assistant** is an advanced web platform for teachers and educational institutions, built with **Next.js 15** and **Supabase**.  
The primary goal is to automate the full teacher workflow:

- generating exams and assignments (Manual or From Materials),
- creating learning materials with AI,
- automatic grading (including photo/handwriting analysis),
- gradebook management,
- absence tracking,
- and time management (Timer) in the classroom.

The target user is any teacher looking to save time, eliminate bureaucracy, and utilize an intelligent assistant to identify student strengths and weaknesses.

---

## 2. Demo Main Flow (5–7 minutes)

### Step 1 – Login & Dashboard (40 seconds)
- Open the live application: `https://ai-teacher-assistant-db.vercel.app`
- Show the Login screen.
- After logging in, briefly explain the **Dashboard**:
  - Key metrics (Total Evaluations, Class Average, AI Accuracy, 7-Day Activity).
  - Visual grade charts by subject.
  - **Notifications:** Show how the system notifies the teacher about new student registrations or updates (bell icon).

### Step 2 – Gradebook (1.5 minutes)
- Navigate to the **Gradebook** tab.
- Add a new student or add a subject for an existing student:
  - Explain the simplicity of the form (New Student vs Existing Student).
  - Show the automatic calculation of the student's average (AVG).
- Show advanced **search** and **filtering** by subject/class.
- Perform an **Export to PDF** to demonstrate the professional document structure.

### Step 3 – AI Grading with Photo/Camera (2 minutes)
- Navigate to **AI Grading**.
- Demonstrate the platform's core strength:
  - Select the **Photo / Camera** tab.
  - Upload a photo (or simulate camera) of a handwritten assignment.
  - Set an optional "Rubric" (e.g., "10 points per question").
  - Click **Analyze Photo**.
- Show how Llama Vision transforms the image into an assessment: **Score, Strengths, Suggestions**.
- Show the **History** section, where all previous evaluations are stored.

### Step 4 – AI Exams / Homework / Materials (1.5 minutes)
- Briefly move to **AI Exams**:
  - Show the two modes: **Manual** (inputting difficulty/topic) vs **From Material**.
  - Generate an exam live and show the "Exam Preview".
- In **AI Homework**:
  - Show the **Deadline** calendar and custom instructions field.
- Emphasize how these modules turn the platform into a comprehensive academic content factory.

### Step 5 – Timer & Feedback (1 minute)
- Navigate to **Timer**:
  - Demonstrate its use for managing class time during tests (Countdown).
- Click the **Feedback** button (in the sidebar):
  - Show the feedback modal (Star rating + comment).

---

## 3. Technical Highlights

1. **Architecture & Tech Stack**
   - Next.js 15, Supabase, Tailwind CSS.
   - Integration of **Llama 3.2 Vision** (for image analysis) and **Llama 3.3 70B** (for text/generation).

2. **Supabase & Security**
   - Auth (Login/Register).
   - RLS (Row Level Security) – Ensuring each teacher only sees their own data.
   - Usage of `@supabase/ssr` for secure session management.

3. **AI Logic (Vision & Text)**
   - Explain how the image is converted to `base64` and sent to the backend for analysis by Llama Vision.
   - The JSON structure returned by the AI is parsed and rendered in the UI.

4. **Integrations & Export**
   - PDF/Word generation (jsPDF, docx).
   - i18n (Internationalization system: Albanian/English).

---

## 4. Pre-Demo Checklist

- ✅ Login/Logout & Sessions.
- ✅ AI Vision (Test with realistic photo).
- ✅ Gradebook (Average calculation validation).
- ✅ Timer (Start/Reset functionality).
- ✅ Notifications (Display functionality).
- ✅ API Routes (Connection to Groq and Supabase).
- ✅ Export (PDF/Word functional).

---

## 5. Plan B (If Live Demo Fails)

1. **Plan B1 – Video Demo:** A recorded 5–7 minute video showing the exact flow, specifically the AI Grading with photo.
2. **Plan B2 – Screenshots:** Detailed screenshots for every step of the workflow.
3. **Plan B3 – Run Locally:** Start the application on `http://localhost:3000` if Vercel/Supabase experience latency.

---

## 6. Project Value

- Structured and well-paced presentation flow.
- Focus on "Killer Features" (AI Vision Grading).
- Preparedness for technical issues with a solid Plan B.
- Production-ready application, demonstrating real-world value for teachers.