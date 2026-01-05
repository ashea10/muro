# Muro - Collaborative Whiteboard

<div align="center">
  <h3>🎨 A real-time collaborative whiteboard</h3>
  <p>Draw together • Infinite canvas • WebSocket sync</p>
  
  ![CI](https://github.com/ashea10/muro/actions/workflows/ci.yml/badge.svg)
  ![Docker](https://github.com/ashea10/muro/actions/workflows/docker-build.yml/badge.svg)
</div>

---

## ✨ Features

### Drawing Tools
- **Rectangle** - Draw rectangles with customizable colors
- **Circle** - Create perfect circles
- **Line** - Draw straight lines
- **Arrow** - Lines with arrowheads
- **Pencil** - Freehand drawing
- **Text** - Add text annotations
- **Sticky Notes** - Yellow sticky notes for ideas
- **Eraser** - Remove shapes from canvas

### Canvas Features
- **Pan & Zoom** - Infinite canvas navigation
  - Scroll to zoom
  - Middle-click or Space+drag to pan
- **Selection System**
  - Click to select shapes
  - Shift+click for multi-select
  - Drag to create selection box
  - Move/delete selected shapes
- **Export** - Download as PNG or SVG
- **Undo/Redo** - Full history with Ctrl+Z / Ctrl+Y

### Real-time Collaboration
- **Live Cursors** - See collaborators' positions
- **Instant Sync** - Shapes appear immediately for all users
- **User Presence** - See who's online in your room

### Security & Performance
- **JWT Authentication** - Secure user sessions
- **Rate Limiting** - Protection against abuse
- **Optimized Rendering** - Smooth performance with many shapes

---

## 🏗️ Architecture

```
muro/
├── .github/workflows/    # CI/CD pipelines
├── k8s/                  # Kubernetes manifests
├── apps/
│   ├── http-server/      # REST API (Express.js)
│   ├── ws-server/        # WebSocket server
│   └── muro-frontend/    # Next.js frontend
├── packages/
│   ├── common/           # Shared types & Game class
│   ├── db/               # Prisma schema & client
│   ├── backend-common/   # Shared backend configuration
│   ├── ui/               # Shared UI components
│   ├── typescript-config/
│   └── eslint-config/
└── docker-compose.yml
```

### Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, WebSocket (ws)
- **Database**: PostgreSQL with Prisma ORM
- **Build**: Turborepo monorepo
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions
- **Container Orchestration**: Kubernetes, Docker

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- pnpm >= 9.0.0
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd muro
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and JWT secret
   ```

3. **Set up the database**
   ```bash
   cd packages/db
   npx prisma migrate dev
   npx prisma generate
   cd ../..
   ```

4. **Start development servers**
   ```bash
   pnpm dev
   ```

   This starts all services:
   - Frontend: http://localhost:3000
   - HTTP API: http://localhost:3001
   - WebSocket: ws://localhost:8080

### Docker Setup

For a containerized development environment:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes Deployment

📖 **Full guide**: [docs/local-k8s-guide.md](docs/local-k8s-guide.md)

---

## 📡 API Reference

### Authentication

#### POST `/api/auth/signup`
Create a new user account.
```json
{
  "username": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### POST `/api/auth/signin`
Authenticate and receive JWT token.
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

### Rooms

#### POST `/api/room` (Protected)
Create a new whiteboard room.
```json
{
  "name": "Project Brainstorm"
}
```

#### GET `/api/room/my-rooms` (Protected)
Get all rooms owned by the authenticated user.

#### GET `/api/room/:roomId`
Get room details and shapes.

#### DELETE `/api/room/:roomId` (Protected)
Delete a room (owner only).

### WebSocket Events

Connect to: `ws://localhost:8080?token=<jwt_token>`

#### Send Events
```typescript
{ type: "join_room", roomId: "123" }
{ type: "leave_room", roomId: "123" }
{ type: "draw", roomId: "123", shape: Shape }
{ type: "delete", roomId: "123", shapeId: "abc" }
{ type: "cursor", roomId: "123", x: 100, y: 200 }
```

#### Receive Events
```typescript
{ type: "draw", shape: Shape }
{ type: "delete", shapeId: "abc" }
{ type: "cursor", userId: "xyz", name: "John", x: 100, y: 200 }
{ type: "user_joined", userId: "xyz", name: "John" }
{ type: "user_left", userId: "xyz" }
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @repo/common test
pnpm --filter http-server test
```

---

## 📦 Building for Production

```bash
# Build all packages
pnpm build

# Build specific app
pnpm --filter muro-frontend build
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `PORT` | HTTP server port | 3001 |
| `WS_PORT` | WebSocket server port | 8080 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL for frontend | http://localhost:3001 |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for frontend | ws://localhost:8080 |

---

---

<div align="center">
  Made with ❤️ for collaborative creativity
</div>
