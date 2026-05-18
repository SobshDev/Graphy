# Agent Instructions

## Project

**Graphy** is an IDE that visualizes code as a graph — functions, modules, and other constructs are represented as blocks connected by edges instead of being shown as plain text files. It is built as a desktop application using **[TanStack Start](https://tanstack.com/start)** for the web layer and **[Electron](https://www.electronjs.org/)** as the desktop shell.

## Component Files

Always split components into distinct files — one component per file. Do not co-locate multiple React components inside a single route or module file.

## File Tree Architecture

The codebase uses a feature-based layout. Top-level folders under `src/`:

| Folder         | Purpose                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/app/`     | App shell: providers, global layout (`sidebar`, `top-bar`), `styles.css`. The chrome around the modules.             |
| `src/modules/` | Self-contained feature modules (e.g. `graph/`, `ai/`). Each owns its components, hooks, state, services, and types.  |
| `src/shared/`  | Cross-cutting primitives: `ui/` (shadcn), `hooks/`, `lib/`. No app- or feature-specific code.                        |
| `src/routes/`  | TanStack file-based routes. Must stay at `src/routes`. Route files should be thin and compose module/app components. |

### Rules

- **Import direction is one-way**: `routes → app → modules → shared`. Never import upward (e.g. `shared` must not import from `modules`).
- **Modules don't import from each other directly.** If two modules need to share something, lift it into `shared/` or expose it via the source module's `index.ts` barrel.
- **A module's `index.ts` is its public API.** Internal files stay internal — outsiders import `@/modules/graph`, not `@/modules/graph/components/code-node`.
- **`src/shared/ui/` is reserved for shadcn primitives.** The shadcn CLI is configured to write there; do not put hand-written feature components in it.
- **New features become new modules.** Create `src/modules/<feature>/` rather than adding to `app/` or `shared/`.

## Icons

This project uses **[Lucide Icons](https://lucide.dev)** for all icons in the app.

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
