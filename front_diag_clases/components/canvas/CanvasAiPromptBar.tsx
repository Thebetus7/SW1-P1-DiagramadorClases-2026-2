"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Mic, MicOff, Send, Loader2, Info, X, HelpCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface CanvasAiPromptBarProps {
  onExecutePrompt: (promptText: string) => Promise<string | void>;
  isLoading: boolean;
}

// Declaración de tipos para Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function CanvasAiPromptBar({
  onExecutePrompt,
  isLoading,
}: CanvasAiPromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializar Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const customWindow = window as unknown as IWindow;
    const SpeechRecognition =
      customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      if (text) {
        setPrompt((prev) => {
          // Si el input estaba vacío o si es una transcripción continua
          return text.trim();
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        setFeedbackMessage({
          text: "Permiso de micrófono denegado en el navegador.",
          type: "error",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // Ignorar
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionSupported) {
      setFeedbackMessage({
        text: "El reconocimiento de voz no es compatible con este navegador.",
        type: "error",
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.warn(e);
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setFeedbackMessage({
          text: "Escuchando... Di tu comando UML en voz alta.",
          type: "info",
        });
        inputRef.current?.focus();
      } catch (e) {
        console.warn("Error starting speech recognition:", e);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isLoading) return;

    // Detener escucha si estaba activa
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    }

    setFeedbackMessage(null);

    try {
      const explanation = await onExecutePrompt(cleanPrompt);
      setPrompt("");
      if (explanation) {
        setFeedbackMessage({
          text: explanation,
          type: "success",
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        text: err.message || "Error al procesar la instrucción con la IA.",
        type: "error",
      });
    }
  };

  const handleSuggestionClick = (suggestedText: string) => {
    setPrompt(suggestedText);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const suggestions = [
    "Añade una clase Factura con atributos id: int, total: double y método calcularTotal(): double",
    "Relaciona la clase Usuario con Factura con agregación y que diga 'genera'",
    "Conecta la clase Carrito con Producto con composición y que diga 'contiene'",
    "Relaciona Usuario con Colaborador y que diga 'depende'",
    "Incluye la interfaz Autenticable a la clase Usuario con método autenticar(token: string): boolean",
    "Añade una nota con el texto 'Regla de negocio: validar stock antes de crear pedido' para la clase Pedido",
    "Crea una relación de herencia entre Persona y Usuario",
  ];

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-3xl flex flex-col items-center select-none pointer-events-auto">
      {/* Sugerencias Rápidas Desplegables */}
      {showSuggestions && (
        <div className="w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl p-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Sparkles className="w-3.5 h-3.5" />
              Ejemplos de Prompts UML para Gemini 2.5 Flash:
            </span>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s)}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/70 hover:text-indigo-900 border border-slate-200/70 text-slate-700 transition-colors text-[11px] leading-relaxed truncate"
                title={s}
              >
                &ldquo;{s}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje de Feedback / Explicación */}
      {feedbackMessage && (
        <div
          className={`w-full mb-2 px-3.5 py-2 rounded-lg text-xs flex items-center justify-between border shadow-md animate-in fade-in slide-in-from-bottom-1 duration-150 ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : feedbackMessage.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-blue-50 border-blue-300 text-blue-900"
          }`}
        >
          <div className="flex items-center gap-2 pr-2">
            {feedbackMessage.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            {feedbackMessage.type === "error" && (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            {feedbackMessage.type === "info" && (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-medium text-[12px]">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-black/5 rounded text-current opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra Principal de Prompt */}
      <div className="w-full bg-white/95 backdrop-blur-md border border-slate-300/90 shadow-2xl rounded-2xl p-1.5 flex items-center gap-2 ring-1 ring-black/5 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        {/* Badge / Indicador de Gemini 2.5 Flash */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2.5 pr-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200/60 rounded-xl text-[11px] font-semibold shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Gemini IA</span>
        </div>

        {/* Input de Texto */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder={
              isListening
                ? "🎙️ Escuchando... Di lo que deseas añadir o modificar en el diagrama"
                : "Describe cambios con IA: 'añade clase X con atributos...', 'relaciona con agregación...', etc."
            }
            className={`w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-60 font-sans ${
              isListening ? "text-indigo-700 font-medium animate-pulse" : ""
            }`}
          />
        </form>

        {/* Botón de Sugerencias / Ayuda */}
        <button
          type="button"
          onClick={() => setShowSuggestions((prev) => !prev)}
          title="Ver sugerencias de prompts UML"
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Botón de Micrófono (Speech to Text) */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          title={isListening ? "Detener grabación de voz" : "Dictar comando por voz"}
          className={`p-2 rounded-xl transition-all shrink-0 relative ${
            isListening
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse ring-2 ring-rose-300"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          {isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Botón de Enviar a Gemini */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!prompt.trim() || isLoading}
          title="Ejecutar instrucción con Gemini AI"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0 ${
            !prompt.trim() || isLoading
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:shadow-md active:scale-95"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Procesando...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Generar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
