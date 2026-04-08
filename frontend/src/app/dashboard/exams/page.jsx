"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Sparkles, 
  BrainCircuit, 
  ArrowLeft, 
  FileText, 
  Save, 
  CheckCircle,
  FileDown,
  Clock,
  User,
  Book,
  Target,
  Layers,
  BarChart3,
  ListOrdered,
  PlusCircle,
  Loader2,
  ChevronLeft
} from 'lucide-react';

export default function ExamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({
    professorName: '',
    subject: '',
    topic: '',
    level: 'Fakultet',
    numQuestions: 5,
    type: 'multiple-choice',
    difficulty: 'Medium',
    extraInfo: ''
  });

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setQuestions([]);
    setIsSaved(false);

    try {
      const response = await fetch('/api/v1/exams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setQuestions(result.data);
      } else {
        alert("Gabim gjatë gjenerimit: " + result.error);
      }
    } catch (error) {
      alert("Nuk u arrit lidhja me serverin.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (questions.length === 0) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/v1/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            subject: formData.subject,
            topic: formData.topic,
            level: formData.level,
            difficulty: formData.difficulty,
            professorName: formData.professorName,
            questions: questions 
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsSaved(true);
      } else {
        alert("Gabim nga Serveri: " + (result.error || "Nuk u ruajt dot."));
      }
    } catch (error) {
      alert("Gabim lidhjeje: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadWord = () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: `PROVIM: ${formData.subject.toUpperCase()}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Profesor: ${formData.professorName} | Tema: ${formData.topic}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Niveli: ${formData.level} | Vështirësia: ${formData.difficulty}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Emri dhe Mbiemri: ___________________________    Data: ________", size: 24 }),
            ],
            spacing: { after: 600 },
          }),
          ...questions.flatMap((q, index) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. ${q.question}`, bold: true, size: 24 }),
              ],
              spacing: { before: 400 },
            }),
            ...(q.options ? q.options.map((opt, i) => 
              new Paragraph({
                text: `${String.fromCharCode(65 + i)}) ${opt}`,
                indent: { left: 720 },
              })
            ) : [
              new Paragraph({ text: "Përgjigje: __________________________________________________" }),
              new Paragraph({ text: "____________________________________________________________" })
            ]),
          ]),
        ],
      }],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${formData.subject || 'Provim'}.docx`);
    });
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(`PROVIM: ${formData.subject.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Profesor: ${formData.professorName} | Tema: ${formData.topic}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Niveli: ${formData.level} | Vështirësia: ${formData.difficulty}`, pageWidth / 2, 36, { align: 'center' });

    doc.line(20, 45, pageWidth - 20, 45);
    doc.text("Emri dhe Mbiemri: ___________________________    Data: ________", 20, 55);

    let yPos = 70;
    questions.forEach((q, index) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      
      doc.setFont("helvetica", "bold");
      const splitQuestion = doc.splitTextToSize(`${index + 1}. ${q.question}`, pageWidth - 40);
      doc.text(splitQuestion, 20, yPos);
      yPos += (splitQuestion.length * 7);

      doc.setFont("helvetica", "normal");
      if (q.options) {
        q.options.forEach((opt, i) => {
          doc.text(`${String.fromCharCode(65 + i)}) ${opt}`, 30, yPos);
          yPos += 7;
        });
      } else {
        doc.text("Përgjigje: __________________________________________________", 30, yPos);
        yPos += 14;
      }
      yPos += 5;
    });

    doc.save(`${formData.subject || 'Provim'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header Section - Rregulluar për Mobile me flex-col */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">AI Studio</span>
                <h1 className="text-xl md:text-3xl font-black text-slate-700 tracking-tighter uppercase italic">Exam Generator</h1>
              </div>
              <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">Krijo materiale testimi në pak sekonda</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button 
              type="button"
              onClick={() => console.log("Historiku është i çaktivizuar përkohësisht")}
              disabled={true}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-400 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed opacity-60 transition-all"
            >
              <Clock size={16} /> Historiku
            </button>
            {questions.length > 0 && (
              <button 
                onClick={handleSaveToHistory}
                disabled={isSaving || isSaved}
                className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                  isSaved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1'
                }`}
              >
                {isSaved ? <CheckCircle size={18} /> : (isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />)}
                {isSaved ? 'U Ruajt' : 'Ruaj'}
              </button>
            )}
          </div>
        </div>

        {/* Main Grid Content - Ndryshuar gap për mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left: Configuration Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleGenerate} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 lg:sticky lg:top-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Target size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-600 uppercase tracking-tighter italic">Konfigurimi</h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Profesor/Institucion</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Emri i plotë"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all"
                      value={formData.professorName}
                      onChange={(e) => setFormData({...formData, professorName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Detajet e Lëndës</label>
                  <input 
                    type="text" 
                    placeholder="Emri i lëndës"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Tema specifike"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all"
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Niveli</label>
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value})}
                    >
                      <option value="Fillore">Fillore</option>
                      <option value="Mesme">E Mesme</option>
                      <option value="Fakultet">Fakultet</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Vështirësia</label>
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    >
                      <option value="Easy">I lehtë</option>
                      <option value="Medium">Mesatar</option>
                      <option value="Hard">I vështirë</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nr. Pyetjeve</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none"
                      value={formData.numQuestions}
                      onChange={(e) => setFormData({...formData, numQuestions: e.target.value})}
                    />
                  </div>
<div className="space-y-2">
  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Tipi</label>
  <select 
    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer"
    value={formData.type}
    onChange={(e) => setFormData({...formData, type: e.target.value})}
  >
    <option value="multiple-choice">Zgjedhje</option>
    <option value="open-ended">Shkrim</option>
    <option value="mixed">Të kombinuara</option> {/* Kjo është fusha e re */}
  </select>
