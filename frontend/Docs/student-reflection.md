🎓 Student Reflection: AI Teacher Assistant – Case Study  
Student: Dion Beqiri

Project: AI Teacher Assistant (AI-Powered Education Platform)

Repository: https://github.com/dionbeqirii/AITeacherAssistant  
Live URL: https://ai-teacher-assistant-db.vercel.app/

---

## 1. Project Overview (Executive Summary)

AI Teacher Assistant është një platformë e avancuar web për profesorë dhe institucione arsimore, ndërtuar mbi Next.js 15 dhe Supabase. Qëllimi kryesor është të automatizojë pjesët më të lodhshme dhe më rutinore të punës së një profesori:
- menaxhimin e regjistrit të notave,
- Evidencën e mungesave.
- gjenerimin e provimeve,
- krijimin e materialeve mësimore,
- dizajnimin e detyrave të shtëpisë me rubrika vlerësimi,
- vlerësimin automatik të përgjigjeve (AI Grading)

Në vend që profesori të mbështetet në Excel, Word dhe procese manuale, AI Teacher Assistant e kthen këtë në një **platformë të unifikuar** ku procesi i mësimdhënies, vlerësimit dhe evidencës bëhet më i shpejtë, më i strukturuar dhe më i matshëm.

---

## 2. Technical Milestones & Challenges

Gjatë zhvillimit, projekti është fokusuar në disa shtylla teknike kryesore:

### a) Next.js 15 & SPA Architecture

- Implementova një **SPA-like Dashboard** ku të gjitha modulet (Dashboard, Gradebook, AI Grading, AI Exams, AI Materials, AI Homework) menaxhohen në një komponent të vetëm `Dashboard` me tabs dhe state në React.
- Përdora App Router-in e Next.js 15 së bashku me komponentë “client” për të lejuar kalim të shpejtë mes moduleve pa reload të plotë, gjë që është kritike për një mjet që profesori e përdor gjatë orës.

### b) Supabase: Auth, Database & RLS

- **Supabase Auth** u përdor për login/registration të sigurt, duke lejuar që çdo profesor të ketë hapësirën e vet të të dhënave.
- Projektova tabela reale për përdorim pedagogjik:
  - `gradebook` për regjistrin e notave (me periudha dhe mesatare),
  - `absences` për mungesat e studentëve,
  - `conversations` dhe `messages` për historikun e AI Grading.
- Implementova **Row-Level Security (RLS)** që siguron se çdo profesor sheh vetëm të dhënat e veta përmes kolonës `user_id`. Kjo është kritike për privatësi dhe siguri në një aplikacion edukativ.

### c) AI Integration (Groq – Llama 3.3 70B)

- Lidhja me Groq API u përdor për:
  - vlerësimin automatik të përgjigjeve (score + feedback + strengths + weaknesses),
  - gjenerimin e provimeve (pyetje + përgjigje),
  - gjenerimin e materialeve mësimore,
  - gjenerimin e detyrave të shtëpisë me rubrika vlerësimi.
- Sfida ishte të dizajnoja **prompt-e të qëndrueshme**, që të kthejnë struktura të qarta JSON për t’u ruajtur dhe vizualizuar në UI (jo thjesht text i lirë).

### d) Gradebook & Absence Tracking

- Ndërtova një modul modern **Regjistri i Notave**, me:
  - shkallë notimi dinamike (1–10 / 1–5),
  - tre periudha,
  - mesatare studentore dhe mesatare klase për çdo lëndë,
  - grupim të studentëve sipas lëndës,
  - eksport profesional në PDF.
- Shtova menaxhimin e **Mungesave**, me:
  - lidhje logjike me studentët e gradebook-ut,
  - ruajtje të datës dhe tipit të mungesës,
  - filtrime për student të caktuar (p.sh. “Besart Islami – 26/04/2026”).

### e) Error Handling, Offline State & Export

- Implementova kontroll të sesionit dhe error handling për Supabase dhe AI API, në mënyrë që problemi i autentikimit apo i rrjetit të trajtohet me mesazhe të qarta, jo me crash të UI.
- Përdora:
  - `jspdf` dhe `jspdf-autotable` për PDF,
  - `docx` dhe `file-saver` për Word,
  për të krijuar dokumente të përdorshme realisht nga profesorët (jo vetëm demo teknike).

