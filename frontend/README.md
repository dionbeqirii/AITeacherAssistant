# 🎓 AI Teacher Assistant – AI-Powered Education Platform

## 📌 Overview
AI Teacher Assistant is a modern, comprehensive academic platform built with Next.js 15.  
Designed to empower educators, it automates exam creation, learning material generation, homework assignments, grading, and student record management using cutting-edge Artificial Intelligence.

The primary goal of this project is to streamline the educational workflow, saving teachers valuable time while ensuring high-quality, objective, and personalized educational content.

🚀 **Live Link:** [https://ai-teacher-assistant-db.vercel.app](https://ai-teacher-assistant-db.vercel.app)

---

## ✨ Key Features

### 👤 User Profile & Security
- **Authentication:** Secure login and registration via Supabase Auth.
- **Profile Management:** Update names, passwords, and avatars via a modern modal interface.
- **Offline Resilience:** Real-time "Connection Lost" detection to prevent API crashes during network drops.
- **UI Customization:** Supports **Dark/Light mode** and **Internationalization (i18n)** for English/Albanian language support.

---

### 📊 Dynamic Analytics Dashboard
Interactive dashboard displaying real-time statistics fetched directly from the database:
- **Total Evaluations:** Number of assessments completed.
- **Class Average:** Overall class performance metrics.
- **AI Accuracy:** Monitored AI model precision (~99.2%).
- **Weekly Activity:** Evaluations completed in the last 7 days.
- **Real-time Notifications:** Integrated alert system for student updates and system events.

---

### 🤖 AI Grading System (Multimodal)
- **Text-based Grading:** Teacher inputs the **question** and the **student’s answer** for analysis.
- **AI Vision Grading:** Upload photos or use the camera to analyze handwritten student work using **Llama 3.2 Vision**.
- AI analyzes the content and provides:
  - Automatic **score**
  - **Strengths**
  - **Weaknesses** / suggestions for improvement
- All grading history is stored in Supabase and can be revisited at any time.

---

### 📝 AI Exam Generator (SPA Integrated)
- Intelligent exam creation customized by:
  - **Subject, Topic, Difficulty, Question Type** (Open / Multiple Choice / Mixed)
  - **Academic Level** (Primary, High School, University)
- Fully integrated in a SPA-style dashboard (no full page reloads).
- Export exams to **PDF** and **Word (.docx)**.

---

### 📚 AI Materials & Homework Generator (NEW)
#### AI Learning Materials
- Generate structured learning content based on:
  - Subject
  - Topic
  - Academic Level
- Ideal for lesson summaries, explanations, and preparation materials.

#### AI Homework Generator
- Automatically generates homework sets with:
  - Title, description, and detailed requirements
  - **Rubrics** with points per criterion
  - Optional **deadline**
- Export homework to **PDF** or **Word (.doc)** for immediate classroom use.

---

### 📘 Gradebook – Student Registry (NEW)
A modern **digital gradebook** module for managing student grades per subject.

- **Per-Subject Grouping:** Students are grouped by subject.
- **Multiple Periods:** Store grades for:
  - Period 1
  - Period 2
  - Period 3
- **Grade Scales:**
  - 1–10
  - 1–5  
  (Switchable via a toggle in the UI.)
- **Per-Student Average:** Automatic calculation of the average grade per student.
- **Per-Class Average:** Header shows the class average per subject.
- **CRUD Operations:**
  - Add new students
  - Edit existing records
  - Delete student records
- **Search & Filter:**
  - Search by **student name** or **subject**
  - Filter by **subject**
- **Professional Export:**
  - Export the entire gradebook to a styled **PDF** (“Regjistri i Notave”) with:
    - Subject grouping
    - Period grades
    - Averages
    - Clean, printable design

---

### 🔴 Absence Tracking – Mungesat (NEW)
Integrated directly into the **Gradebook** tab to manage student absences.

- **Per-Student Absence Actions:**
  - From the gradebook table, each student row contains an action to work with absences.
- **Types of Absences:**
  - *Justified* (i arsyetuar)
  - *Unjustified* (i pa arsyetuar)
- **Date-Based Logging:**
  - Absences are stored with a concrete **date**.
- **Student-Centric View:**
  - Quickly filter absences by student (e.g., “Besart Islami – 26/04/2026”).
- **Registry View:**
  - Dedicated “Mungesat” sub-section under the Gradebook for:
    - Listing all absences
    - Filtering by student
    - Quick overview of total absences

> The goal of the Gradebook + Absences module is to centralize everything a teacher needs to track student performance and presence inside a single, clear interface.

---

### ⏱️ Time Management (NEW)
- **Timer:** Integrated countdown/stopwatch module to manage class activities and exam durations efficiently.

### 💬 Integrated Feedback System
- In-app feedback modal with:
  - Star rating (1–5)
  - Text message
- Data is sent and stored in Supabase for continuous UX improvement and iteration.

---

### 📄 Professional Export & Cloud History
- Export generated:
  - Exams
  - Homework
  - Learning Materials
  - Gradebook  
  to **PDF** and **Word (.doc/.docx)**.
- Cloud history (Supabase) allows users to revisit and reuse previous generations and evaluations.

---

## 🧪 Step-by-Step User Guide

1. **Authentication**
   - Register or log in with a valid account to access the secure dashboard.

2. **Navigation**
   - Use the left sidebar to move between:
     - Dashboard (Real-time stats)
     - Gradebook (Registry & Absences)
     - AI Grading (Text & Vision/Photo analysis)
     - AI Exams/Materials/Homework
     - Timer (Class time management)
   - All transitions are SPA-style (no full reload).

3. **Working with the Gradebook & Absences**
   - Open the **Gradebook** tab.
   - Add a new student with subject and period grades.
   - View students grouped by subject and see class averages.
   - Use actions in each row to manage absences.

4. **Using AI Modules**
   - **AI Grading:** Choose between Text input or **Photo/Camera** to evaluate work.
   - AI Exams/Materials/Homework: Configure parameters → generate content → export.

5. **Exporting & Utilities**
   - Use the export buttons (PDF / Word) to download content.
   - Toggle language (EN/SQ) or theme (Dark/Light) via the profile settings.

6. **Feedback**
   - Use the **Feedback** option in the sidebar to rate the system.

---

## 🛠 Technologies Used

- **Framework:** Next.js 15 (App Router, SPA-like navigation)
- **Language:** JavaScript / TypeScript
- **Styling & UI:**
  - Tailwind CSS
  - Framer Motion (animations)
  - Lucide React (icons)
- **Backend & Database:** Supabase
  - Auth (email/password)
  - PostgreSQL
  - Storage (avatars, etc.)
- **AI Integration:** Groq Cloud – Llama 3.3 70B & Llama 3.2 Vision
- **Documents & Export:**
  - `docx` (Word)
  - `file-saver`
  - `jspdf`
- **Deployment:** Vercel

---

## ⚙️ Installation & Local Setup

```bash
# Clone the project
git clone [https://github.com/dionbeqirii/AITeacherAssistant.git](https://github.com/dionbeqirii/AITeacherAssistant.git)
cd AITeacherAssistant

# Install dependencies
npm install

# Create .env.local and add your keys
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start the application
npm run dev -- -p 3001