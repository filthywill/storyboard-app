# storyboard-app

A modern, modular storyboard creation and export tool for filmmakers, creatives, and teams. The main application code is located in the [`shot-flow-builder`](./shot-flow-builder) subfolder.

## Features
- Visual storyboard editor with drag-and-drop shot cards
- Customizable grid layouts and aspect ratios
- Project metadata (client, agency, job info, logo, etc.)
- PDF and PNG export with print-quality options
- Multi-page support with page tabs and duplication
- Template settings for header/footer/shot text
- Zustand-powered state management for performance
- Error boundaries and robust UI/UX

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/filthywill/storyboard-app.git
   cd storyboard-app/shot-flow-builder
   ```
2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```
3. Start the development server:
   ```sh
   npm run dev
   # or
   yarn dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure
- `shot-flow-builder/` — Main React app (Vite, Zustand, TypeScript)
- `tasks/` — Project management, refactor, and planning docs
- `.taskmaster/` — Taskmaster AI planning files (if present)

## Contributing
Pull requests are welcome! Please open an issue to discuss major changes first. For local development:
- Follow the setup steps above
- Use conventional commits
- Add/modify tests as needed
- Ensure secrets (API keys, etc.) are never committed

## License
[MIT](LICENSE) 