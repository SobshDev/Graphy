# Agent Instructions

## Project

**Graphy** is an IDE that visualizes code as a graph — functions, modules, and other constructs are represented as blocks connected by edges instead of being shown as plain text files. It is built as a desktop application using **[TanStack Start](https://tanstack.com/start)** for the web layer and **[Electron](https://www.electronjs.org/)** as the desktop shell.

## Icons

This project uses **[Tabler Icons](https://tabler.io/icons)** via `@tabler/icons-react`.

Do not install or use other icon libraries.

## Package Commands

This project uses **[Bun](https://bun.sh)** as the package manager and runtime.

| Command                 | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `bun run dev`           | Start the web dev server and Electron concurrently.    |
| `bun run dev:web`       | Start the Vite dev server on port 3000.                |
| `bun run dev:electron`  | Start Electron pointing at the running web dev server. |
| `bun run build`         | Build the web app with Vite.                           |
| `bun run start:desktop` | Build the app and launch Electron.                     |
| `bun run preview`       | Preview the production build locally.                  |
| `bun run lint`          | Run ESLint.                                            |
| `bun run format`        | Format with Prettier and auto-fix ESLint issues.       |
| `bun run check`         | Check formatting with Prettier.                        |

**Never run dev commands** (`dev`, `dev:web`, `dev:electron`, `start:desktop`, `preview`) to launch the web server or the Electron app. The user runs these themselves.
