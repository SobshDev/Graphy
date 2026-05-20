<div align="center">

# Graphy

**Read code as a graph, not as a wall of text.**

Graphy is a desktop IDE that turns your codebase into a living graph of functions,
modules and classes — connected by the relationships that actually matter (calls,
imports, inheritance) instead of being scattered across files you have to scroll
through.

[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?logo=react&logoColor=white)](https://tanstack.com/start)
[![Electron](https://img.shields.io/badge/Electron-42-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Bun](https://img.shields.io/badge/Bun-runtime-F472B6?logo=bun&logoColor=white)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## Why Graphy?

Modern codebases are graphs pretending to be folders. A function calls another
function, which imports a module, which extends a class — yet IDEs still force
us to read them as a flat list of `.ts` files.

Graphy flips the model:

- **Blocks instead of files.** Every function, method, class and module is a
  node you can move, group and zoom into.
- **Edges that mean something.** `calls`, `imports`, `inherits` — drawn between
  nodes so structure is visible at a glance.
- **AI built in.** First-class integration with Claude and Codex to explain,
  refactor or generate code from inside the graph.

## Tech stack

| Layer           | Choice                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop shell   | [Electron](https://www.electronjs.org/) 42                                                                                                     |
| Web framework   | [TanStack Start](https://tanstack.com/start) + React 19                                                                                        |
| Styling         | [Tailwind CSS](https://tailwindcss.com) 4                                                                                                      |
| Icons           | [Tabler Icons](https://tabler.io/icons)                                                                                                        |
| Static analysis | [ts-morph](https://ts-morph.com) (TypeScript compiler API)                                                                                     |
| AI providers    | [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk), [`@openai/codex-sdk`](https://www.npmjs.com/package/@openai/codex-sdk) |
| Bundler & dev   | [Vite](https://vitejs.dev) 8                                                                                                                   |
| Package manager | [Bun](https://bun.sh)                                                                                                                          |
| Tests           | [Vitest](https://vitest.dev) 4                                                                                                                 |

## Getting started

### Prerequisites

- [Bun](https://bun.sh) `>= 1.0`
- A recent Node-compatible toolchain (Electron 42 ships its own runtime)

### Install

```bash
bun install
```

### Run in development

Starts the Vite dev server **and** Electron in one go:

```bash
bun run dev
```

### Build a desktop release

```bash
bun run dist          # current platform
bun run dist:linux    # AppImage + .deb
bun run dist:mac      # .dmg (x64 + arm64)
```

Artifacts land in `release/`.

## Scripts

| Command                 | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `bun run dev`           | Build the parser bundle (watch), start Vite, launch Electron.      |
| `bun run dev:electron`  | Start Electron pointing at the running web dev server.             |
| `bun run dev:parser`    | Watch and rebundle the parser CLI into `dist-electron/parser.cjs`. |
| `bun run build`         | Build the parser bundle and the web app.                           |
| `bun run build:parser`  | One-shot bundle of the parser CLI into `dist-electron/parser.cjs`. |
| `bun run start:desktop` | Build the app and launch Electron.                                 |
| `bun run preview`       | Preview the production build locally.                              |
| `bun run lint`          | Run ESLint.                                                        |
| `bun run format`        | Format with Prettier and auto-fix ESLint issues.                   |
| `bun run check`         | Check formatting with Prettier.                                    |
| `bun run dist`          | Build and package the desktop app.                                 |

## Project structure

```
Graphy/
├── electron/           Electron main + preload (CommonJS)
│   ├── main.cjs
│   └── preload.cjs
├── src/
│   ├── modules/
│   │   └── ai/         Unified AI interface (Claude + Codex)
│   ├── parser/         Code -> graph extraction (ts-morph)
│   │   ├── core/       GraphNode / GraphEdge models & schema
│   │   ├── functionExtractor.ts
│   │   └── projectLoader.ts
│   ├── routes/         TanStack Router file-based routes
│   ├── router.tsx
│   └── styles.css
├── tests/              Vitest fixtures and specs
└── public/             Static assets (icons, manifest)
```

## How it works

1. **Load.** `ProjectLoader` opens a target codebase through `ts-morph`,
   reading either a `tsconfig.json`, a directory, or an explicit file list.
2. **Extract.** `functionExtractor` walks each `SourceFile` and emits
   `GraphNode`s — one per function, method, arrow, or class — with a stable
   `file::name` id.
3. **Link.** Edges (`calls`, `imports`, `inherits`) are computed from the
   compiler's symbol table.
4. **Render.** The graph is handed to the TanStack Start UI and drawn inside
   the Electron window.
5. **Assist.** The `ai` module exposes a single `AiService` interface
   (`chat`, `stream`, `generateObject`) backed by either Anthropic or Codex,
   so the UI doesn't care which provider is wired up.

## Roadmap

- [x] Core parser infrastructure (ts-morph)
- [x] Function extraction
- [x] Unified AI service interface (Claude + Codex)
- [x] Electron packaging metadata
- [ ] Edge extraction (calls / imports / inherits)
- [ ] Interactive graph canvas
- [ ] AI-powered node inspector
- [ ] Multi-language support beyond TypeScript

## Contributing

This is a hackathon project — issues and PRs are welcome. Before opening a PR:

```bash
bun run format
bun run lint
bun run check
```

## Team

Built with care by **[Maty MILLIEN](https://github.com/maty-millien)**, **[Gabriel BRUMENT](https://github.com/SobshDev)**, **[Raphaël BERTAINA-LOICHEMOL](https://github.com/raph-bl)** and **[Nawfal HASSANI](https://github.com/nawfal-hassani)**.

## License

Private — all rights reserved (for now).
