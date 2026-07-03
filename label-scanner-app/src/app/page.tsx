'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ScanResult {
  modelo: string;
  talla: string;
  cm: string;
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        scanImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const scanImage = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la imagen.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-2">
            <Camera className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Label Scanner</h1>
          <p className="text-gray-400 text-sm">Captura la viñeta del calzado para extraer sus datos automáticamente.</p>
        </div>

        {/* Scanner Area */}
        {!image ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer group"
          >
            <div className="bg-gray-800 group-hover:bg-blue-500/20 p-4 rounded-full mb-4 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-400" />
            </div>
            <h3 className="font-medium text-lg mb-1">Tocar para Escanear</h3>
            <p className="text-gray-500 text-sm text-center">Usa la cámara de tu celular o sube una foto de la etiqueta.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 aspect-square flex items-center justify-center">
              <img src={image} alt="Captured label" className="object-contain w-full h-full opacity-60" />
              
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-blue-400 font-medium animate-pulse">Analizando viñeta con IA...</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-green-400 mb-6">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-semibold">Datos Extraídos</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Modelo / Marca</label>
                    <p className="text-lg font-medium mt-1">{result.modelo || 'No detectado'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Talla</label>
                      <p className="text-2xl font-bold text-white mt-1">{result.talla || '--'}</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Longitud</label>
                      <p className="text-2xl font-bold text-white mt-1">{result.cm ? `${result.cm} CM` : '--'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <button 
              onClick={resetScanner}
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              Escanear Otra Etiqueta
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef}
          onChange={handleImageCapture}
          className="hidden"
        />

      </div>
    </main>
  );
}
