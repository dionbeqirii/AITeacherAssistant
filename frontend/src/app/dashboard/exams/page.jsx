"use client";
import { useState } from 'react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { Sparkles, BrainCircuit, Download } from 'lucide-react';

export default function ExamsPage() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({
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
        alert("Gabim: " + result.error);
      }
    } catch (error) {
      alert("Nuk u arrit lidhja me serverin.");
    } finally {
      setLoading(false);
    }
  };

  const downloadWord = () => {
    const doc = new Document({
      sections: [{
        children: [
          // Titulli i Provimit
          new Paragraph({
            text: `PROVIM: ${formData.subject.toUpperCase()}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          // Detajet (Tema dhe Niveli)
          new Paragraph({
            text: `Tema: ${formData.topic} | Niveli: ${formData.level} | Vështirësia: ${formData.difficulty}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Hapësirë për të dhënat e studentit
          new Paragraph({
            children: [
              new TextRun({ text: "Emri dhe Mbiemri: ___________________________    Data: ________", size: 24 }),
            ],
            spacing: { after: 600 },
          }),

          // Gjenerimi i pyetjeve në Word
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
      saveAs(blob, `${formData.subject || 'Provim'}_Gjeneruar.docx`);
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic flex items-center gap-3">
            <Sparkles className="text-blue-600" /> Exam Generator
          </h1>
          <p className="text-slate-500 font-medium italic">Krijo provime profesionale me AI brenda sekondave.</p>
        </div>

        {questions.length > 0 && (
          <button 
            onClick={downloadWord}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
          >
            <Download size={20} /> Shkarko në Word
          </button>
        )}
      </div>
      
      <form onSubmit={handleGenerate} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Lënda</label>
            <input 
              type="text" 
              placeholder="Psh. Arkitektura e Kompjuterit"
              className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tema specifike</label>
            <input 
              type="text" 
              placeholder="Psh. Memorja Cache dhe RAM"
              className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
              value={formData.topic}
              onChange={(e) => setFormData({...formData, topic: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Niveli</label>
            <select 
              className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none"
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value})}
            >
              <option value="Fillore">Fillore</option>
              <option value="Mesme">E Mesme</option>
              <option value="Fakultet">Fakultet</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Vështirësia</label>
            <select 
              className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none"
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
            >
              <option value="Easy">I lehtë</option>
              <option value="Medium">Mesatar</option>
              <option value="Hard">I vështirë</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nr. i pyetjeve</label>
            <input 
              type="number" 
              min="1" max="20" 
              className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none"
              value={formData.numQuestions}
              onChange={(e) => setFormData({...formData, numQuestions: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tipi</label>
            <select 
              className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="multiple-choice">Me zgjedhje</option>
              <option value="open-ended">Me shkrim</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Udhëzime shtesë</label>
          <textarea 
            placeholder="Psh. Përfshij pyetje nga Kapitulli 2..."
            className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
            rows="2"
            value={formData.extraInfo}
            onChange={(e) => setFormData({...formData, extraInfo: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all disabled:bg-slate-300"
        >
          {loading ? "Duke gjeneruar..." : "Gjenero Provimin"}
        </button>
      </form>

      <div className="mt-10 space-y-6">
        {questions.length > 0 && (
          <h2 className="text-xl font-black uppercase italic text-slate-700">Pyetjet e Gjeneruara</h2>
        )}

        {questions.map((q, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex gap-3">
              <span className="text-blue-600">Q{idx + 1}.</span> {q.question}
            </h3>
            
            {q.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-8">
                {q.options.map((opt, i) => (
                  <div key={i} className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 bg-white rounded-md flex items-center justify-center border text-[10px]">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-dashed border-slate-100">
               <p className="text-[10px] font-black uppercase text-green-600 tracking-widest italic">Përgjigja e saktë: {q.answer}</p>
            </div>
          </div>
        ))}

        {!loading && questions.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400">
            <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase text-xs tracking-widest italic">Sistemi gati për gjenerim</p>
          </div>
        )}
      </div>
    </div>
  );
}