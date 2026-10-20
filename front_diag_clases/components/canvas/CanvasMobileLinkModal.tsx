"use client";

import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { X, Copy, Check, Smartphone, QrCode, ExternalLink, ShieldCheck } from "lucide-react";

interface CanvasMobileLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagramId: number;
  diagramName: string;
}

export function CanvasMobileLinkModal({
  isOpen,
  onClose,
  diagramId,
  diagramName,
}: CanvasMobileLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const [accessUrl, setAccessUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setAccessUrl(`${origin}/diagrams/${diagramId}?mode=viewer`);
    }
  }, [diagramId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!accessUrl) return;
    navigator.clipboard.writeText(accessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-700 via-indigo-700 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Vincular Visor Móvil</h3>
              <p className="text-xs text-sky-200 truncate max-w-[260px]">
                {diagramName || `Diagrama #${diagramId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con código QR y URL */}
        <div className="p-6 flex flex-col items-center text-center">
          <p className="text-xs text-slate-600 mb-4 max-w-sm">
            Escanea este código QR con la aplicación móvil <strong>Flutter Companion</strong> o ingresa la URL para seguir los cambios en tiempo real.
          </p>

          {/* Renderizado de Código QR */}
          <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-inner flex items-center justify-center mb-5 hover:border-indigo-400 transition-colors">
            {accessUrl ? (
              <QRCode
                value={accessUrl}
                size={180}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 180 180`}
              />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}
          </div>

          {/* Caja con URL y botón de copiar */}
          <div className="w-full mb-4">
            <div className="flex items-center gap-2 p-1.5 pl-3 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <span className="truncate text-slate-600 font-mono flex-1 text-left select-all">
                {accessUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Información de resiliencia y seguridad */}
          <div className="w-full grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <span className="font-semibold text-slate-700 block">Solo Lectura</span>
                <span className="text-slate-500">El visor móvil no altera contratos.</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <span className="font-semibold text-slate-700 block">Soporte Offline</span>
                <span className="text-slate-500">Mantiene caché local si cae la red.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/80 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
