"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Cpu,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  DownloadCloud,
  Trash2,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { AiEngineConfig, AiProvider, LocalModelChoice } from "@/types";
import {
  isWebGpuSupported,
  initLocalLlmEngine,
  unloadLocalLlmEngine,
  isLocalLlmReady,
  getCurrentLoadedModel,
} from "@/services/webLlmDiagramService";

interface AiEngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AiEngineConfig;
  onConfigChange: (newConfig: AiEngineConfig) => void;
}

export function AiEngineSettingsModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
}: AiEngineSettingsModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(config.provider);
  const [selectedModel, setSelectedModel] = useState<LocalModelChoice>(config.localModelId);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(config.progressPercent || 0);
  const [downloadText, setDownloadText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gpuAvailable, setGpuAvailable] = useState<boolean>(true);

  // Verificar WebGPU al abrir
  useEffect(() => {
    if (isOpen) {
      isWebGpuSupported().then((supported) => {
        setGpuAvailable(supported);
        if (!supported && selectedProvider === "WEBLLM_LOCAL") {
          setSelectedProvider("GEMINI_CLOUD");
        }
      });
      // Sincronizar estado actual del modelo
      const ready = isLocalLlmReady();
      const current = getCurrentLoadedModel();
      if (ready && current) {
        setSelectedModel(current as LocalModelChoice);
      }
    }
  }, [isOpen, selectedProvider]);

  if (!isOpen) return null;

  const handleDownloadAndInit = async () => {
    setErrorMsg(null);
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadText("Comprobando aceleración WebGPU...");

    try {
      await initLocalLlmEngine(selectedModel, (report) => {
        setDownloadProgress(report.progress);
        setDownloadText(report.text);
      });

      const updatedConfig: AiEngineConfig = {
        ...config,
        provider: "WEBLLM_LOCAL",
        localModelId: selectedModel,
        status: "READY",
        progressPercent: 100,
        webGpuSupported: true,
        errorMessage: undefined,
      };
      setSelectedProvider("WEBLLM_LOCAL");
      onConfigChange(updatedConfig);
    } catch (err: any) {
      console.error("Error al descargar modelo local WebLLM:", err);
      setErrorMsg(err.message || "Error al inicializar WebLLM.");
      onConfigChange({
        ...config,
        status: "ERROR",
        errorMessage: err.message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUnloadModel = async () => {
    try {
      await unloadLocalLlmEngine();
      const updatedConfig: AiEngineConfig = {
        ...config,
        provider: "GEMINI_CLOUD",
        status: "NOT_DOWNLOADED",
        progressPercent: 0,
      };
      setSelectedProvider("GEMINI_CLOUD");
      onConfigChange(updatedConfig);
    } catch (err: any) {
      console.error("Error al liberar modelo:", err);
    }
  };

  const handleApply = () => {
    if (selectedProvider === "WEBLLM_LOCAL" && !isLocalLlmReady()) {
      setErrorMsg("Debes inicializar el modelo local antes de seleccionarlo como motor activo.");
      return;
    }

    onConfigChange({
      ...config,
      provider: selectedProvider,
      localModelId: selectedModel,
      status: isLocalLlmReady() ? "READY" : "NOT_DOWNLOADED",
      webGpuSupported: gpuAvailable,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Configuración del Motor IA</h2>
              <p className="text-xs text-slate-300">Selecciona entre la nube de Google o inferencia privada local</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Opción 1: Gemini Cloud */}
          <div
            onClick={() => setSelectedProvider("GEMINI_CLOUD")}
            className={`cursor-pointer rounded-xl p-4 border transition-all ${
              selectedProvider === "GEMINI_CLOUD"
                ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Google Gemini API (Cloud)</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Inferencia ultrarrápida en la nube con Gemini 2.5 Flash. No consume memoria RAM/VRAM en tu dispositivo.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="ai-provider"
                checked={selectedProvider === "GEMINI_CLOUD"}
                onChange={() => setSelectedProvider("GEMINI_CLOUD")}
                className="mt-1 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Opción 2: WebLLM Local */}
          <div
            onClick={() => {
              if (gpuAvailable) {
                setSelectedProvider("WEBLLM_LOCAL");
              }
            }}
            className={`rounded-xl p-4 border transition-all ${
              !gpuAvailable
                ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
                : selectedProvider === "WEBLLM_LOCAL"
                ? "cursor-pointer border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500"
                : "cursor-pointer border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">IA Local en Navegador (WebLLM)</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                      100% Offline & Privado
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ejecución local mediante WebGPU en un Web Worker. Ningún dato ni prompt sale de tu navegador.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="ai-provider"
                disabled={!gpuAvailable}
                checked={selectedProvider === "WEBLLM_LOCAL"}
                onChange={() => gpuAvailable && setSelectedProvider("WEBLLM_LOCAL")}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {/* Aviso si no hay WebGPU */}
            {!gpuAvailable && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tu navegador o GPU no soportan WebGPU. Usa Chrome/Edge 113+ con hardware acelerado.</span>
              </div>
            )}

            {/* Sub-configuración de modelo WebLLM */}
            {gpuAvailable && selectedProvider === "WEBLLM_LOCAL" && (
              <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Modelo Local Llama 3.2:
                  </label>
                  <select
                    value={selectedModel}
                    disabled={isDownloading}
                    onChange={(e) => setSelectedModel(e.target.value as LocalModelChoice)}
                    className="w-full text-xs rounded-lg border-slate-300 bg-white text-slate-800 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2"
                  >
                    <option value="Llama-3.2-3B-Instruct-q4f16_1-MLC">
                      Llama 3.2 3B Instruct (q4f16_1) — Mayor calidad (~2.2 GB VRAM)
                    </option>
                    <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">
                      Llama 3.2 1B Instruct (q4f16_1) — Ultra ligero (~880 MB VRAM)
                    </option>
                  </select>
                </div>

                {/* Estado del Modelo */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  {isDownloading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-slate-700 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          Descargando pesos en caché...
                        </span>
                        <span className="font-bold text-emerald-600">{downloadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{downloadText}</p>
                    </div>
                  ) : isLocalLlmReady() && getCurrentLoadedModel() === selectedModel ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Modelo cargado y listo en memoria GPU</span>
                      </div>
                      <button
                        onClick={handleUnloadModel}
                        className="px-2 py-1 rounded bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1"
                        title="Liberar VRAM"
                      >
                        <Trash2 className="w-3 h-3" />
                        Liberar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">El modelo no está en memoria. Se descargará una sola vez.</span>
                      <button
                        onClick={handleDownloadAndInit}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        Descargar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Pie con botones de acción */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
