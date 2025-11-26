import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { generateImage } from './services/geminiService';
import { AspectRatio } from './types';
import { Loading } from './components/Loading';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  // History stores previous states for undo functionality
  const [history, setHistory] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const base64 = await generateImage(prompt, ratio);
      setCurrentImage(base64);
      setHistory([base64]); // Reset history on new generation
    } catch (err: any) {
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateImage = useCallback((newImage: string) => {
    setHistory(prev => [...prev, newImage]);
    setCurrentImage(newImage);
  }, []);

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current
      const previous = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentImage(previous);
    }
  };

  const handleReset = () => {
    if (history.length > 0) {
      const original = history[0];
      setHistory([original]);
      setCurrentImage(original);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `gemini-gen-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white selection:bg-brand-500/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        
        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg flex justify-between items-center">
             <span>{error}</span>
             <button onClick={() => setError(null)} className="text-white/60 hover:text-white">&times;</button>
          </div>
        )}

        {/* MODE: GENERATE (Initial State or if no image) */}
        {!currentImage && mode === 'generate' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
                Imagine Anything
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Generate high-quality images instantly using Gemini 2.5 Flash. Free and fast.
              </p>
            </div>

            <div className="w-full max-w-2xl bg-dark-card p-6 md:p-8 rounded-3xl shadow-2xl border border-white/5 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic city with flying cars at sunset, cyberpunk style..."
                  className="w-full bg-dark-input border-0 rounded-xl p-4 text-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 resize-none h-32 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Aspect Ratio</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {Object.values(AspectRatio).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRatio(r)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                        ratio === r 
                          ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/25' 
                          : 'bg-dark-input border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold rounded-xl shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] text-lg"
              >
                {isGenerating ? 'Generating...' : 'Generate Image'}
              </button>
            </div>
            
            {isGenerating && <Loading />}
          </div>
        )}

        {/* MODE: VIEW / EDIT (Result State) */}
        {currentImage && (
          <div className="flex flex-col gap-8">
            
            {mode === 'generate' ? (
              /* Viewer Mode */
              <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative group rounded-xl overflow-hidden shadow-2xl border border-white/10 max-w-4xl w-full">
                  <img src={currentImage} alt="Generated result" className="w-full h-auto" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6">
                    <span className="text-white/80 text-sm font-mono truncate max-w-[70%]">{prompt}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 bg-dark-card hover:bg-white/10 text-white rounded-full font-medium border border-white/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>
                  
                  <button 
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-medium shadow-lg shadow-brand-500/25 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Continue Editing (Fill)
                  </button>
                  
                  <button 
                    onClick={() => { setCurrentImage(null); setHistory([]); setPrompt(''); }}
                    className="flex items-center gap-2 px-6 py-3 bg-dark-card hover:bg-white/10 text-gray-400 hover:text-red-400 rounded-full font-medium border border-white/10 transition-all"
                  >
                    New Image
                  </button>
                </div>
              </div>
            ) : (
              /* Editor Mode */
              <div className="flex flex-col gap-6 w-full">
                <div className="flex justify-between items-center bg-dark-card p-4 rounded-xl border border-white/5">
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUndo} 
                      disabled={history.length <= 1}
                      className="p-2 rounded hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
                      title="Undo last change"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button 
                      onClick={handleReset}
                      disabled={history.length <= 1}
                      className="p-2 rounded hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
                      title="Reset to original"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={handleDownload}
                      className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Download Current
                    </button>
                    <button 
                      onClick={() => setMode('generate')}
                      className="bg-brand-600 px-4 py-2 rounded text-sm font-medium hover:bg-brand-500 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>

                <Editor 
                  imageBase64={currentImage}
                  onUpdateImage={handleUpdateImage}
                  onCancel={() => setMode('generate')}
                  onError={(msg) => setError(msg)}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
