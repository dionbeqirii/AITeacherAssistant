# Demo Plan – AI Teacher Assistant
Lënda: Programimi i Avancuar  
Student: Dion Beqiri

## 1. Çka është projekti dhe kujt i shërben

**AI Teacher Assistant** është një platformë web për profesorë dhe institucione arsimore, ndërtuar me **Next.js 15** dhe **Supabase**.  
Qëllimi kryesor është të automatizojë:

- gjenerimin e provimeve,
- krijimin e materialeve mësimore,
- dizajnimin e detyrave të shtëpisë,
- vlerësimin automatik të përgjigjeve (AI Grading),
- menaxhimin e regjistrit të notave,
- dhe evidentimin e mungesave.

Target përdoruesi është profesori i shkollës së ulta/mesme/universitetit, i cili dëshiron të kursejë kohë dhe të ketë një sistem të unifikuar për vlerësim, nota dhe mungesa.

---

## 2. Flow kryesor i demos (5–7 minuta)

### Hapi 1 – Hyrja në sistem & Dashboard (30–40 sekonda)
- Hap live aplikacionin:  
  `https://ai-teacher-assistant-db.vercel.app`
- Tregoj ekranin e login-it (nëse nuk jam i loguar).
- Pas login-it, shpjegoj shkurt **Dashboard**:
  - Total Evaluations,
  - Class Average,
  - AI Accuracy,
  - grafiku i aktivitetit.

### Hapi 2 – Regjistri i Notave (Gradebook) (2 minuta)
- Kaloj në tab-in **Regjistri (Gradebook)**.
- Shtoj një student të ri:
  - Lënda, Emri i studentit, nota në Periudha 1–3.
  - Tregoj se si llogaritet automatikisht **mesatarja e studentit**.
- Tregoj si grupohen studentët sipas lëndës dhe si shfaqet **mesatarja e klasës** për atë lëndë.
- Përdor **kërkimin** dhe **filtrimin** sipas lëndës.
- Bëj **Export në PDF** të regjistrit dhe tregoj shkurt strukturën e dokumentit.

### Hapi 3 – Mungesat (Attendance) (1–1.5 minuta)
- Nga Gradebook, shpjegoj se si lidhen studentët me mungesat.
- Tregoj si mund të menaxhohet një mungesë për një student (p.sh. student i caktuar + datë, p.sh. 26/04/2026).
- Kaloj në nën-seksionin **Mungesat** (nëse është i aktivizuar në UI) dhe shpjegoj:
  - listën e mungesave,
  - filtrimin sipas studentit.

(Nëse pjesa e mungesave është më shumë backend/funksionalitet pa UI të plotë, e shpjegoj si koncept dhe strukturë të të dhënave.)

### Hapi 4 – AI Grading (1.5–2 minuta)
- Kaloj në tab-in **AI Grading**.
- Vendos një pyetje të provimit + një përgjigje të studentit (shembull i përgatitur paraprakisht).
- Klikoj “Analyze with AI”.
- Tregoj rezultatet:
  - **Score**,
  - **Strengths**,
  - **Suggestions**.
- Shpjegoj që ky rezultat ruhet në Supabase dhe mund të hapet nga **History**.

### Hapi 5 – AI Exams / Materials / Homework (1.5–2 minuta)
- Kaloj shkurt te **AI Exams**:
  - Plotësoj fushat kryesore (Subject, Topic, Level, Difficulty, Type).
  - Gjeneroj një provim.
  - Tregoj pyetjet + përgjigjet, si dhe mundësinë për **PDF/Word export**.
- Përmend shkurt se:
  - **AI Materials** gjeneron materiale mësimore,
  - **AI Homework** gjeneron detyra me rubrika vlerësimi,
  duke i theksuar si module që e kompletojnë ekosistemin e mësimdhënies.

### Hapi 6 – Feedback & Mbyllja (30 sekonda)
- Klikoj butonin **Feedback** në sidebar.
- Tregoj modal-in për vlerësim me yje dhe koment.
- Shpjegoj që feedback-u ruhet në Supabase dhe mund të përdoret për përmirësimin e sistemit.

---

## 3. Pjesët teknike që do t’i shpjegoj shkurt

Gjatë demos do të prek shkurt këto pika teknike:

1. **Arkitektura**
   - Next.js 15 (App Router) + komponentë “client”.
   - Dashboard i vetëm me tabs për modulat (SPA feeling).

2. **Supabase**
   - Auth për login/logout.
   - Tabela:
     - `gradebook` për nota,
     - `absences` për mungesat,
     - `conversations` dhe `messages` për AI Grading history.
   - Row Level Security për `user_id`.

3. **API Routes**
   - `app/api/v1/gradebook/route.js` – CRUD për regjistër.
   - `app/api/v1/absences/route.js` – CRUD për mungesa.
   - `app/api/v1/grading/grade` – thirrja e Groq (Llama 3.3 70B).
   - Përdorimi i `@supabase/ssr` për të menaxhuar sesionin në server.

4. **AI Integration**
   - Thirrje në Groq për:
     - grading,
     - exam/material/homework generation.
   - Struktura JSON si përgjigje për t’u ruajtur dhe shfaqur në UI.

5. **Export & UI**
   - `jspdf` dhe `jspdf-autotable` për PDF.
   - `docx` + `file-saver` për Word.
   - Tailwind CSS + Framer Motion për UI moderne dhe animime.

---

## 4. Çfarë kam kontrolluar para demos

Para prezantimit final, planifikoj të kontrolloj:

- ✅ Login/Logout funksional.
- ✅ Dashboard ngarkohet pa error (stats + chart).
- ✅ Gradebook:
  - Shtim, edit, fshirje studenti.
  - Mesatare studenti + mesatare klase.
  - Kërkim + filtrime.
  - Export PDF.
- ✅ Mungesat:
  - Regjistrim i mungesave për studentë test.
  - Filtrim sipas studentit (p.sh. Besart Islami, datë specifike).
- ✅ AI Grading:
  - Gjenerim rezultatësh nga API.
  - Ruajtje dhe hapje nga History.
- ✅ AI Exams/Materials/Homework:
  - Gjenerim me parametra realë.
  - Export PDF/Word.
- ✅ Feedback:
  - Dërgim dhe ruajtje feedback-u.

Gjithashtu:

- Kontrolloj `.env` dhe konfigurimet në Vercel.
- Kontrolloj që nuk ka error-a kritike në browser console gjatë flow-it të demos.

---

## 5. Plani B nëse live demo dështon

Në rast problemesh me internetin, Supabase ose Vercel:

1. **Plan B1 – Video Demo**
   - Kam një video 5–7 minutëshe të regjistruar ku ndjek të njëjtin flow si në planin e mësipërm.

2. **Plan B2 – Screenshots**
   - Set screenshots për:
     - Dashboard,
     - Gradebook + mesataret,
     - shembull mungese,
     - AI Grading rezultat,
     - PDF/Word të eksportuar.

3. **Plan B3 – Run lokalisht**
   - Nëse Supabase është ok por Vercel jo:
     - Startoj aplikacionin lokalisht (`npm run dev`) dhe përdor `http://localhost:3000`.

---

## 6. Çfarë tregon kjo përgatitje

- E di saktësisht **çfarë do të prezantoj** (flow i strukturuar 5–7 min).
- Kam zgjedhur **flow-in më të vlefshëm** për profesorët (Gradebook + Mungesat + AI).
- Projekti është **i testuar dhe i gatshëm** për prezantim.
- Di të shpjegoj **vlerën praktike** dhe **pjesën teknike** pa u humbur në detaje të panevojshme.
