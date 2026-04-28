# Bible On Air Web

A simple Next.js + TypeScript frontend for reading daily devotional content from `bible-on-air-api`.

## Setup

1. Copy `.env.sample` to `.env.local`
2. Update `NEXT_PUBLIC_API_BASE_URL` if needed
3. Install dependencies

```bash
yarn install
```

## Run

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Notes

- Uses Next.js App Router
- Fetches articles from `bible-on-air-api`
- Renders daily devotional pages under `/YYYY-MM-DD`
