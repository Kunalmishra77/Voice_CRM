import React, { useState } from 'react';
import { useDiagnosticsStore } from '../../state/diagnosticsStore';
import { AlertCircle, X, ChevronDown, ChevronUp, Database, Key, ShieldAlert } from 'lucide-react';

export const DiagnosticsPanel: React.FC = () => {
  const { errors, removeError, clearErrors } = useDiagnosticsStore();
  const [isOpen, setIsOpen] = useState(true);

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden border border-red-500/20 bg-zinc-950 text-white font-sans">
      <div 
        className="bg-red-500/10 px-4 py-3 border-b border-red-500/20 flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="text-red-500 w-5 h-5" />
          <h3 className="font-bold text-red-400">Diagnostics Panel (Dev Only)</h3>
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {errors.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={clearErrors}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Clear All
            </button>
          </div>
          
          {errors.map((error) => (
            <div key={error.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 relative group">
              <button 
                onClick={() => removeError(error.id)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-start gap-3">
                {error.type === 'env' && <Key className="text-yellow-500 w-5 h-5 mt-0.5 shrink-0" />}
                {error.type === 'db' && <Database className="text-red-500 w-5 h-5 mt-0.5 shrink-0" />}
                {error.type === 'auth' && <ShieldAlert className="text-orange-500 w-5 h-5 mt-0.5 shrink-0" />}
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-zinc-200">
                      {error.type.toUpperCase()} ERROR
                    </span>
                    {error.status && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        HTTP {error.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-red-300 font-medium break-words">
                    {error.message}
                  </div>
                  
                  {(error.table || error.action) && (
                    <div className="flex gap-2 text-xs font-mono bg-black/50 p-2 rounded-lg text-zinc-300">
                      {error.table && <span><span className="text-zinc-500">Table:</span> {error.table}</span>}
                      {error.action && <span><span className="text-zinc-500">Action:</span> {error.action}</span>}
                    </div>
                  )}
                  
                  {error.hint && (
                    <div className="text-xs text-amber-300/80 bg-amber-500/10 p-2 rounded-lg mt-2">
                      <strong className="text-amber-500">Hint:</strong> {error.hint}
                    </div>
                  )}

                  {error.recommendedFix && (
                    <div className="text-xs text-emerald-300/80 bg-emerald-500/10 p-2 rounded-lg mt-2">
                      <strong className="text-emerald-500">Recommended Fix:</strong><br/>
                      {error.recommendedFix}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
