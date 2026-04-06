"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import jsPDF from 'jspdf'; // KËTU ISHTE GABIMI (duhet jspdf me të vogla)
import 'jspdf-autotable';
import { 
  Calendar, 
  BookOpen, 
  ArrowLeft, 
  Clock, 
  X,
  FileText,
  FileDown,
  User,
  Trash2 // E shtuar: Ikona për fshirje
} from 'lucide-react';

export default function HistoryPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/v1/exams/history');
      const result = await res.json();
      if (result.success) setExams(result.data);
    } catch (error) {
      console.error("Gabim gjatë marrjes së historikut");
    } finally {
      setLoading(false);
    }
  };

  // FUNKSIONI I RI PËR FSHIRJE
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Parandalon hapjen e modalit kur klikon koshin
    if (!confirm("A jeni i sigurt që dëshironi ta fshini këtë provim?")) return;

    try {
      const res = await fetch(`/api/v1/exams/delete?id=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        setExams(exams.filter(exam => exam.id !== id));
      } else {
        alert("Gabim gjatë fshirjes: " + result.error);
      }
    } catch (error) {
      alert("Nuk u arrit lidhja me serverin.");
    }
  };

  const downloadWord = (exam) => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: `PROVIM: ${exam.subject.toUpperCase()}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Profesor: ${exam.professor_name} | Tema: ${exam.topic}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Niveli: ${exam.level} | Vështirësia: ${exam.difficulty}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Emri dhe Mbiemri: ___________________________    Data: ________", size: 24 }),
            ],
            spacing: { after: 600 },
          }),
          ...exam.questions.flatMap((q, index) => [
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
      saveAs(blob, `${exam.subject || 'Provim'}_Histori.docx`);
    });
  };

  const downloadPDF = (exam) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(`PROVIM: ${exam.subject.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Profesor: ${exam.professor_name} | Tema: ${exam.topic}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Niveli: ${exam.level} | Vështirësia: ${exam.difficulty}`, pageWidth / 2, 36, { align: 'center' });

    doc.line(20, 45, pageWidth - 20, 45);
    doc.text("Emri dhe Mbiemri: ___________________________    Data: ________", 20, 55);

    let yPos = 70;
    exam.questions.forEach((q, index) => {
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
    doc.save(`${exam.subject || 'Provim'}_Histori.pdf`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen text-slate-900">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 shadow-sm transition-all"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic">Historiku i Provimeve</h1>
          <p className="text-slate-500 font-medium italic text-sm">Shiko dhe shkarko provimet e ruajtura.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="font-bold text-slate-400 uppercase italic">Duke ngarkuar...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400">
          <Clock size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold uppercase text-xs tracking-widest italic">Nuk ka asnjë provim.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="group bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <BookOpen size={24} />
                </div>
                {/* BUTTONI I FSHIRJES - Shfaqet kur bëhet hover mbi kartelë */}
                <button 
                  onClick={(e) => handleDelete(exam.id, e)}
                  className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1 rounded-full text-slate-500 flex items-center gap-1 w-fit mb-3">
                <Calendar size={12} />
                {new Date(exam.created_at).toLocaleDateString('sq-AL')}
              </div>

              <h3 className="text-xl font-black text-slate-800 uppercase italic mb-1 truncate">{exam.subject}</h3>
              <p className="text-slate-500 text-sm font-medium mb-4 flex-grow line-clamp-2">{exam.topic}</p>
              
              <button 
                onClick={() => setSelectedExam(exam)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-black transition-all"
              >
                 Shiko & Shkarko
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase italic">{selectedExam.subject}</h2>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <User size={14} className="text-blue-500" /> {selectedExam.professor_name}
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={() => downloadWord(selectedExam)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-black transition-all"
                >
                  <FileText size={16} /> Word
                </button>
                <button 
                  onClick={() => downloadPDF(selectedExam)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-red-700 transition-all"
                >
                  <FileDown size={16} /> PDF
                </button>
                <button onClick={() => setSelectedExam(null)} className="ml-2 p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 bg-white">
              {selectedExam.questions.map((q, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="font-black text-slate-800 mb-3"><span className="text-blue-600">{idx + 1}.</span> {q.question}</p>
                  {q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                      {q.options.map((opt, i) => (
                        <div key={i} className="text-sm bg-white p-2 rounded-lg border border-slate-200 font-medium flex items-center gap-2">
                           <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black">{String.fromCharCode(65 + i)}</span>
                           {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-[10px] font-black uppercase text-green-600 italic tracking-widest">Përgjigja saktë: {q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}