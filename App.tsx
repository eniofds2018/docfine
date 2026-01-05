
import React, { useState, useRef } from 'react';
import * as mammoth from 'mammoth';
import { asBlob } from 'html-docx-js-typescript';
import { 
  FileUp, FileText, Layout, CheckCircle, Download, 
  Loader2, Trash2, Settings, FileDown, Check, Info, FileCheck, ShieldCheck
} from 'lucide-react';
import { analyzeDocument } from './services/gemini';
import { AnalysisResult, DocumentState } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [docState, setDocState] = useState<DocumentState | null>(null);
  const [formattedContent, setFormattedContent] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const plainText = await mammoth.extractRawText({ arrayBuffer });
        
        setDocState({
          rawText: plainText.value,
          htmlContent: result.value,
          fileName: file.name
        });
        setFormattedContent(result.value);
        setCurrentStep(2);
      } catch (err) {
        alert("Erro ao ler o arquivo. Use arquivos .docx válidos.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const startAnalysis = async () => {
    if (!docState) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeDocument(docState.rawText);
      setAnalysis(result);
      setFormattedContent(result.formattedHtml);
      setCurrentStep(3);
    } catch (err) {
      alert("Falha ao limpar documento. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportWord = async () => {
    if (!formattedContent) return;
    setIsExporting(true);
    try {
      const docHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { margin: 3cm 2cm 2cm 3cm; }
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 12pt; 
              line-height: 1.5; 
              text-align: justify;
              color: #000000;
            }
            p { margin-bottom: 12pt; text-indent: 1.25cm; }
            table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
            th, td { border: 1px solid black; padding: 6pt; }
            h1, h2, h3 { font-weight: bold; margin: 18pt 0 12pt 0; text-align: left; text-indent: 0; }
          </style>
        </head>
        <body>
          ${formattedContent}
        </body>
        </html>
      `;

      const blob = await asBlob(docHtml, { orientation: 'portrait' });
      const finalBlob = new Blob([blob as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DocRefine_Limpo_${docState?.fileName || 'documento'}.docx`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 150);
      
    } catch (err) {
      alert("Erro na geração do arquivo Word.");
    } finally {
      setIsExporting(false);
    }
  };

  const reset = () => {
    setDocState(null);
    setAnalysis(null);
    setFormattedContent('');
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col font-sans selection:bg-blue-100 text-slate-900">
      <header className="bg-white/90 backdrop-blur-lg border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none text-slate-800">DocRefine <span className="text-blue-600">Clean</span></h1>
          </div>
        </div>
        
        {docState && (
          <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm border border-transparent hover:border-red-100">
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Recomeçar</span>
          </button>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:py-12">
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto mt-10 text-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-widest mb-10 shadow-sm">
               <FileCheck className="w-4 h-4" /> Limpeza de Metadados e IA Residues
            </div>
            <h2 className="text-6xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">Seu Word, livre de <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">vestígios de IA.</span></h2>
            <p className="text-slate-500 mb-14 text-xl leading-relaxed max-w-lg mx-auto font-medium">Remova automaticamente comentários de chat e formatações inconsistentes. Preservamos tabelas, quadros e imagens.</p>
            
            <label className="relative flex flex-col items-center justify-center w-full h-[30rem] border-4 border-dashed border-slate-200 rounded-[4rem] bg-white hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all shadow-2xl group active:scale-[0.99]">
              <div className="bg-blue-600 p-10 rounded-[2.5rem] mb-10 shadow-2xl shadow-blue-200 group-hover:scale-110 transition-transform duration-700">
                <FileUp className="w-20 h-20 text-white" />
              </div>
              <p className="text-3xl font-black text-slate-800 tracking-tight">Arraste seu documento</p>
              <p className="text-slate-400 mt-4 font-bold text-lg">Clique para selecionar seu arquivo .docx</p>
              <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {currentStep === 2 && docState && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in zoom-in duration-700">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-10 justify-between">
              <div className="flex items-center gap-8">
                <div className="bg-blue-50 p-7 rounded-3xl"><FileText className="w-14 h-14 text-blue-600" /></div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{docState.fileName}</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Pronto para higienização</p>
                </div>
              </div>
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-16 py-7 rounded-[2rem] font-black text-2xl shadow-2xl shadow-blue-200 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-10 h-10 animate-spin" /> : <Settings className="w-10 h-10" />}
                {isAnalyzing ? "Limpando..." : "Limpar Documento"}
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-right-10 duration-1000">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-950 text-white p-12 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] space-y-10 sticky top-32 border border-white/5">
                <div>
                  <h3 className="text-4xl font-black flex items-center gap-5 mb-5 tracking-tighter"><Download className="w-10 h-10 text-blue-500" /> Pronto</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    Padronizado: <strong>Arial 12</strong>, <strong>1.5</strong> e <strong>Justificado</strong>.<br/>
                    Todos os resíduos de IA e metadados foram removidos com sucesso.
                  </p>
                </div>
                
                <button 
                  onClick={handleExportWord}
                  disabled={isExporting}
                  className="flex items-center justify-between w-full bg-blue-600 text-white px-10 py-8 rounded-[2rem] font-black text-2xl hover:bg-blue-500 transition-all active:scale-[0.98] shadow-2xl shadow-blue-900 group"
                >
                  <span className="flex items-center gap-6">
                    <FileDown className="w-10 h-10 group-hover:translate-y-2 transition-transform" /> 
                    {isExporting ? 'Processando' : 'Baixar Word'}
                  </span>
                  {isExporting ? <Loader2 className="w-7 h-7 animate-spin" /> : <Check className="w-7 h-7 text-blue-200" />}
                </button>

                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                   <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Relatório de Limpeza</h4>
                   <p className="text-sm text-slate-300 leading-relaxed italic">"{analysis.summary}"</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-5">
                   <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-200" />
                   <span className="text-sm font-black text-slate-700 uppercase tracking-[0.4em]">Preview do Documento Higienizado</span>
                 </div>
              </div>

              <div 
                ref={previewRef}
                className="bg-white shadow-2xl border border-slate-100 mx-auto w-full max-w-[210mm] min-h-[297mm] p-[35mm] relative overflow-hidden text-slate-950 ring-1 ring-slate-100 rounded-xl"
              >
                <div className="prose prose-slate max-w-none word-preview relative z-10 selection:bg-blue-100">
                  <div 
                    style={{ 
                      fontFamily: "'Arial', sans-serif", 
                      lineHeight: '1.5', 
                      fontSize: '12pt',
                      textAlign: 'justify',
                    }}
                    dangerouslySetInnerHTML={{ __html: formattedContent }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 px-8 text-center mt-auto">
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">
           DocRefine AI • Powered by Advanced Metadata Stripping • 2024
         </p>
      </footer>
    </div>
  );
}
