# Demo Plan – AI Teacher Assistant
Lënda: Programimi i Avancuar  
Student: Dion Beqiri

## 1. Çka është projekti dhe kujt i shërben

**AI Teacher Assistant** është një platformë web e avancuar për profesorë dhe institucione arsimore, ndërtuar me **Next.js 15** dhe **Supabase**.  
Qëllimi kryesor është të automatizojë ciklin e plotë të punës së një mësimdhënësi:

- gjenerimin e provimeve dhe detyrave (Manual ose nga Materialet),
- krijimin e materialeve mësimore me AI,
- vlerësimin automatik (përfshirë analizën e fotove/shkrimit të dorës),
- menaxhimin e regjistrit të notave,
- evidentimin e mungesave,
- menaxhimin e kohës në klasë (Timer).

Target përdoruesi është profesori i cili dëshiron të kursejë kohë, të eliminojë burokracinë dhe të ketë një asistent inteligjent për të identifikuar pikat e forta dhe të dobëta të studentëve.

---

## 2. Flow kryesor i demos (5–7 minuta)

### Hapi 1 – Hyrja në sistem & Dashboard (40 sekonda)
- Hap live aplikacionin: `https://ai-teacher-assistant-db.vercel.app`
- Tregoj ekranin e login-it.
- Pas login-it, shpjegoj shkurt **Dashboard**:
  - Metrikat kryesore (Total Evaluations, Class Average, AI Accuracy, 7-Day Activity).
  - Grafiku vizual i notave sipas lëndëve.
  - **Njoftimet (Notifications):** Tregoj si sistemi njofton për studentët e rinj apo përditësimet (ikona e ziles).

### Hapi 2 – Regjistri i Notave (Gradebook) (1.5 minuta)
- Kaloj në tab-in **Regjistri (Gradebook)**.
- Shtoj një student të ri ose shtoj një lëndë për një student ekzistues:
  - Shpjegoj thjeshtësinë e formës (New Student vs Existing Student).
  - Tregoj llogaritjen automatike të mesatares (AVG).
- Tregoj **kërkimin** dhe **filtrimin** e avancuar sipas lëndëve/klasave.
- Bëj **Export në PDF** për t'i treguar profesorit si mund t'i printojë notat zyrtarisht.

### Hapi 3 – AI Grading me Foto/Kamerë (2 minuta)
- Kaloj në **AI Grading**.
- Demonstroj fuqinë e vërtetë:
  - Zgjedh tab-in **Photo / Camera**.
  - Ngarkoj një foto (ose simuloj kamerën) të një detyre të shkruar me dorë.
  - Vendos një "Rubric" opsionale (p.sh. "10 pikë për pyetje").
  - Klikoj **Analyze Photo**.
- Tregoj si Llama Vision e kthen imazhin në vlerësim: **Score, Strengths, Suggestions**.
- Tregoj **History** poshtë, ku ruhen të gjitha vlerësimet e kaluara.

### Hapi 4 – AI Exams / Homework / Materials (1.5 minuta)
- Kaloj shkurt te **AI Exams**:
  - Tregoj dy mënyrat: **Manual** (inputet për vështirësi/temë) vs **From Material**.
  - Gjeneroj një provim live dhe tregoj "Exam Preview".
- Te **AI Homework**:
  - Tregoj caktimin e **Deadline** (kalendarin) dhe instruksionet specifike.
- Theksoj se këto module e kthejnë platformën në një "fabrikë" të materialeve akademike.

### Hapi 5 – Timer & Feedback (1 minutë)
- Kaloj te **Timer**:
  - Tregoj se si përdoret për menaxhimin e kohës gjatë testit (Countdown).
- Klikoj butonin **Feedback** (në sidebar):
  - Tregoj modalin për vlerësim (Star rating + koment).

---

## 3. Pjesët teknike që do t’i shpjegoj shkurt

1. **Arkitektura & Tech Stack**
   - Next.js 15, Supabase, Tailwind CSS.
   - Përdorimi i modeleve **Llama 3.2 Vision** (për analizë fotosh) dhe **Llama 3.3 70B** (për tekst).

2. **Supabase & Security**
   - Auth (Login/Register).
   - RLS (Row Level Security) – Sigurimi që çdo profesor sheh vetëm të dhënat e tij.
   - Përdorimi i `@supabase/ssr` për siguri maksimale.

3. **Logjika e AI (Vision & Text)**
   - Shpjegoj se si fotoja kthehet në `base64` dhe dërgohet në backend për t'u analizuar nga Llama Vision.
   - Struktura JSON e kthyer nga AI e cila pastaj shfaqet në UI.

4. **Integrimet & Export**
   - PDF/Word generation (jsPDF, docx).
   - i18n (sistemi i përkthimit Shqip/English).

---

## 4. Çfarë kam kontrolluar para demos

- ✅ Login/Logout & Sessions.
- ✅ AI Vision (Testim me foto realiste).
- ✅ Gradebook (Validimi i mesatareve).
- ✅ Timer (Funksionaliteti Start/Reset).
- ✅ Notifications (Shfaqja e tyre).
- ✅ API Routes (Lidhja me Groq dhe Supabase).
- ✅ Export (PDF/Word funksional).

---

## 5. Plani B nëse live demo dështon

1. **Plan B1 – Video Demo:** Video e regjistruar paraprakisht ku tregoj saktësisht flow-in e AI Grading me foto.
2. **Plan B2 – Screenshots:** Set screenshots të detajuara për çdo hap.
3. **Plan B3 – Run lokalisht:** Startimi i projektit në `localhost:3000` nëse Vercel/Supabase kanë vonesa.

---

## 6. Çfarë tregon kjo përgatitje

- E di saktësisht çfarë do të prezantoj.
- Jam fokusuar në "Killer Features" (AI Grading me foto).
- Jam i përgatitur për çdo problem teknik me Planin B.
- Projekti është "Production Ready" (i gatshëm për përdorim real nga profesorët).