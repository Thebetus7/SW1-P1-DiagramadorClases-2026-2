"use client";

import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (e) {
      console.warn("No se pudo copiar al portapapeles:", e);
    }
  };

  if (!content) return null;

  // Separar el contenido en bloques (código vs texto/listas/encabezados)
  const segments: Array<{ type: "code" | "text"; codeLang?: string; body: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        body: content.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      codeLang: match[1] || "code",
      body: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      body: content.slice(lastIndex),
    });
  }

  // Función para parsear texto en línea (negritas, cursivas, badges UML, inline code)
  const renderInlineFormattedText = (rawText: string) => {
    // Dividir por inline code primero: `código`
    const inlineParts = rawText.split(/(`[^`]+`)/g);

    return inlineParts.map((part, pIdx) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        const codeText = part.slice(1, -1);
        return (
          <code
            key={`inline-code-${pIdx}`}
            className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-slate-200/80 text-indigo-700 font-semibold border border-slate-300/60"
          >
            {codeText}
          </code>
        );
      }

      // Procesar visibilidad UML: "+ id: int", "- nombre: string", "# saldo", "~ paquete"
      // Reemplazamos inicios con badges estilizados
      let formatted = part;

      // Tokenizar negritas **texto**
      const boldParts = formatted.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={`bold-part-${pIdx}`}>
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
              return (
                <strong key={`b-${bIdx}`} className="font-bold text-slate-900">
                  {bPart.slice(2, -2)}
                </strong>
              );
            }

            // Detectar visibilidad UML al inicio de palabras: "+ ", "- ", "# ", "~ "
            const umlWords = bPart.split(/(\s[+\-#~]\s|^[+\-#~]\s)/g);
            return (
              <span key={`txt-${bIdx}`}>
                {umlWords.map((uWord, uIdx) => {
                  const trimmed = uWord.trim();
                  if (trimmed === "+") {
                    return (
                      <span
                        key={`vis-${uIdx}`}
                        className="inline-block px-1 py-0.2 mx-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300"
                        title="Público (+)"
                      >
                        +
                      </span>
                    );
                  }
                  if (trimmed === "-") {
                    return (
                      <span
                        key={`vis-${uIdx}`}
                        className="inline-block px-1 py-0.2 mx-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-300"
                        title="Privado (-)"
                      >
                        -
                      </span>
                    );
                  }
                  if (trimmed === "#") {
                    return (
                      <span
                        key={`vis-${uIdx}`}
                        className="inline-block px-1 py-0.2 mx-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300"
                        title="Protegido (#)"
                      >
                        #
                      </span>
                    );
                  }
                  if (trimmed === "~") {
                    return (
                      <span
                        key={`vis-${uIdx}`}
                        className="inline-block px-1 py-0.2 mx-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-300"
                        title="Paquete (~)"
                      >
                        ~
                      </span>
                    );
                  }
                  return uWord;
                })}
              </span>
            );
          })}
        </span>
      );
    });
  };

  return (
    <div className={`space-y-2 text-xs leading-relaxed text-slate-800 ${className}`}>
      {segments.map((seg, sIdx) => {
        if (seg.type === "code") {
          const isCopied = copiedIndex === sIdx;
          return (
            <div
              key={`block-code-${sIdx}`}
              className="my-2 rounded-xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Header de bloque de código */}
              <div className="px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="uppercase text-[10px] font-semibold tracking-wider text-slate-400">
                    {seg.codeLang || "código"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(seg.body, sIdx)}
                  className="px-2 py-0.5 rounded text-[10px] hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Copiar código"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto leading-normal">
                <code>{seg.body}</code>
              </pre>
            </div>
          );
        }

        // Renderizar líneas del bloque de texto
        const lines = seg.body.split("\n");
        return (
          <div key={`block-text-${sIdx}`} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={`empty-${lIdx}`} className="h-1" />;
              }

              // Encabezados: ### o ##
              if (trimmed.startsWith("### ")) {
                return (
                  <h4
                    key={`h4-${lIdx}`}
                    className="font-bold text-xs text-indigo-950 mt-2 mb-1 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                    <span>{trimmed.replace(/^###\s+/, "")}</span>
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3
                    key={`h3-${lIdx}`}
                    className="font-bold text-sm text-indigo-950 border-b border-indigo-100 pb-1 mt-2.5 mb-1"
                  >
                    {trimmed.replace(/^##\s+/, "")}
                  </h3>
                );
              }

              // Viñetas: - o *
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const bulletContent = trimmed.replace(/^[-*]\s+/, "");
                return (
                  <div key={`bullet-${lIdx}`} className="flex items-start gap-2 ml-1 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span className="flex-1 leading-relaxed">
                      {renderInlineFormattedText(bulletContent)}
                    </span>
                  </div>
                );
              }

              // Párrafo normal
              return (
                <p key={`p-${lIdx}`} className="leading-relaxed">
                  {renderInlineFormattedText(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
