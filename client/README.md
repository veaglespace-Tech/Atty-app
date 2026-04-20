This Next.js client is configured to use Turbopack for local development and production builds.

## API URL Setup (Local + Live)

The client now supports automatic API URL selection without editing code every time:

- Local hosts (`localhost`, `127.x.x.x`, LAN IPs) use `NEXT_PUBLIC_API_URL_LOCAL`
- Live/non-local hosts use `NEXT_PUBLIC_API_URL_PROD`
- If `NEXT_PUBLIC_API_URL` is set, it overrides both

Use `.env.example` as reference and keep your actual values in `.env`.

## Getting Started

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

If you want to clear the `.next` cache before starting:

```bash
npm run dev:clean
```

Create a production build with Turbopack:

```bash
npm run build
```
