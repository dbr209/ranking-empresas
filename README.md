# Ranking de empresas

Next.js (App Router) + TypeScript.

- `/` — a pessoa ordena as 10 empresas e envia (um voto por aparelho; reenviar substitui o voto).
- `/resultado` — ranking geral, atualiza a cada 5 s.
- `POST /api/votes` e `GET /api/votes` — API usada pelas páginas.

## Rodar local

    npm install
    npm run dev

## Trocar as empresas

Edite `lib/companies.ts`.

## Armazenamento

Por padrão os votos ficam **na memória do servidor** (`lib/store.ts`).
Na Vercel isso NÃO é confiável: cada função serverless tem sua própria memória e ela zera
em cold start/novo deploy, então os votos podem sumir ou divergir entre acessos.

Para persistir na Vercel, adicione um Redis da Upstash (Storage/Marketplace do projeto)
e garanta as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
(ou `KV_REST_API_URL`/`KV_REST_API_TOKEN`). O código troca sozinho para Redis, sem mudar mais nada.

Se preferir manter 100% em memória, rode em um servidor persistente (Render, Railway, VPS) com `npm run build && npm start`.

## Deploy na Vercel

    npx vercel
