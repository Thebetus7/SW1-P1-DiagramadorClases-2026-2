"use client";

import React from "react";
import { Sparkles, MessageSquare, Bot } from "lucide-react";

interface CanvasCopilotBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
  isThinking?: boolean;
}

export function CanvasCopilotBubble({
  isOpen,
  onToggle,
  unreadCount = 0,
  isThinking = false,
}: CanvasCopilotBubbleProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Indicador flotante cuando la IA está pensando tras una edición manual */}
      {isThinking && !isOpen && (
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-indigo-400/40 flex items-center gap-2 animate-in fade-in slide-in-from-right-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
            Pensando sugerencia...
          </span>
        </div>
      )}

      <button
        onClick={onToggle}
        className={`p-3.5 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center group ${
          isOpen
            ? "bg-slate-800 text-slate-200 rotate-90 scale-95 hover:bg-slate-900"
            : isThinking
            ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white ring-4 ring-indigo-400/60 shadow-indigo-500/40 hover:scale-105 active:scale-95"
            : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white hover:scale-105 hover:shadow-indigo-500/25 active:scale-95"
        }`}
        title={isOpen ? "Cerrar Copilot IA" : isThinking ? "Copilot está pensando..." : "Abrir Copilot IA"}
        aria-label="Abrir asistente Copilot"
      >
        <div className="relative">
          {isOpen ? (
            <Bot className="w-6 h-6 transition-transform group-hover:scale-110" />
          ) : (
            <>
              <Sparkles className={`w-6 h-6 ${isThinking ? "animate-spin text-amber-200" : "animate-pulse"}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[20px] h-[20px] rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md animate-bounce">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </>
          )}
        </div>
      </button>
    </div>
  );
}
