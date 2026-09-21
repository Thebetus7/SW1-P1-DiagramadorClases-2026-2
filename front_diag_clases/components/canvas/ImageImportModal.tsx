"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  ClipboardPaste,
} from "lucide-react";

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (diagramName: string, base64Data: string, mimeType: string) => Promise<void>;
  isProcessing: boolean;
}

type TabMode = "file" | "camera";

export function ImageImportModal({
  isOpen,
  onClose,
  onImport,
  isProcessing,
}: ImageImportModalProps) {
  const [diagramName, setDiagramName] = useState("");
  const [activeTab, setActiveTab] = useState<TabMode>("file");
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

  // Iniciar la cámara de forma compatible con cualquier dispositivo (PC, Laptop o Móvil)
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Tu navegador o entorno no soporta acceso a la cámara.");
      setIsStartingCamera(false);
      return;
    }

    try {
      // Intentar primero con cámara trasera si existe, si falla hacer fallback a cualquier cámara
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        // Fallback genérico para webcams estándar de laptop/PC
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setIsCameraActive(true);
            setIsStartingCamera(false);
          } catch (playErr) {
            console.warn("No se pudo iniciar reproducción de video automática:", playErr);
            setIsCameraActive(true);
            setIsStartingCamera(false);
          }
        };
      } else {
        setIsCameraActive(true);
        setIsStartingCamera(false);
      }
    } catch (err: any) {
      console.error("Error al iniciar la cámara:", err);
      setIsStartingCamera(false);
      setIsCameraActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Permiso de cámara denegado. Permite el acceso en tu navegador.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No se encontró ninguna cámara conectada en tu dispositivo.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError("La cámara está en uso por otra aplicación.");
      } else {
        setCameraError(`No se pudo acceder a la cámara: ${err.message || "Error desconocido"}`);
      }
    }
  }, [stopCamera]);

  // Al abrir o cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPreviewSrc(null);
      setCapturedBase64(null);
      setDiagramName("");
      setActiveTab("file");
    }
  }, [isOpen, stopCamera]);

  // Al cambiar de pestaña
  useEffect(() => {
    if (activeTab === "camera" && isOpen && !previewSrc) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab, isOpen, previewSrc, startCamera, stopCamera]);

  // Capturar fotograma de la cámara (convertido a JPG con calidad óptima)
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Rellenar con fondo blanco por seguridad
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.90);

    setPreviewSrc(dataUrl);
    setCapturedBase64(dataUrl.split(",")[1]);
    setCapturedMimeType("image/jpeg");
    stopCamera();
  };

  // Retomar foto
  const retakePhoto = () => {
    setPreviewSrc(null);
    setCapturedBase64(null);
    startCamera();
  };

  // Convierte cualquier formato de imagen (PNG, WEBP, BMP, etc.) a JPG estandarizado y optimizado con fondo blanco
  const convertImageToStandardJpg = (
    fileOrDataUrl: File | string
  ): Promise<{ dataUrl: string; base64: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width || 1280;
        let height = img.height || 720;
        const maxDim = 1920;

        // Escalar proporcionalmente si sobrepasa 1920px para máxima nitidez y ligereza
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del canvas"));
          return;
        }

        // Rellenar fondo blanco (esencial para convertir PNG transparentes a JPG sin manchas negras)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir obligatoriamente a image/jpeg (90% calidad)
        const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.90);
        const base64Clean = jpgDataUrl.split(",")[1];

        resolve({ dataUrl: jpgDataUrl, base64: base64Clean });
      };

      img.onerror = (err) => reject(err);

      if (typeof fileOrDataUrl === "string") {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  };

  // Procesar archivo de imagen (transformándolo a JPG automáticamente)
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido (PNG, JPG, JPEG, WEBP, BMP).");
      return;
    }

    // Si el nombre del diagrama está vacío, sugerir el nombre del archivo
    if (!diagramName.trim()) {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "").trim();
      if (fileNameWithoutExt) {
        setDiagramName(fileNameWithoutExt);
      }
    }

    try {
      // Transformar automáticamente cualquier formato (PNG, WEBP, etc.) a JPG ligero y nítido para la IA
      const { dataUrl, base64 } = await convertImageToStandardJpg(file);
      setPreviewSrc(dataUrl);
      setCapturedBase64(base64);
      setCapturedMimeType("image/jpeg");
    } catch (err) {
      console.warn("Aviso al convertir a JPG mediante canvas, usando FileReader estándar:", err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewSrc(result);
        setCapturedBase64(result.split(",")[1]);
        setCapturedMimeType("image/jpeg");
      };
      reader.readAsDataURL(file);
    }
  };

  // Manejo de input de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Soporte para Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Soporte para pegar imagen con Ctrl+V (Clipboard)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            setActiveTab("file");
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, diagramName]);

  // Generar nombre aleatorio si no se especifica uno
  const generateRandomDiagramName = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `Diagrama_IA_${randomNum}`;
  };

  // Enviar a procesamiento con IA
  const handleSubmit = async () => {
    if (!capturedBase64 || isProcessing) return;

    const finalName = diagramName.trim() || generateRandomDiagramName();
    await onImport(finalName, capturedBase64, capturedMimeType);
  };

  if (!isOpen) return null;

  // El botón se habilita SIEMPRE que haya una imagen cargada y no esté procesando
  const canSubmit = Boolean(capturedBase64) && !isProcessing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Importar Diagrama desde Imagen
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Nombre del diagrama */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nombre del Diagrama
              </label>
              <span className="text-[11px] text-slate-400 font-normal">
                (Opcional)
              </span>
            </div>
            <input
              type="text"
              value={diagramName}
              onChange={(e) => setDiagramName(e.target.value)}
              placeholder="Ej. SistemaVentas (opcional)"
              disabled={isProcessing}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-slate-800 bg-white"
            />
          </div>

          {/* Tabs: Archivo / Cámara */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === "file"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Subir Archivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === "camera"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Usar Cámara
            </button>
          </div>

          {/* Pestaña: Archivo */}
          {activeTab === "file" && (
            <div className="space-y-3">
              <input
                id="uml-image-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewSrc ? (
                <label
                  htmlFor="uml-image-file-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragging
                      ? "border-indigo-600 bg-indigo-50/50 scale-[1.01]"
                      : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20"
                  }`}
                >
                  <div className="p-3 bg-white border border-slate-200 rounded-full shadow-xs text-indigo-600">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-indigo-600 font-semibold block">
                      Haz clic para seleccionar o arrastra una imagen
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      PNG, JPG, WEBP — También puedes pegar con <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">Ctrl + V</kbd>
                    </span>
                  </div>
                </label>
              ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img
                    src={previewSrc}
                    alt="Previsualización del diagrama"
                    className="w-full object-contain max-h-60 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSrc(null);
                      setCapturedBase64(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={isProcessing}
                    title="Cambiar imagen"
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white border border-slate-300 rounded-lg shadow-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pestaña: Cámara */}
          {activeTab === "camera" && (
            <div className="space-y-3">
              {cameraError && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Problema con la cámara</p>
                    <p className="mt-0.5 text-rose-600">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-rose-800 underline hover:no-underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Reintentar acceso
                    </button>
                  </div>
                </div>
              )}

              {!previewSrc ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
                    />

                    {!isCameraActive && (
                      <div className="flex flex-col items-center justify-center text-white/80 gap-2 p-4 text-center">
                        {isStartingCamera ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <span className="text-xs font-medium">Iniciando cámara...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 opacity-50" />
                            <span className="text-xs">Cámara en espera</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={isStartingCamera || isProcessing}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
                      >
                        {isStartingCamera ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando...
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" /> Activar Cámara
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm active:scale-98"
                      >
                        <Camera className="w-4 h-4" /> Tomar Foto del Diagrama
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img
                    src={previewSrc}
                    alt="Foto capturada"
                    className="w-full object-contain max-h-60 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={retakePhoto}
                    disabled={isProcessing}
                    title="Tomar otra foto"
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white border border-slate-300 rounded-lg shadow-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Canvas oculto para captura */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              canSubmit
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Importar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