</div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Instruksione Shtesë</label>
                  <textarea 
                    placeholder="P.sh: Përdor terma teknikë..."
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-medium text-sm text-slate-600 transition-all min-h-[100px] resize-none"
                    value={formData.extraInfo}
                    onChange={(e) => setFormData({...formData, extraInfo: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-700 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-blue-400 group-hover:scale-125 transition-transform" />}
                {loading ? "Duke Gjeneruar..." : "Gjenero Provimin"}
              </button>
            </form>
          </div>

          {/* Right: Results / Preview */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-500/30 rounded-full"></div>
                <h3 className="text-lg md:text-xl font-black text-slate-500 uppercase tracking-tighter italic">Preview e Provimit</h3>
              </div>

              {questions.length > 0 && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={downloadWord} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                    <FileText size={16} className="text-blue-500/50" /> Word
                  </button>
                  <button onClick={downloadPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                    <FileDown size={16} className="text-red-500/50" /> PDF
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={idx} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200/60 shadow-sm transition-all duration-500">
                  <div className="flex items-start gap-4 md:gap-5 mb-8">
                    <span className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black italic text-base md:text-lg shadow-sm border border-slate-100">
                      {idx + 1}
                    </span>
                    <h4 className="text-base md:text-xl font-bold text-slate-600 leading-relaxed pt-1 md:pt-2">
                      {q.question}
                    </h4>
                  </div>
                  
                  {q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-16">
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 md:p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:border-blue-300 transition-all group cursor-default">
                          <span className="w-8 h-8 md:w-10 md:h-10 bg-white group-hover:bg-slate-400 group-hover:text-white rounded-xl flex items-center justify-center border border-slate-200 text-[10px] md:text-xs text-slate-400 font-black transition-all">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <p className="text-xs md:text-sm font-bold text-slate-500">{opt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-8 md:mt-10 pt-6 border-t border-slate-50 flex justify-end">
                    <div className="px-4 py-2 md:px-5 md:py-2.5 bg-slate-50 text-slate-500 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Përgjigja:</span>
                      <span className="font-bold text-xs md:text-sm">{q.answer}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty State - Rregulluar padding për mobile */}
              {!loading && questions.length === 0 && (
                <div className="bg-white rounded-[48px] border-4 border-dashed border-slate-100 p-10 md:p-20 text-center space-y-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-4">
                    <BrainCircuit size={40} className="text-slate-200" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-300 uppercase tracking-tighter italic">Gati për Gjenerim</h3>
                    <p className="text-slate-300 font-bold text-xs md:text-sm mt-2">Plotëso konfigurimin anash për të filluar.</p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="bg-white rounded-[48px] p-10 md:p-20 text-center space-y-8">
                  <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto">
                    <div className="absolute inset-0 border-8 border-slate-50 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-slate-400 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-400 uppercase tracking-tighter italic">Duke Procesuar...</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}