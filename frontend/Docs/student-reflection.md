🎓 Student Reflection: AI Teacher Assistant – Case Study
Student: Dion Beqiri

Project: AI Teacher Assistant (AI-Powered Education Platform)

Repository: https://github.com/dionbeqirii/AITeacherAssistant

Live URL: https://ai-teacher-assistant-db.vercel.app/

1. Project Overview (Executive Summary)
AI Teacher Assistant is an advanced web platform for teachers and educational institutions, built on Next.js 15 and Supabase. The primary goal is to automate the most time-consuming and repetitive parts of a teacher's workflow, integrating generative and visual AI technologies.

The platform provides a unified ecosystem for:

Managing gradebooks and tracking student absences.

Generating exams and learning materials using AI.

Designing homework assignments with grading rubrics.

Automatic grading (AI Grading) through text and, most importantly, AI Vision grading via photos.

Time management (Timer) in the classroom and real-time notifications.

By moving away from Excel, Word, and manual processes, AI Teacher Assistant creates a structured, measurable, and faster teaching experience. With support for Dark/Light mode and Internationalization (i18n), the platform is designed to be accessible and user-friendly.

2. Technical Milestones & Challenges
During development, the project focused on advancing technical pillars to provide a "next-gen" experience:

a) Next.js 15 & SPA Architecture
I implemented an SPA-like Dashboard where all modules (Dashboard, Gradebook, AI Grading, AI Exams, AI Materials, AI Homework, Timer) are managed within a single Dashboard component using React tabs and state.

I used the Next.js 15 App Router alongside "client" components to allow seamless transitions between modules without full page reloads, which is critical for a tool used actively during class.

b) Supabase: Auth, Database & RLS
Supabase Auth was utilized for secure login/registration and session management.

I designed a schema to support:

gradebook (grades, periods, averages),

absences (logical linkage with students and dates),

notifications (history of actions).

I implemented Row-Level Security (RLS) to ensure data privacy, guaranteeing that every teacher accesses only their own records via the user_id column.

c) Advanced AI Integration (Vision & Generative)
AI Vision Grading: A major technical milestone was the integration of Llama 3.2 Vision, allowing teachers to upload photos of handwritten assignments or use the camera directly. The system converts images to base64, processes them via AI, and returns structured feedback.

Llama 3.3 70B: Used for generating exams and homework, ensuring responses are returned in structured JSON format for clean UI rendering.

d) Utility & User Experience
Timer: I implemented a dedicated module for managing class time (Countdown/Stopwatch).

Notifications & UI: Added a real-time notification system and support for Dark/Light mode.

i18n: The application supports dynamic language switching (Albanian/English) to cater to diverse users.

3. Presentation Readiness
The project is prepared for the final presentation:

Demo Flow: A 5–7 minute structured flow covering the Dashboard, AI Vision grading, and exam generation.

Documentation: docs/demo-plan.md is fully updated.

Plan B: A recorded demo video and screenshots are ready, along with the ability to run the project locally if network latency occurs.

4. Student Reflection
This project helped me transition from "building an app that works" to "building a tool that makes sense in a teacher's daily life."

What I learned most:
Product Mindset: Implementing Camera/Vision grading showed me how crucial it is to reduce data entry time for end-users.

Complexity Management: Handling features like Notifications and Timers taught me how important it is for an app to feel "alive" and interactive.

Multimodal AI: Working with image OCR alongside text gave me a deeper understanding of modern APIs like Groq.

Supabase Depth: From basic auth to complex session management, I am now confident in building scalable, secure backends.

What I would do differently:
Use Context API or Zustand earlier for global state management (language, theme, notifications) instead of manual prop-drilling.

Add Playwright or Cypress automated tests for critical flows (login, AI grading) to ensure stability during development.

5. Conclusion: From project to real solution
AI Teacher Assistant is a concrete case study of modern software development. Combining Next.js 15, Supabase, and AI (Vision + Generative) isn't just code—it's a solution that a teacher can realistically imagine using every week. This project has increased my confidence as a full-stack developer, shifting my focus toward architecture, UX, and real-world value.

Project Status: Ready for Final Presentation.

Date: May 20, 2026