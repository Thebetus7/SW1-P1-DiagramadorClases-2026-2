# ==========================================
# ETAPA 1: Instalación de dependencias
# ==========================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ==========================================
# ETAPA 2: Construcción de la aplicación Next.js
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de entorno para incrustar en tiempo de build
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=/ws
ARG NEXT_PUBLIC_GEMINI_API_KEY=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==========================================
# ETAPA 3: Imagen final de ejecución
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos estáticos y bundle de producción en modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
