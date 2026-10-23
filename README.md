# The Logbook PWA prototype

A mobile-first prototype for a simpler The Logbook. It uses React, TypeScript, Vite and `vite-plugin-pwa`.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use `demo@thelogbook.se` and `demo123` on the demo sign-in screen. These are **fake credentials**; the prototype never calls KEKS. Activities created in the demo are stored in browser `localStorage`.

`npm run build` checks TypeScript and creates an installable production PWA in `dist/`. The service worker caches the app shell for offline viewing. It does not queue activity submissions to the backend.

## GitHub Pages demo

The production build uses `/thelogbook-wpa/` as its base path. Local `npm run dev` still serves the app at `/`. The [Pages workflow](.github/workflows/pages.yml) checks pull requests, then builds and deploys `dist/` after a push to `master` or a manual run.

In the GitHub repository, choose **Settings → Pages → Build and deployment → Source: GitHub Actions**. The demo URL is `https://mrccollective.github.io/thelogbook-wpa/`. The repository and the published demo are public.

To inspect the Pages build locally, run `npm ci`, `npm run build`, and `npm run preview`, then open `/thelogbook-wpa/` on the preview server. The demo login, member data and activities remain browser-only examples. No KEKS API or real check-in is used.

## First-version scope

- Sign in (simulated in this prototype)
- View activities in a list and calendar
- Create an activity for an **existing** operation
- No operation creation, editing, deletion, or reporting

The prototype deliberately has a single data boundary in [`src/data/types.ts`](src/data/types.ts). [`src/data/demo.ts`](src/data/demo.ts) supplies fake data now. A later API implementation can replace that repository without changing the screens.

Read [`docs/backend-integration.md`](docs/backend-integration.md) before connecting the real backend. [`openapi/pwa-v1.yaml`](openapi/pwa-v1.yaml) is a **proposed** client contract, not an implemented KEKS API. The existing KEKS repository and API have not been changed.
