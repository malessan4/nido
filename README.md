<parameter name="CodeContent"><div align="center">

# 🏠 Nido
### Organizador Familiar Full Stack

Una plataforma integral para facilitar la organización y comunicación dentro del núcleo familiar.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nido-three-omega.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Go%20(Gin)-00ADD8?style=for-the-badge&logo=go)](https://nido-backend-go.onrender.com)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-black?style=for-the-badge&logo=vercel)](https://nido-three-omega.vercel.app/)

**[🚀 Ver Demo en vivo](https://nido-three-omega.vercel.app/)**

</div>

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| 📋 **Tablero Kanban** | Gestión de tareas con drag & drop en columnas (Pendiente, En Progreso, Completada) |
| 📅 **Calendario** | Eventos familiares compartidos con vista mensual interactiva |
| 💬 **Chat** | Mensajería en tiempo real (polling) entre los integrantes de la familia |
| 🛒 **Lista de Compras** | Lista colaborativa con tachado en tiempo real al marcar los ítems como comprados |
| 📌 **Notas Fijas** | Cartelera virtual para información persistente (horarios, recetas, recordatorios) |
| 🔔 **Push Notifications** | Notificaciones web nativas (PWA/VAPID) para tareas vencidas, eventos y mensajes |

---

## 🏗️ Arquitectura

```
Nido/
├── frontend/          # Next.js 15 (App Router)
│   ├── src/
│   │   ├── app/       # Páginas y layouts (login, dashboard)
│   │   ├── components/# KanbanBoard, CalendarView, ChatView, ShoppingListView, NotesView
│   │   └── lib/       # Axios (api.ts), Push Notifications (push.ts)
│   └── public/
│       ├── manifest.json  # Configuración PWA
│       └── sw.js          # Service Worker para notificaciones
│
└── backend/           # Go (Gin + GORM)
    ├── controllers/   # Handlers HTTP (auth, tasks, events, messages, shopping, notes)
    ├── middleware/    # JWT Authentication
    ├── models/        # Entidades GORM (Family, User, Task, Event, Message, ShoppingItem, Note)
    ├── services/      # Push Notifications (WebPush/VAPID)
    ├── cron/          # Scheduler de tareas vencidas (6:00 AM BsAs)
    └── database/      # Conexión PostgreSQL
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **[Next.js 15](https://nextjs.org/)** — Framework React con App Router
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Estilos utilitarios
- **[Framer Motion](https://www.framer.com/motion/)** — Animaciones fluidas
- **[Lucide React](https://lucide.dev/)** — Íconos
- **[next-themes](https://github.com/pacocoursey/next-themes)** — Modo claro/oscuro (Glassmorphism)
- **PWA** — Manifest + Service Worker para instalación en móviles

### Backend
- **[Go (Golang)](https://go.dev/)** — Lenguaje principal (~20-30MB RAM)
- **[Gin](https://gin-gonic.com/)** — Framework HTTP
- **[GORM](https://gorm.io/)** — ORM para PostgreSQL con AutoMigrate
- **[JWT (golang-jwt)](https://github.com/golang-jwt/jwt)** — Autenticación stateless
- **[webpush-go](https://github.com/SherClockHolmes/webpush-go)** — Push Notifications VAPID
- **[robfig/cron](https://github.com/robfig/cron)** — Scheduler de tareas programadas
- **[godotenv](https://github.com/joho/godotenv)** — Variables de entorno

### Base de Datos & Hosting
- **[Neon PostgreSQL](https://neon.tech/)** — Base de datos serverless
- **[Vercel](https://vercel.com/)** — Deploy del Frontend
- **[Render](https://render.com/)** — Deploy del Backend

---

## 🚀 Cómo correr localmente

### Prerequisitos
- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)

### Backend (Go)

1. Clonar el repositorio y entrar a la carpeta del backend:
   ```bash
   cd backend
   ```

2. Crear el archivo `.env` con las variables necesarias:
   ```env
   DATABASE_URL=postgresql://user:password@host/db?sslmode=require
   JWT_SECRET=tu_clave_secreta_jwt
   VAPID_PUBLIC_KEY=tu_clave_vapid_publica
   VAPID_PRIVATE_KEY=tu_clave_vapid_privada
   ALLOWED_ORIGINS=http://localhost:3000
   PORT=8080
   ```

3. Instalar dependencias y levantar el servidor:
   ```bash
   go mod tidy
   go run main.go
   ```
   El servidor queda disponible en `http://localhost:8080` ✅

### Frontend (Next.js)

1. Entrar a la carpeta del frontend:
   ```bash
   cd frontend
   ```

2. Crear el archivo `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080/api
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_clave_vapid_publica
   ```

3. Instalar dependencias y levantar el servidor de desarrollo:
   ```bash
   npm install
   npm run dev
   ```
   La app queda disponible en `http://localhost:3000` ✅

---

## 🔑 Variables de Entorno

### Backend (`.env`)
| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (Neon) |
| `JWT_SECRET` | Clave secreta para firmar los tokens JWT |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID para Push Notifications |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID para Push Notifications |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS (ej: `https://tu-frontend.vercel.app`) |
| `PORT` | Puerto del servidor (default: `8080`) |

### Frontend (`.env.local`)
| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (ej: `https://nido-backend-go.onrender.com/api`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID (igual que en el backend) |

---

## 📱 PWA

La app es instalable como una Progressive Web App. En Android o iOS, al entrar a la web, el navegador va a ofrecer la opción de "Agregar a la pantalla de inicio". Una vez instalada, funciona como una app nativa y puede recibir notificaciones push.

---

## 👨‍💻 Autor

**Matias Alessandrello** — [@malessan4](https://github.com/malessan4)

---

<div align="center">
Hecho con ❤️ para organizar el hogar familiar
</div>

