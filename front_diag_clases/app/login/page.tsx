"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, ArrowLeft, LogIn, UserCheck, Zap, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  const verifyBackend = async () => {
    setBackendStatus("checking");
    const isOnline = await api.checkHealth();
    setBackendStatus(isOnline ? "connected" : "disconnected");
  };

  useEffect(() => {
    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await api.login(correo, password);
      localStorage.setItem("diag_user", JSON.stringify(user));
      window.location.href = "/diagrams";
    } catch (err: any) {
      setError(err.message || "Error inesperado al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, nameFallback: string) => {
    setError(null);
    setIsLoading(true);
    try {
      let user: any;
      try {
        user = await api.login(quickEmail, "123456");
      } catch {
        // Si el usuario aún no existe en la base de datos PostgreSQL recien creada, crearlo automáticamente
        user = await api.register(quickEmail, nameFallback, "123456");
      }
      localStorage.setItem("diag_user", JSON.stringify(user));
      window.location.href = "/diagrams";
    } catch (err: any) {
      setError(err.message || "Error al autenticarse con el acceso directo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Inicio
          </Link>

          {/* Indicador de conexión al Backend */}
          <div className="flex items-center">
            {backendStatus === "connected" && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs cursor-default"
                title="Conexión exitosa con el backend (Spring Boot)"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Backend Conectado</span>
              </div>
            )}

            {backendStatus === "disconnected" && (
              <button
                type="button"
                onClick={verifyBackend}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 shadow-xs hover:bg-rose-100 transition-colors"
                title="Haz clic para reintentar conexión con el backend"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Backend Desconectado</span>
                <RefreshCw className="w-3 h-3 ml-0.5 text-rose-500" />
              </button>
            )}

            {backendStatus === "checking" && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span>Comprobando Backend...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
            <Code2 className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900">
          Iniciar Sesión
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Ingresa tus credenciales para acceder al módulo diagramador
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
              <LogIn className="w-4 h-4" />
              {isLoading ? "Ingresando..." : "Ingresar al Sistema"}
            </button>
          </form>

          {/* Accesos Directos Rápidos */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Botones de Acceso Directo (Pruebas Rápidas):
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin("docente@diagramador.com", "Dr. Carlos Mendoza (Docente)")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs border border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100 rounded text-left transition-colors text-slate-900 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div>
                    <div className="font-semibold text-slate-900">Acceso como Creador (Carlos Mendoza)</div>
                    <div className="text-[11px] text-slate-500">docente@diagramador.com</div>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-slate-500" />
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin("estudiante@diagramador.com", "Ana Rojas (Estudiante)")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs border border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100 rounded text-left transition-colors text-slate-900 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div>
                    <div className="font-semibold text-slate-900">Acceso como Colaborador (Ana Rojas)</div>
                    <div className="text-[11px] text-slate-500">estudiante@diagramador.com</div>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-slate-900 hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
