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
  Loader2
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-[#F8FAFC] min-h-screen text-slate-900">
      {/* Header Section */}
      <div className="mb-6 md:mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 md:gap-5">
          <button 
            onClick={() => router.push('/dashboard')}
            className="group p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:shadow-md transition-all"
          >
            <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-blue-600 text-white text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">AI Powered</span>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase italic flex items-center gap-2">
                  Generator
                </h1>
            </div>
            <p className="text-slate-500 font-medium italic text-xs md:text-sm">Krijo provime profesionale me AI.</p>
          </div>
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button 
            type="button"
            onClick={() => router.push('/dashboard/history')}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 md:px-6 py-3 rounded-2xl font-black text-[10px] md:text-xs uppercase hover:bg-slate-50 transition-all shadow-sm flex-1 lg:flex-none"
          >
            <Clock size={16} className="text-blue-600" /> Historiku
          </button>

          {questions.length > 0 && (
              <button 
                onClick={handleSaveToHistory}
                disabled={isSaving || isSaved}
                className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-2xl font-black text-[10px] md:text-xs uppercase transition-all shadow-md flex-1 lg:flex-none
                  ${isSaved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isSaved ? <CheckCircle size={16} /> : (isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />)}
                {isSaved ? 'U Ruajt' : (isSaving ? 'Duke ruajtur...' : 'Ruaj')}
              </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* Form Section */}
        <form onSubmit={handleGenerate} className="lg:col-span-4 bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 h-fit lg:sticky lg:top-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                <User size={14} className="text-blue-500" /> Detajet e Profesorit
              </label>
              <input 
                type="text" 
                placeholder="Emri i plotë"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-sm text-slate-900 transition-all placeholder:font-medium"
                value={formData.professorName}
                onChange={(e) => setFormData({...formData, professorName: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                <Book size={14} className="text-blue-500" /> Lënda & Tema
              </label>
              <div className="space-y-2">
                <input 
                    type="text" 
                    placeholder="Lënda"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-sm text-slate-900 transition-all placeholder:font-medium"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                />
                <input 
                    type="text" 
                    placeholder="Tema specifike"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-sm text-slate-900 transition-all placeholder:font-medium"
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                  <Layers size={14} /> Niveli
                </label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none text-slate-900 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: e.target.value})}
                >
                  <option value="Fillore">Fillore</option>
                  <option value="Mesme">E Mesme</option>
                  <option value="Fakultet">Fakultet</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                  <BarChart3 size={14} /> Vështirësia
                </label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none text-slate-900 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                >
                  <option value="Easy">I lehtë</option>
                  <option value="Medium">Mesatar</option>
                  <option value="Hard">I vështirë</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                  <ListOrdered size={14} /> Pyetje
                </label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none text-slate-900 focus:border-blue-500 transition-all"
                  value={formData.numQuestions}
                  onChange={(e) => setFormData({...formData, numQuestions: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                  <Target size={14} /> Tipi
                </label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none text-slate-900 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="multiple-choice">Me zgjedhje</option>
                  <option value="open-ended">Me shkrim</option>
                </select>
              </div>
            </div>

            <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                  <PlusCircle size={14} /> Instruksione
                </label>
                <textarea 
                    placeholder="Opsionale..."
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-sm text-slate-900 transition-all min-h-[80px]"
                    value={formData.extraInfo}
                    onChange={(e) => setFormData({...formData, extraInfo: e.target.value})}
                />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="group w-full bg-slate-900 text-white py-5 rounded-[20px] md:rounded-[24px] font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-black transition-all disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} className="text-blue-400" />}
            {loading ? "Duke punuar..." : "Gjenero Provimin"}
          </button>
        </form>

        {/* Results Section */}
        <div className="lg:col-span-8 space-y-6 pb-20">
          <div className="flex flex-row justify-between items-center px-2 gap-4">
            <h2 className="text-sm md:text-xl font-black uppercase italic text-slate-800 flex items-center gap-2 md:gap-3">
              {questions.length > 0 ? (
                <>
                  <div className="w-1.5 md:w-2 h-6 md:h-8 bg-blue-600 rounded-full"></div>
                  Fleta e Provimit
                </>
              ) : (
                "Preview"
              )}
            </h2>
            
            {questions.length > 0 && (
                <div className="flex gap-2">
                    <button 
                        onClick={downloadWord}
                        className="p-2 md:p-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 font-bold text-[10px] md:text-xs uppercase"
                    >
                        <FileText size={14} className="text-blue-600" /> <span className="hidden sm:inline">Word</span>
                    </button>
                    <button 
                        onClick={downloadPDF}
                        className="p-2 md:p-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 font-bold text-[10px] md:text-xs uppercase"
                    >
                        <FileDown size={14} className="text-red-600" /> <span className="hidden sm:inline">PDF</span>
                    </button>
                </div>
            )}
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="group bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                  <span className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black italic text-sm md:text-base">
                    {idx + 1}
                  </span>
                  <h3 className="text-base md:text-lg font-bold text-slate-800 mt-1 md:mt-1.5 leading-relaxed">
                    {q.question}
                  </h3>
                </div>
                
                {q.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 ml-0 md:ml-14">
                    {q.options.map((opt, i) => (
                      <div key={i} className="group/opt p-3 md:p-4 bg-slate-50 text-slate-900 rounded-[16px] md:rounded-[20px] border border-slate-100 text-xs md:text-sm font-bold flex items-center gap-3 md:gap-4 hover:bg-white hover:border-blue-500 hover:shadow-sm transition-all cursor-default">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-white group-hover/opt:bg-blue-600 group-hover/opt:text-white rounded-lg md:rounded-xl flex items-center justify-center border border-slate-200 text-[10px] text-slate-400 font-black transition-colors">
                            {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-green-50 text-green-700 rounded-full border border-green-100">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter italic">Saktë:</span>
                        <span className="text-xs md:text-sm font-bold">{q.answer}</span>
                    </div>
                </div>
              </div>
            ))}

            {!loading && questions.length === 0 && (
              <div className="text-center py-20 md:py-32 bg-white rounded-[32px] md:rounded-[48px] border-2 border-dashed border-slate-200 text-slate-400">
                <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto mb-6">
                    <BrainCircuit size={60} className="absolute inset-0 opacity-10 animate-pulse md:hidden" />
                    <BrainCircuit size={80} className="absolute inset-0 opacity-10 animate-pulse hidden md:block" />
                    <Sparkles size={30} className="absolute bottom-0 right-0 text-blue-200" />
                </div>
                <h3 className="font-black uppercase text-xs md:text-sm tracking-widest text-slate-300 italic">Sistemi është gati</h3>
                <p className="text-[10px] md:text-xs font-medium mt-2 text-slate-300 px-4">Plotëso formularin për të filluar.</p>
              </div>
            )}

            {loading && (
                <div className="text-center py-20 md:py-32 bg-white rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-inner">
                    <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <h3 className="font-black uppercase text-xs md:text-sm tracking-widest text-slate-800 italic">Duke u krijuar...</h3>
                    <p className="text-[10px] md:text-xs font-medium mt-2 text-slate-500 animate-pulse">AI po formulon pyetjet.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}