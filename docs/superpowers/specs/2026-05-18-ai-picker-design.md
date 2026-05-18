# AI provider picker on the topbar

**Date:** 2026-05-18
**Status:** Approved (pending spec review)

## Goal

Add an AI icon to the topbar, next to the existing "Run graph" button, that lets the user pick between Claude and Codex as the active AI provider. When the user selects a provider, the app checks whether an API key for that provider is stored in config; if not, it prompts for one.

This is foundational scaffolding: it persists a provider selection and the associated API keys so that future AI features can consume them. The AI services in `src/modules/ai/` are not yet wired into the UI and that does not change in this work.

## Scope

In scope:

- A new `ai-picker` module with a single topbar component.
- A localStorage-backed config layer holding the active provider and per-provider API keys.
- A dialog that collects an API key when the chosen provider has none.
- Mounting the component in `src/app/layout/top-bar.tsx`.

Out of scope:

- Editing or removing an already-stored key from the UI.
- Validating API keys against the providers' servers.
- Calling the AI services from the renderer or wiring `ClaudeService` / `CodexService` into any UI feature.
- Migrating to a more secure storage (Electron `safeStorage`, OS keychain). The user accepted plain localStorage knowingly.
- Any sidebar, settings page, or other surface for AI configuration.

## Architecture

### Module layout

```
src/modules/ai-picker/
├── components/
│   ├── ai-picker.tsx          # topbar button + dropdown menu
│   └── api-key-dialog.tsx     # dialog shown when picked provider has no key
├── hooks/
│   └── use-ai-config.ts       # hydrates/writes localStorage, exposes config + setters
├── types.ts                   # AiProvider type, display labels
└── index.ts                   # public barrel: exports <AiPicker />
```

The module follows the project's feature-based layout (`CLAUDE.md`: "New features become new modules"). It depends only on `@/shared/ui/*` and `lucide-react`. It does **not** import from `@/modules/ai` — the `AiProvider` type is defined locally in `ai-picker/types.ts`. Future work that connects the picker's selection to actual service instantiation will live in a higher layer (likely `src/app/`) that imports from both modules. This keeps the inter-module rule from `CLAUDE.md` ("Modules don't import from each other directly") intact.

Routes and the app shell import only from `@/modules/ai-picker` (the barrel).

### Mount point

`src/app/layout/top-bar.tsx` renders `<AiPicker />` immediately before the existing "Run graph" `<Button>`. No other changes to the topbar.

## Data model

Single localStorage key: `graphy.ai-config`.

Shape:

```ts
type AiProvider = 'claude' | 'codex'

interface AiConfig {
  activeProvider: AiProvider | null
  keys: Partial<Record<AiProvider, string>>
}
```

Initial state when nothing is stored: `{ activeProvider: null, keys: {} }`.

## Components

### `useAiConfig()` hook

Responsibilities:

- On mount, read `graphy.ai-config` from localStorage. If absent or malformed, start with the initial state. Malformed = `JSON.parse` throws or the parsed value doesn't match the expected shape (cheap structural check; no zod).
- Guard every localStorage access with `typeof window !== 'undefined'` because TanStack Start renders on the server.
- Persist on every change to active provider or keys.
- Expose: `{ activeProvider, keys, setActiveProvider(provider), setKey(provider, key) }`.

The hook is internal to `ai-picker` and is not re-exported from `index.ts`.

### `<AiPicker />`

Topbar button, structured as a `shadcn/ui` `DropdownMenu`.

- **Trigger:** `Button variant="ghost" size="sm"` matching the existing "Share" button's visual weight. Contents: `<BrainCircuit className="size-3.5" strokeWidth={1.7} />` followed by the label.
  - Label is the display name of the active provider (`"Claude"` or `"Codex"`), or `"AI"` when `activeProvider` is `null`.
- **Content:** `DropdownMenuContent align="end"` so it opens flush with the right edge of the trigger (matters because the picker sits on the right side of the topbar).
- **Items:** Two `DropdownMenuItem`s, one per provider. Each item:
  - Displays the provider's display name.
  - Shows a left-side `Check` icon when that provider is the active one. When inactive, render a same-size empty slot so labels line up across rows.
  - On select: see flow below.

### `<ApiKeyDialog />`

`shadcn/ui` `Dialog`.

- Controlled by `<AiPicker />` via `open` + `onOpenChange` plus a `provider` prop indicating which key is being collected.
- Title: `"Enter {Provider} API key"` (e.g. "Enter Claude API key").
- Body: a single `<Input type="password" autoFocus />` with a placeholder hinting at the key format (e.g. `sk-ant-...` for Claude, `sk-...` for Codex/OpenAI). Local component state holds the input value.
- Footer: "Cancel" (`variant="ghost"`) and "Save" (`variant="default"`). Save is disabled until the input is non-empty (trimmed).
- Submit (button click or Enter): trim input, call `setKey(provider, trimmed)` then `setActiveProvider(provider)`, then close.
- Cancel / dismiss: do nothing. Active provider does not change.

## UX flow

1. **Initial state, no keys stored.** Button reads "BrainCircuit AI". Dropdown items have no checkmark.
2. **User clicks "Claude".**
   - Dropdown closes.
   - `<ApiKeyDialog provider="claude" />` opens.
   - User types a key, clicks Save → key saved, `activeProvider = "claude"`. Button now reads "BrainCircuit Claude".
3. **User clicks the button again, picks "Codex".**
   - Codex has no stored key → same dialog flow as step 2, but with `provider="codex"`.
4. **User clicks the button again, picks "Claude" (which already has a stored key).**
   - Dropdown closes immediately. `activeProvider = "claude"`. No dialog.
5. **App reload.** `useAiConfig` rehydrates from localStorage. The previously active provider's name is shown on the button; both stored keys remain available.

## Edge cases

- **SSR / first render mismatch.** `useAiConfig` returns the initial state on the server pass and during the first client render, then hydrates from localStorage in `useEffect`. The displayed label may flicker from "AI" to the saved provider's name on the first client tick. This is acceptable; the topbar is small and the flicker is one frame. No `suppressHydrationWarning` needed because the rendered text only changes after hydration.
- **Malformed localStorage value.** Treated as "no config" and overwritten on next write. The user's stored keys are lost in this case, which is acceptable for a feature with no persistence guarantees.
- **localStorage unavailable (e.g. privacy mode in a future browser context).** All getters/setters silently no-op. The picker still works for the lifetime of the session; nothing persists.

## File-level changes

- `src/app/layout/top-bar.tsx` — import `<AiPicker />` from `@/modules/ai-picker`, render it before the "Run graph" button. No other changes.
- `src/modules/ai-picker/` — new module, files listed above.

No changes to `electron/main.cjs`, `electron/preload.cjs`, the `@/modules/ai` services, or any route.

## Testing

No automated tests are added in this pass. The project currently has no renderer test setup (Vitest exists but no `.test.tsx` files for UI). Manual verification of the five flows under "UX flow" is the chosen rigor level for this feature.

If the user disagrees, the smallest worthwhile addition would be unit tests for `useAiConfig` against a mocked `localStorage` — that's tractable in Vitest without DOM setup.

## Open questions

None. All design choices were resolved during brainstorming.
