# Storyboard Flow

A professional storyboard creation application built with React, TypeScript, and Tailwind CSS.

## Project Overview

This is a React-based storyboard creation application that allows users to create, organize, and export professional storyboards with drag-and-drop functionality. The application features a modular architecture with sophisticated state management and export capabilities.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

Clone this repo and work locally using your own IDE. The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Zustand (State Management)
- React Router DOM
- DnD Kit (Drag & Drop)
- jsPDF & html2canvas (Export functionality)

## Development Commands

```bash
# Development server
npm run dev          # Start development server on port 8080
npm run preview      # Preview production build locally

# Build commands  
npm run build        # Production build (outputs to dist/)
npm run build:dev    # Development build with source maps

# Code quality
npm run lint         # Run ESLint on all TypeScript/React files
```

## Features

- **Drag & Drop Interface**: Intuitive shot organization with DnD Kit
- **Multi-page Support**: Create and manage multiple storyboard pages
- **Export Capabilities**: Export to PNG and PDF formats
- **Image Management**: Upload, compress, and position images
- **Template Settings**: Customizable storyboard templates
- **Responsive Design**: Works on desktop and mobile devices
- **State Persistence**: Automatic saving to localStorage

## Architecture

The application uses a modular Zustand store architecture with separate stores for:
- **Page Store**: Manages storyboard pages and grid settings
- **Shot Store**: Handles individual shots and shot ordering
- **Project Store**: Manages project metadata and template settings
- **UI Store**: Handles application UI state

## License

This project is open source and available under the MIT License.