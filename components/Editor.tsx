import React, { useRef, useState, useEffect, useCallback } from 'react';
import { editImageWithMask } from '../services/geminiService';
import { Loading } from './Loading';

interface EditorProps {
  imageBase64: string;
  onUpdateImage: (newImage: string) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ imageBase64, onUpdateImage, onCancel, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Layer for drawing mask
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageBase64;
    img.onload = () => {
      // Fit canvas to container while maintaining aspect ratio
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const scale = Math.min(1, containerWidth / img.width);
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // We don't draw the image on the canvas. 
      // The image is shown via an <img> tag behind the canvas.
      // The canvas is transparent and used ONLY for the mask.
      
      // Set canvas CSS size to match displayed image size
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    };
  }, [imageBase64]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.beginPath(); // Reset path
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    // Visual feedback for the mask: semi-transparent red
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; 
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleClearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleGenerativeFill = async () => {
    if (!prompt.trim()) {
      onError("Please describe what to fill in the brushed area.");
      return;
    }

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create a composite image to send to Gemini
      // Logic: Draw the original image, then draw the mask on top.
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvas.width;
      compositeCanvas.height = canvas.height;
      const ctx = compositeCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Original Image
      const img = new Image();
      img.src = imageBase64;
      await new Promise((resolve) => { img.onload = resolve; });
      ctx.drawImage(img, 0, 0);

      // 2. Draw Mask (The Red Overlay)
      // We send this explicitly so the model "sees" the red area.
      ctx.drawImage(canvas, 0, 0);

      const maskedDataUrl = compositeCanvas.toDataURL('image/png');

      const result = await editImageWithMask(imageBase64, maskedDataUrl, prompt);
      onUpdateImage(result);
      // Clear mask after successful edit
      handleClearMask();
      setPrompt('');
    } catch (err: any) {
      onError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      
      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-dark-card border border-white/10 group select-none"
        style={{ minHeight: '300px' }}
      >
         {/* Underlying Image */}
        <img 
          src={imageBase64} 
          alt="Editing target" 
          className="w-full h-auto block pointer-events-none"
        />
        
        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Floating Brush Preview (CSS only) */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded pointer-events-none">
          Brush Mode Active
        </div>
      </div>

      {/* Controls */}
      <div className="bg-dark-card p-6 rounded-2xl border border-white/5 shadow-xl space-y-6">
        
        {/* Brush Controls */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Brush Size</span>
            <button onClick={handleClearMask} className="text-red-400 hover:text-red-300 transition-colors">Clear Mask</button>
          </div>
          <input 
            type="range" 
            min="5" 
            max="100" 
            value={brushSize} 
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
        </div>

        {/* Prompt Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Generative Fill Prompt</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what to add in the red area (e.g. 'a red rose')"
              className="flex-1 bg-dark-input border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerativeFill()}
            />
            <button 
              onClick={handleGenerativeFill}
              disabled={isProcessing || !prompt.trim()}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {isProcessing ? 'Filling...' : 'Generate Fill'}
            </button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-4 justify-between items-center">
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Exit Editor
            </button>
            
            {isProcessing && <div className="text-sm text-brand-400 animate-pulse">Gemini is processing your edit...</div>}
        </div>
      </div>
    </div>
  );
};
