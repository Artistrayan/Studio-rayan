# Rayan Studio — Web Preview

This repository contains a browser-based React + Vite studio.

## Local development

Requirements: Bun (the repository lockfile is `bun.lock`).

```bash
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite (port 3000).

## Production build

```bash
bun install --frozen-lockfile
GITHUB_PAGES=true bun run build
bun run preview
```

The GitHub Pages build uses the repository base path `/Studio-rayan/`. Local development keeps the root path.

## GitHub Pages preview

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` or `web-preview-setup`.
4. Check the **Web Preview** workflow under the Actions tab.
5. After a successful deployment, GitHub Pages publishes the site at:
   `https://artistrayan.github.io/Studio-rayan/`

Pull requests run the build but do not publish a deployment.

## Current testing scope

This workflow verifies dependency installation and the Vite production build. TypeScript diagnostics are also run and reported, but are non-blocking until the existing type errors are triaged.

A successful static deployment does not mean every studio subsystem is production-ready. Features that require external model services, server-side APIs, credentials, or native capabilities must be configured and tested separately. Never put private API keys in browser-exposed `VITE_*` variables.
