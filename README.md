# TokenNation — Curadoria 2026

Site da exposição de arte digital do NFT Brasil. Inclui:

- **Página inicial** — histórico das edições 2023–2026
- **Viewer** (`/viewer`) — acervo interativo navegável por artista, tipo, edição ou ano
- **Admin** (`/admin`) — painel para ativar/desativar obras e fazer upload de mídia

Todo o acervo é servido diretamente pelo **PocketBase** — sem dependências do Google.

## Deploy no Vercel (recomendado)

1. Faça fork ou clone deste repositório para o seu GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repositório
3. O Vercel detecta Next.js automaticamente — clique em **Deploy**
4. Pronto. O viewer já conecta automaticamente ao servidor PocketBase do TokenNation

### Variável de ambiente (opcional)

Só é necessária se quiser apontar para um PocketBase diferente:

| Variável | Descrição | Padrão |
|---|---|---|
| `NEXT_PUBLIC_PB_URL` | URL do PocketBase | `https://pocketbase-tokennation.dokploy.tekne.studio` |

No Vercel: **Settings → Environment Variables**.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Estrutura

```
app/
  page.tsx              # Página inicial (histórico das edições)
  viewer/page.tsx       # Acervo interativo (conecta direto ao PocketBase)
  admin/page.tsx        # Painel admin (requer login PocketBase)
  api/
    img/route.ts        # Proxy de imagem
    thumb/route.ts      # Proxy de thumbnail
public/
  ambientes/            # Fotos dos ambientes das exposições
```

## Acesso admin

A página `/admin` pede e-mail e senha do PocketBase (superuser). As credenciais são gerenciadas pelo time TokenNation — não são armazenadas no código.
