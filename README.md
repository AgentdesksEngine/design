# Radius Design Gallery

Internal gallery for Radius design prototypes. Designers and agents commit HTML prototypes under
`catalog/`; the app indexes those manifests, stores workflow status in Supabase, and renders the
prototypes behind Radius email OTP.

## Local Development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The web app runs on `http://localhost:5174`; the local Vercel-style API shim runs on
`http://localhost:3002` and is proxied under `/api`.

## Adding a Design

Create a folder under `catalog/<design-slug>/` with a `manifest.json` and one folder per version:

```text
catalog/example-design/
  manifest.json
  v1/
    index.html
    thumbnail.svg
```

Run `pnpm design:validate` before pushing. Prototype HTML is trusted internal code in v1: it is
rendered without an iframe, so code review is the security boundary.

## Deploy

Deploy with Vercel using the Vite preset. Add `design.radiusagents.com` as the production domain,
set `APP_URL=https://design.radiusagents.com`, and add the Supabase redirect URL in Auth settings.
