"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, ArrowLeft, UserPlus, AlertCircle } from "lucide-react";
import { api } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await api.register(correo, nombre, password);
      localStorage.setItem("diag_user", JSON.stringify(user));
      window.location.href = "/diagrams";
    } catch (err: any) {
      setError(err.message || "Error al registrarse.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Inicio
        </Link>

        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
            <Code2 className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900">
          Crear una Cuenta
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Regístrate para comenzar a crear y colaborar en diagramas UML
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 border border-slate-300 rounded-lg shadow-sm sm:px-10">
          {error && (
            <div className="mb-4 text-xs bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {isLoading ? "Creando cuenta..." : "Registrarse"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-semibold text-slate-900 hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