---

## 3. Presentation Readiness

Projekti është i përgatitur për prezantimin final në këto aspekte:

- **Demo Flow i menduar mirë:** Kam një flow 5–7 minutësh të strukturuar që fillon me Dashboard, kalon te Gradebook + Mungesat, dhe pastaj te AI Grading dhe gjenerimi i provimeve/materialeve/detyrave.
- **Dokumentim i dedikuar:**  
  - `docs/demo-plan.md` përshkruan saktë çka do të prezantoj, cilat pjesë teknike dhe çfarë kam testuar.
  - README është përditësuar dhe flet edhe për Gradebook + Mungesat.
- **Plan B i qartë:**  
  - Nëse Live URL ka problem (Vercel/Supabase/API), kam gati:
    - video demo,
    - screenshots të flow-it kryesor,
    - mundësinë për ta ngritur lokalisht.

---

## 4. Student Reflection

Ky projekt më ka ndihmuar të kaloj nga “thjesht të bëj një app që funksionon” në “të ndërtoj një mjet që ka kuptim në jetën reale të një profesori”.

### Çfarë kam mësuar më shumë:

- **Të mendoj në mënyrë produkti, jo vetëm kodi.**  
  Sa më shumë punoja me Gradebook-in dhe Mungesat, aq më shumë shihja se sa i rëndësishëm është UX për një profesor që ka kohë të kufizuar. Kjo më bëri të thjeshtoj disa flow-e dhe të shtoj veçori si kërkimi, filtrimi dhe eksporti në PDF.

- **Menaxhimi i kompleksitetit në një komponent të madh (Dashboard).**  
  `page.js` u bë një “orchestrator” i madh i shumë moduleve. Edhe pse funksionon, kjo më ka mësuar rëndësinë e ndarjes në komponentë më të vegjël dhe strukturës më modulare për projekte edhe më të mëdha.

- **Integrimi i AI në mënyrë të përgjegjshme.**  
  Për AI Grading, duhej ta balancoja “cool factor” të AI me faktin që ai mund të gabojë. Kjo është arsyeja pse kam përfshirë mesazhe paralajmëruese dhe e shoh AI-in si “asistent”, jo si autoritet absolut.

- **Supabase në thellësi.**  
  Nga auth bazik kalova te:
  - RLS policies,
  - menaxhimi i sesionit midis client dhe server (`@supabase/ssr`),
  - trajtimi i problemeve si “Jo i autentikuar” përmes headers dhe Bearer tokens.  
  Kjo më ka rritur shumë komfortin me ndërtimin e një backend-i modern pa pasur nevojë të shkruaj një server custom nga zero.

### Çfarë do të bëja ndryshe nëse do ta filloja nga e para:

- Do ta planifikoja strukturën e komponentëve më herët, në mënyrë që të mos kem një file kaq të madh për Dashboard-in.
- Do të shtoja testime automatike për funksionet kryesore (p.sh. llogaritjen e mesatareve, validimin e notave, filtrimin e studentëve).
- Do të dizajnoja në fillim flow-in e prezantimit final – dhe pastaj do ta ndërtoja UI-n rreth atij flow-i, në vend që t’i mendoja veçoritë në mënyrë lineare.

---

## 5. Përfundim: Nga projekt në zgjidhje reale

AI Teacher Assistant për mua nuk është vetëm një ushtrim kursi në “Programim të Avancuar”.  
Ai është një **case study konkret** se si:

- Next.js 15,
- Supabase,
- dhe AI (Llama 3.3 70B)

mund të kombinohen për të krijuar një mjet që një profesor mund ta imagjinojë duke e përdorur çdo javë.

Ky projekt më ka dhënë besim më të madh si zhvillues full-stack, por edhe si dikush që di të mendojë për vlerën reale të një aplikacioni për përdoruesin final.

**Project Status:** Ready for Final Presentation.  
**Date:** April 26, 2026
