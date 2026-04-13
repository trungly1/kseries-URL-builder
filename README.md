# K-Series OAuth 2.0 Builder

A client-side tool for building OAuth 2.0 authorization URLs and cURL commands for the Lightspeed K-Series API (V2 clients only).

**No data leaves the browser** — all encoding and URL construction happens locally.

---

## Project Structure

```
├── src/
│   ├── main.jsx          # React entry point
│   └── App.jsx           # OAuth builder component
├── index.html            # Vite HTML entry
├── vite.config.js
├── package.json
├── Dockerfile            # Multi-stage: build + nginx
├── docker-compose.yml
├── .gitignore
└── .dockerignore
```

---

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Option 1: Docker

### Build & run

```bash
docker compose up -d --build
# → http://localhost:3000
```

### Or without compose

```bash
docker build -t kseries-oauth-builder .
docker run -d -p 3000:80 --name kseries-oauth-builder kseries-oauth-builder
```

### Stop

```bash
docker compose down
# or
docker stop kseries-oauth-builder && docker rm kseries-oauth-builder
```

---

## Option 2: Cloudflare Pages

### Via dashboard (easiest)

1. Push this repo to GitHub
2. Go to [Cloudflare Pages](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**
3. Connect your GitHub repo
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Deploy

Cloudflare auto-deploys on every push to your default branch.

### Via Wrangler CLI

```bash
# Install wrangler
npm install -g wrangler

# Build locally
npm run build

# Deploy
wrangler pages deploy dist --project-name=kseries-oauth-builder
```

---

## Notes

- This tool is V2 only — client IDs must start with `devp-v2-`
- All processing is client-side; no backend, no API calls, no data stored
- Unofficial tool — refer to [official documentation](https://api-portal.lsk.lightspeed.app/quick-start/authentication/authorization-overview)
