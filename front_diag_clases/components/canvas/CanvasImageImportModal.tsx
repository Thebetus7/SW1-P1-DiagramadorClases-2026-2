"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  RefreshCw,
  Layers,
  AlertCircle,
  ClipboardPaste,
} from "lucide-react";
import { ImportCanvasMode } from "@/types";

interface CanvasImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (base64Data: string, mimeType: string, mode: ImportCanvasMode) => Promise<void>;
  isProcessing: boolean;
}

type TabMode = "file" | "camera";

export function CanvasImageImportModal({
  isOpen,
  onClose,
  onImport,
  isProcessing,
}: CanvasImageImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("file");
  const [importMode, setImportMode] = useState<ImportCanvasMode>("MERGE");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string>("image/jpeg");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detener la cámara de manera segura
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
    setCameraError(null);
  }, []);

  // Iniciar la cámara
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Tu navegador o dispositivo no soporta acceso a la cámara.");
      setIsStartingCamera(false);
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setIsCameraActive(true);
            setIsStartingCamera(false);
          } catch {
            setIsCameraActive(true);
            setIsStartingCamera(false);
          }
        };
      }
    } catch (err: any) {
      console.error("Error al acceder a la cámara:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Permite el acceso en la barra de tu navegador."
          : "No se pudo inicializar la cámara web o del dispositivo."
      );
      setIsStartingCamera(false);
    }
  }, [stopCamera]);

  // Capturar frame de video
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];

    setPreviewSrc(dataUrl);
    setCapturedBase64(base64);
    setCapturedMimeType("image/jpeg");
    stopCamera();
  };

  // Procesar archivo seleccionado
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setPreviewSrc(dataUrl);
      setCapturedBase64(base64);
      setCapturedMimeType(file.type || "image/png");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Soporte Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Soporte Pegar desde el portapapeles (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  // Limpiar estados al cerrar o desmontar
  const handleClose = () => {
    stopCamera();
    setPreviewSrc(null);
    setCapturedBase64(null);
    setCameraError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!capturedBase64) return;
    await onImport(capturedBase64, capturedMimeType, importMode);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 p-4">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Importar Diagrama desde Imagen (Gemini Vision)
              </h3>
              <p className="text-xs text-slate-500">
                Digitaliza bocetos de pizarra, fotos o capturas e intégralas en el lienzo activo
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de modo de carga */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-3 gap-4">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("file");
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "file"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Archivo o Pegar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("camera");
              startCamera();
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "camera"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Tomar Foto con Cámara
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Zona 1: Captura o Selección */}
          {activeTab === "file" ? (
            <div>
              {previewSrc ? (
                <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-900 flex items-center justify-center min-h-[220px] max-h-[280px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt="Vista previa de diagrama"
                    className="max-h-[280px] w-auto object-contain"
                  />
                  <button
                    onClick={() => {
                      setPreviewSrc(null);
                      setCapturedBase64(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1.5 rounded-lg text-xs font-medium transition-colors shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                    isDragging
                      ? "border-indigo-600 bg-indigo-50/50 scale-[0.99]"
                      : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 mb-3">
                    <ImageIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    Arrastra una foto o haz clic para seleccionarla
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Soporta PNG, JPG o WEBP con diagramas o bocetos UML
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 font-medium">
                    <ClipboardPaste className="w-3 h-3 text-indigo-600" />
                    O presiona Ctrl + V para pegar captura
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              {previewSrc ? (
                <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-900 flex items-center justify-center min-h-[220px] max-h-[280px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt="Foto capturada"
                    className="max-h-[280px] w-auto object-contain"
                  />
                  <button
                    onClick={() => {
                      setPreviewSrc(null);
                      setCapturedBase64(null);
                      startCamera();
                    }}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 text-slate-800 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tomar otra foto
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-black flex items-center justify-center min-h-[240px] max-h-[300px]">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
                    />
                    {isStartingCamera && (
                      <div className="flex flex-col items-center gap-2 text-white text-xs font-medium">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        Iniciando cámara...
                      </div>
                    )}
                    {cameraError && (
                      <div className="p-4 text-center text-rose-300 text-xs flex flex-col items-center gap-2 max-w-sm">
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                        <span>{cameraError}</span>
                        <button
                          onClick={startCamera}
                          className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                  </div>

                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar Foto del Boceto
                    </button>
                  )}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Zona 2: Selección de Estrategia de Importación (RF-04.2) */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Estrategia de Integración en el Lienzo Activo:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Tarjeta 1: FUSIONAR (Recomendada) */}
              <button
                type="button"
                onClick={() => setImportMode("MERGE")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  importMode === "MERGE"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Fusionar / Agregar
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Conserva el diagrama actual y añade las nuevas clases en un área despejada sin alterar tu trabajo previo.
                </p>
              </button>

              {/* Tarjeta 2: REEMPLAZAR */}
              <button
                type="button"
                onClick={() => setImportMode("REPLACE")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  importMode === "REPLACE"
                    ? "border-rose-600 bg-rose-50/60 ring-2 ring-rose-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <RefreshCw className="w-4 h-4 text-rose-600" />
                    Reemplazar Lienzo
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded">
                    Sobrescritura
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Limpia por completo las clases y relaciones existentes para colocar únicamente lo digitalizado de la imagen.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!capturedBase64 || isProcessing}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Interpretando con Gemini Vision...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Digitalizar e Importar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
