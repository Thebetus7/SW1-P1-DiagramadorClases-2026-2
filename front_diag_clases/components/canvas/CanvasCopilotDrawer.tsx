"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  HelpCircle,
  Code2,
  MessageSquareText,
  Pencil,
  Ban,
  CheckCircle2,
  XCircle,
  Settings,
  Cpu,
  Image as ImageIcon,
} from "lucide-react";
import { ChatMessage, ChatProposalPayload, CopilotMode, AiEngineConfig } from "@/types";
import { compressImageToJpeg, CompressedImageResult, isValidImageMimeType } from "@/utils/imageCompressor";
import { resolveImageUrl } from "@/utils/imageUrlResolver";
import { ProactiveSuggestionCard } from "./ProactiveSuggestionCard";
import { MarkdownPreview } from "./MarkdownPreview";
import { AiEngineSettingsModal } from "./AiEngineSettingsModal";
import { ImageLightboxModal } from "./ImageLightboxModal";

interface CanvasCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  diagramId: number;
  diagramName: string;
  currentUser?: { id: number; nombre: string } | null;
  messages: ChatMessage[];
  onSendMessage: (
    content: string,
    mode: CopilotMode,
    imageAttachment?: CompressedImageResult | null
  ) => Promise<void>;
  onAcceptProposal: (messageId: string, proposal?: ChatProposalPayload | null) => Promise<void>;
  onIgnoreProposal: (messageId: string) => Promise<void>;
  isLoading: boolean;
  isProactiveThinking?: boolean;
  applyingProposalId?: string | null;
  aiQuotaError: string | null;
  aiConfig?: AiEngineConfig;
  onAiConfigChange?: (config: AiEngineConfig) => void;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function CanvasCopilotDrawer({
  isOpen,
  onClose,
  diagramId,
  diagramName,
  currentUser,
  messages,
  onSendMessage,
  onAcceptProposal,
  onIgnoreProposal,
  isLoading,
  isProactiveThinking = false,
  applyingProposalId = null,
  aiQuotaError,
  aiConfig,
  onAiConfigChange,
}: CanvasCopilotDrawerProps) {
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<CopilotMode>("CHAT");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Estados multimodales para imágenes adjuntas (Spec 07)
  const [attachedImage, setAttachedImage] = useState<CompressedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentAiConfig, setCurrentAiConfig] = useState<AiEngineConfig>(
    aiConfig || {
      provider: "GEMINI_CLOUD",
      localModelId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
      status: "NOT_DOWNLOADED",
      progressPercent: 0,
      webGpuSupported: true,
    }
  );

  useEffect(() => {
    if (aiConfig) {
      setCurrentAiConfig(aiConfig);
    }
  }, [aiConfig]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [showScrollNav, setShowScrollNav] = useState(false);

  const isSendingRef = useRef(false);

  // Deduplicación defensiva de mensajes en el renderizado
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    const result: ChatMessage[] = [];
    for (const msg of messages) {
      const key = msg.id || `${msg.senderType}-${msg.content}-${msg.createdAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(msg);
      }
    }
    return result;
  }, [messages]);

  // Auto-scroll al final con cada nuevo mensaje o al activarse el estado de pensamiento/aplicación
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [uniqueMessages, isOpen, isProactiveThinking, isLoading, applyingProposalId]);

  // Detector de scroll para mostrar atajos flotantes si se aleja más de 150px del fondo (RF-03.2, RB-07)
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollNav(distanceToBottom > 150);
  };

  // IDs de los últimos mensajes para navegación rápida
  const lastAiMessageId = [...uniqueMessages].reverse().find((m) => m.senderType === "COPILOT")?.id;
  const lastUserMessageId = [...uniqueMessages].reverse().find((m) => m.senderType === "USER")?.id;

  const scrollToLastAi = () => {
    const el = document.getElementById("last-ai-msg");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToLastUser = () => {
    const el = document.getElementById("last-user-msg");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Inicializar Web Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const customWindow = window as unknown as IWindow;
    const SpeechRecognition =
      customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInputText((prev) => (prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim()));
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setSpeechFeedback("Permiso de micrófono denegado.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      setSpeechFeedback("Reconocimiento de voz no soportado en este navegador.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setSpeechFeedback(null);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleProcessImageFile = async (file: File) => {
    setImageError(null);
    if (!isValidImageMimeType(file.type)) {
      setImageError("Formato no compatible. Por favor sube una imagen válida (PNG, JPG, WebP)");
      return;
    }
    try {
      setIsCompressing(true);
      const compressed = await compressImageToJpeg(file, 1280, 0.8);
      setAttachedImage(compressed);
      // Conmutar a modo EDITOR automáticamente para generar propuestas interactivas de diagrama (Spec 07)
      setMode("EDITOR");
    } catch (err: any) {
      setImageError(err.message || "Error al procesar y comprimir la imagen.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessImageFile(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessImageFile(files[0]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if ((!text && !attachedImage) || isLoading || isSendingRef.current || isCompressing) return;

    isSendingRef.current = true;
    const imgToSend = attachedImage;
    const textToSend = text || "Analiza la imagen adjunta e incorpora las clases y relaciones al diagrama";
    setInputText("");
    setAttachedImage(null);
    try {
      await onSendMessage(textToSend, mode, imgToSend);
    } catch (sendError) {
      // Si el envío falla, restaurar el texto y la imagen para que el usuario no pierda su trabajo
      setInputText(text);
      setAttachedImage(imgToSend);
      throw sendError;
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <aside
        className="fixed top-0 right-0 h-full w-[420px] max-w-full z-40 bg-white/95 backdrop-blur-md shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        aria-label="Panel de Copilot IA"
      >
      {/* Cabecera del Drawer */}
      <div className="px-4 py-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight">Copilot UML</h2>
              {/* Chip Dinámico de Estado / Modo Activo (RF-03.1 / T6.1) */}
              {applyingProposalId ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-300" />
                  ⚡ Aplicando cambios al lienzo...
                </span>
              ) : isProactiveThinking ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  ⚡ Pensando sugerencia UML...
                </span>
              ) : mode === "EDITOR" ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1 animate-in fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  🟢 En línea · Modo Editor
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-1 animate-in fade-in">
                  💬 En línea · Modo Chat
                </span>
              )}

              {/* Indicador de Motor IA (Cloud vs Local) */}
              {currentAiConfig.provider === "WEBLLM_LOCAL" ? (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Cpu className="w-2.5 h-2.5 text-emerald-300" />
                  Local
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Cloud
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-[240px] mt-0.5">
              {diagramName || "Diagrama de Clases"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Configurar motor IA (Cloud Gemini vs Local WebLLM)"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Alerta de Cuota Saturada (Texto en Rojo según especificación) */}
      {aiQuotaError && (
        <div className="m-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{aiQuotaError}</span>
        </div>
      )}

      {/* Historial de Mensajes con Controles Flotantes de Navegación Rápida (RF-03.2, RB-07) */}
      <div className="relative flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {uniqueMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bot className="w-12 h-12 mb-3 text-indigo-200 animate-bounce" />
              <p className="text-sm font-semibold text-slate-700">¡Hola! Soy tu Copilot UML</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                Puedo darte contexto del diagrama, sugerir normalizaciones o editar clases y relaciones en vivo.
              </p>
            </div>
          ) : (
            uniqueMessages.map((msg, index) => {
              const isUser = msg.senderType === "USER";
              const isProactive = msg.messageType === "PROACTIVE_SUGGESTION";
              const hasProposal = !!msg.proposal || msg.messageType === "EDITOR_PROPOSAL";
              const proposalStatus = msg.proposalStatus || msg.proposal?.status || "PENDING";
              const isLastAi = !isUser && msg.id === lastAiMessageId;
              const isLastUser = isUser && msg.id === lastUserMessageId;

              if (isProactive) {
                return (
                  <div key={msg.id || `msg-${index}`} id={isLastAi ? "last-ai-msg" : undefined}>
                    <ProactiveSuggestionCard
                      id={msg.id}
                      taggedUserName={msg.taggedUserName}
                      content={msg.content}
                      proposal={msg.proposal}
                      proposalStatus={proposalStatus}
                      resolvedByUserName={msg.resolvedByUserName}
                      onAccept={() => onAcceptProposal(msg.id!, msg.proposal)}
                      onIgnore={() => onIgnoreProposal(msg.id!)}
                      isLoading={isLoading}
                      isApplying={applyingProposalId === msg.id}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={msg.id || `msg-${index}`}
                  id={isLastAi ? "last-ai-msg" : isLastUser ? "last-user-msg" : undefined}
                  className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                      IA
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-800 border border-slate-200/60 rounded-bl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold ${
                          isUser ? "text-indigo-200" : "text-indigo-900"
                        }`}
                      >
                        {msg.userName}
                      </span>
                      {msg.mode && (
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                            isUser ? "bg-indigo-700/60 text-white" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {msg.mode}
                        </span>
                      )}
                    </div>

                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <MarkdownPreview content={msg.content} />
                    )}

                    {/* Renderizado de Imagen Adjunta en Mensaje (Spec 07) */}
                    {(msg.imageUrl || msg.attachmentThumbnail) && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-300/60 bg-black/5 max-w-[240px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveImageUrl(msg.imageUrl || msg.attachmentThumbnail!)}
                          alt="Imagen adjunta al diagrama"
                          className="max-h-40 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxUrl(resolveImageUrl(msg.imageUrl || msg.attachmentThumbnail!))}
                          title="Clic para ampliar en alta resolución"
                        />
                      </div>
                    )}

                    {/* Acciones interactivas de propuesta en Modo Editor */}
                    {!isUser && hasProposal && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                        {proposalStatus === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onAcceptProposal(msg.id!, msg.proposal)}
                              disabled={isLoading || applyingProposalId === msg.id}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              title="Aplicar cambios al lienzo"
                            >
                              {applyingProposalId === msg.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Aplicando...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aplicar edición</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onIgnoreProposal(msg.id!)}
                              disabled={isLoading || applyingProposalId === msg.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-200/80 hover:bg-slate-300 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              title="Descartar propuesta de edición"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-500" />
                              <span>Descartar</span>
                            </button>
                          </div>
                        ) : proposalStatus === "ACCEPTED" ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              Cambios aplicados en el lienzo
                              {msg.resolvedByUserName ? ` por @${msg.resolvedByUserName}` : ""}
                            </span>
                          </div>
                        ) : proposalStatus === "IGNORED" ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2.5 py-1.5 rounded-lg border border-slate-300/60">
                            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Propuesta cancelada</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Animación de Carga / Pensamiento de Copilot ante edición manual en lienzo o aplicación de sugerencia */}
          {(isProactiveThinking || isLoading || Boolean(applyingProposalId)) && (
            <div className="flex gap-2.5 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-200" />
              </div>

              <div className="max-w-[85%] bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white border border-indigo-200/80 rounded-2xl rounded-bl-none px-4 py-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    {applyingProposalId
                      ? "Procesando edición y aplicando cambios al lienzo..."
                      : isProactiveThinking
                      ? "Pensando sugerencia sobre la edición..."
                      : "Copilot está pensando..."}
                    <span className="inline-flex gap-1 ml-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-600 animate-bounce" />
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {applyingProposalId
                    ? "Calculando clases, atributos y relaciones modificadas según la sugerencia para actualizar tu modelo UML..."
                    : isProactiveThinking
                    ? "Detecté cambios en el lienzo. Analizando clases, atributos y relaciones para optimizar tu modelo UML..."
                    : "Procesando solicitud y formulando respuesta técnica..."}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Atajos Flotantes Contextuales de Navegación Rápida (RF-03.2, RB-07) */}
        {showScrollNav && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1.5 rounded-full shadow-lg border border-slate-700/60 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {lastAiMessageId && (
              <button
                type="button"
                onClick={scrollToLastAi}
                className="hover:text-indigo-300 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                title="Ir al inicio del último mensaje de la IA"
              >
                <span>🤖 Último IA</span>
              </button>
            )}
            {lastUserMessageId && (
              <>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={scrollToLastUser}
                  className="hover:text-indigo-300 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                  title="Ir al inicio de mi último mensaje"
                >
                  <span>👤 Mi último</span>
                </button>
              </>
            )}
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={scrollToBottom}
              className="hover:text-emerald-300 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
              title="Saltar al final del chat"
            >
              <span>⬇️ Final</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback de Reconocimiento de Voz */}
      {speechFeedback && (
        <div className="px-4 py-1.5 bg-amber-50 text-amber-800 text-[11px] border-t border-amber-200 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{speechFeedback}</span>
        </div>
      )}

      {/* Área de Entrada y Selector de Modo con soporte Drag & Drop (Escenario 4) */}
      <form
        onSubmit={handleSend}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 relative"
      >
        {/* Overlay de arrastre de archivo */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-indigo-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white rounded-t-none animate-in fade-in duration-150 border-2 border-dashed border-white m-1">
            <ImageIcon className="w-8 h-8 animate-bounce mb-1" />
            <p className="text-xs font-bold">Suelta tu imagen o captura aquí</p>
            <p className="text-[10px] text-indigo-200">Se comprimirá automáticamente a JPG optimizado</p>
          </div>
        )}

        {/* Selector de Modo (Modo Chat vs Modo Editor) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMode("CHAT")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                mode === "CHAT"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Modo Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("EDITOR")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                mode === "EDITOR"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Modo Editor</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400">
            {mode === "CHAT" ? "Explicación & Contexto" : "Modifica el Lienzo"}
          </span>
        </div>

        {/* Alerta de archivo no compatible o error de compresión (RF-07.1.2, SC-4) */}
        {imageError && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{imageError}</span>
            </div>
            <button
              type="button"
              onClick={() => setImageError(null)}
              className="p-0.5 text-rose-500 hover:text-rose-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Thumbnail Chip de Imagen Adjunta con botón de descarte (RF-07.1.2, RB-07.1) */}
        {attachedImage && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/90 border border-indigo-200/80 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 truncate">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage.dataUrl}
                alt="Vista previa adjunta"
                className="w-11 h-11 object-cover rounded-lg border border-indigo-300 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightboxUrl(attachedImage.dataUrl)}
                title="Clic para ver ampliación"
              />
              <div className="truncate">
                <p className="font-semibold text-indigo-950 truncate max-w-[220px]">
                  {attachedImage.file.name}
                </p>
                <p className="text-[10px] text-indigo-600 font-medium">
                  {Math.round(attachedImage.sizeBytes / 1024)} KB · JPG {attachedImage.width}x{attachedImage.height}px
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Descartar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Textarea + Botones de Acción + Soporte Ctrl+V */}
        <div className="relative flex items-end gap-1.5 bg-white rounded-xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 p-1.5 transition-all">
          {/* Input de archivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessImageFile(file);
              e.target.value = "";
            }}
          />

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              mode === "CHAT"
                ? "Pregunta sobre el diagrama, o adjunta un boceto/captura..."
                : "Ej: Agrega la clase Pago con total double, o adjunta una imagen..."
            }
            rows={2}
            className="w-full resize-none bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none p-1.5"
            disabled={isLoading || isCompressing}
          />

          {/* Botón de Adjuntar Imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isCompressing}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              attachedImage
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
            }`}
            title="Adjuntar imagen, captura o foto de diagrama (o pega con Ctrl+V)"
          >
            {isCompressing ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>

          {/* Botón de Micrófono */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isListening
                ? "bg-rose-500 text-white animate-pulse"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
            title={isListening ? "Detener micrófono" : "Dictar por voz"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || isLoading || isCompressing}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-xs cursor-pointer"
            title="Enviar mensaje"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </aside>

    {/* Visor Modal de Imágenes en Alta Resolución (Spec 07) */}
    <ImageLightboxModal
      isOpen={Boolean(lightboxUrl)}
      imageUrl={lightboxUrl}
      onClose={() => setLightboxUrl(null)}
    />

    {isSettingsModalOpen && (
      <AiEngineSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={currentAiConfig}
        onConfigChange={(newCfg) => {
          setCurrentAiConfig(newCfg);
          onAiConfigChange?.(newCfg);
        }}
      />
    )}
  </>
  );
}
