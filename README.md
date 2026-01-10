# Storyboard Flow

A modern, React-based storyboard creation application that allows users to create, organize, and export professional storyboards with drag-and-drop functionality.

## 🏗️ Repository Structure

**IMPORTANT:** This is a **single Vite + React + TypeScript application** located at the repository root.

- ✅ All source code is in `/src`
- ✅ Single `package.json` at root
- ✅ Single `node_modules` at root
- ✅ Single `.git` at root
- ❌ **DO NOT** create nested projects
- ❌ **DO NOT** create duplicate `package.json` files in subdirectories
- ❌ **DO NOT** create additional `node_modules` or `.git` folders

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for authentication and cloud sync)

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your Supabase credentials to `.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` for complete environment variable requirements.

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:5173` (or next available port).

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[Architecture Principles](docs/architecture/ARCHITECTURE_PRINCIPLES.md)** - Design philosophy
- **[UI State Handling](docs/architecture/UI_STATE_HANDLING.md)** - State management guide
- **[Cursor AI Rules](.cursorrules)** - Critical development rules (auto-loaded by Cursor AI)
- **[Technical Details](CLAUDE.md)** - Architecture and component details

### Key Documentation Sections

- 🏗️ **Architecture** - Design patterns and state management
- 🐛 **Bugs & Fixes** - Historical issues and resolutions
- ✨ **Features** - Feature implementation guides
- 🔄 **Sync & Data** - Offline/online synchronization
- 🎨 **Styling** - Color system and UI patterns
- ⚙️ **Setup** - Supabase and authentication setup

## 🛠️ Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.5
- **Build Tool**: Vite 5.4 with SWC
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (Auth + Database)
- **Drag & Drop**: @dnd-kit
- **Export**: jsPDF + html2canvas

## 📦 Project Structure

```
/
├── src/                    # Application source code
│   ├── components/         # React components
│   ├── pages/             # Route components
│   ├── store/             # Zustand stores
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── styles/            # Styling utilities
├── docs/                  # Documentation
├── public/                # Static assets
├── dist/                  # Build output (generated)
├── package.json           # Dependencies (root only)
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── .cursorrules           # Cursor AI development rules
```

## 🔒 Critical Development Rules

Before making changes, **always read**:
1. **[.cursorrules](.cursorrules)** - Mandatory rules for AI assistants
2. **[docs/architecture/ARCHITECTURE_PRINCIPLES.md](docs/architecture/ARCHITECTURE_PRINCIPLES.md)** - Design philosophy
3. **[docs/architecture/UI_STATE_HANDLING.md](docs/architecture/UI_STATE_HANDLING.md)** - State transitions

## 🚢 Deployment

This project is configured for Vercel deployment:

```bash
# Deploy to Vercel
vercel deploy

# Deploy to production
vercel --prod
```

See `vercel.json` for deployment configuration.

## 📄 License

[Your License Here]

## 🤝 Contributing

Please read the documentation in `/docs` before contributing, especially:
- `.cursorrules` - Critical development rules
- `docs/architecture/ARCHITECTURE_PRINCIPLES.md` - Design patterns
- `docs/maintenance/DOCUMENTATION_MAINTENANCE.md` - Documentation guidelines

---

**Need help?** Start with the [Documentation Index](docs/README.md)

