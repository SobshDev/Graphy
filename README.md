# Graphy

Graphy is a desktop-ready starter built with:

- [Bun](https://bun.sh/) as the package manager and script runner
- [TanStack Start](https://tanstack.com/start) with React
- [Tailwind CSS](https://tailwindcss.com/)
- [Electron](https://www.electronjs.org/) as the desktop shell
- [Nitro](https://nitro.build/) with a Node server preset for Electron production builds

## Install

```bash
bun install
```

## Development

Start the TanStack dev server and Electron together:

```bash
bun --bun run dev
```

Run only the web app:

```bash
bun --bun run dev:web
```

If the web server is already running on port `3000`, start only Electron:

```bash
bun --bun run dev:electron
```

## Production Smoke Test

Build the TanStack Start app, then launch Electron against the local production
server bundle:

```bash
bun --bun run start:desktop
```

## Quality Checks

```bash
bun --bun run lint
bun --bun run check
bun --bun run test
```

## Project Structure

```txt
electron/
  main.cjs      Electron main process; loads Vite in dev and the Nitro server in production
  preload.cjs   Safe renderer bridge exposed through context isolation
src/
  routes/       TanStack Router file routes
  styles.css    Tailwind v4 entrypoint and app tokens
vite.config.ts  TanStack Start, Tailwind, React, and Nitro config
```
