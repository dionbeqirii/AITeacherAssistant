# Demo Plan – AI Teacher Assistant
Course: Advanced Programming  
Student: Dion Beqiri

## 1. What the project is and who it serves

**AI Teacher Assistant** is a web platform for teachers and educational institutions, built with **Next.js 15** and **Supabase**.  
Its main goal is to automate:

- exam generation,
- learning material creation,
- homework design (with rubrics),
- automatic grading of student answers (AI Grading),
- gradebook management,
- and absence tracking.

The primary user is a high school or university teacher who wants to save time and have a unified system for assessments, grades, and attendance.

---

## 2. Main demo flow (5–7 minutes)

### Step 1 – Login & Dashboard (30–40 seconds)
- Open the live app:  
  `https://ai-teacher-assistant-db.vercel.app`
- Show the login screen (if not already logged in).
- After login, briefly explain the **Dashboard**:
  - Total Evaluations,
  - Class Average,
  - AI Accuracy,
  - activity chart.

### Step 2 – Gradebook (Regjistri i Notave) (2 minutes)
- Navigate to the **Gradebook** tab.
- Add a new student:
  - Subject, Student name, grades for Period 1–3.
  - Show how the **student average** is calculated automatically.
- Show how students are grouped by subject and how the **class average** per subject is displayed.
- Use **search** and **subject filters**.
- Perform a **PDF export** of the gradebook and quickly show the structure of the document.

### Step 3 – Absence Tracking (Mungesat) (1–1.5 minutes)
- From Gradebook, explain how students are connected to absences.
- Show how an absence is managed/stored for a specific student (e.g., a particular student on the date 26/04/2026).
- Switch to the **Absences** sub-section of the Gradebook (if enabled in the UI) and explain:
  - the list of absences,
  - filtering by student.

(If the absences UI is partial, I will explain the data structure and how it’s integrated conceptually.)

### Step 4 – AI Grading (1.5–2 minutes)
- Go to the **AI Grading** tab.
- Enter an exam question + a prepared student answer.
- Click “Analyze with AI”.
- Show the results:
  - **Score**,
  - **Strengths**,
  - **Suggestions**.
- Explain that results are stored in Supabase and can be reopened from **History**.

### Step 5 – AI Exams / Materials / Homework (1.5–2 minutes)
- Move to **AI Exams**:
  - Fill in the main fields (Subject, Topic, Level, Difficulty, Type).
  - Generate an exam.
  - Show questions + answers and the **PDF/Word export** options.
- Briefly mention that:
  - **AI Materials** generates learning content,
  - **AI Homework** generates structured assignments with rubrics,  
  completing the end-to-end teaching workflow.

### Step 6 – Feedback & Closing (30 seconds)
- Click the **Feedback** button in the sidebar.
- Show the feedback modal (star rating + comment).
- Explain that feedback is stored in Supabase for future improvements.

---

## 3. Technical parts I will explain briefly

During the demo I will touch on these technical points:

1. **Architecture**
   - Next.js 15 (App Router) + client components.
   - Single Dashboard component with tab-based SPA-like navigation.

2. **Supabase**
   - Auth for login/logout.
   - Tables:
     - `gradebook` for grades,
     - `absences` for attendance,
     - `conversations` and `messages` for AI Grading history.
   - Row Level Security based on `user_id`.

3. **API Routes**
   - `app/api/v1/gradebook/route.js` – CRUD for the gradebook.
   - `app/api/v1/absences/route.js` – CRUD for absences.
   - `app/api/v1/grading/grade` – Groq (Llama 3.3 70B) integration.
   - Use of `@supabase/ssr` to manage session and cookies on the server.

4. **AI Integration**
   - Calling Groq for:
     - grading,
     - exam/material/homework generation.
   - Returning structured JSON responses that can be stored and rendered in the UI.

5. **Export & UI**
   - `jspdf` + `jspdf-autotable` for PDF exports.
   - `docx` + `file-saver` for Word exports.
   - Tailwind CSS + Framer Motion for a modern, animated UI.

---

## 4. What I have checked before the demo

Before the final presentation, I plan to verify:

- ✅ Login/Logout works.
- ✅ Dashboard loads without errors (stats + chart).
- ✅ Gradebook:
  - Add / edit / delete student.
  - Student average and class average.
  - Search + filters.
  - PDF export.
- ✅ Absences:
  - Absences can be recorded for test students.
  - Filtering by student (e.g., a specific student on a given date).
- ✅ AI Grading:
  - AI responses are returned successfully.
  - Data is stored and can be opened from History.
- ✅ AI Exams/Materials/Homework:
  - Generation with realistic parameters works.
  - PDF/Word export works.
- ✅ Feedback:
  - Feedback submission is stored correctly.

Additionally:

- Check `.env` and Vercel configuration.
- Ensure there are no critical errors in the browser console during the demo flow.

---

## 5. Plan B if the live demo fails

In case of issues with internet, Supabase, or Vercel:

1. **Plan B1 – Pre-recorded Video**
   - A 5–7 minute video following the exact same demo flow.

2. **Plan B2 – Screenshots**
   - Prepared screenshots of:
     - Dashboard,
     - Gradebook + class averages,
     - an example absence record,
     - AI Grading result,
     - exported PDF/Word documents.

3. **Plan B3 – Local Run**
   - If Supabase is up but Vercel is not:
     - Run the app locally (`npm run dev`) and present via `http://localhost:3000`.

---

## 6. What this preparation shows

- I know exactly **what I will present** (a clear 5–7 minute flow).
- I selected **the most valuable flow** for teachers (Gradebook + Absences + AI).
- The project is **tested and ready** for demonstration.
- I can explain both the **practical value** and the **technical implementation** without getting lost in unnecessary details.
