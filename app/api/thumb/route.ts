import { NextRequest, NextResponse } from 'next/server'

// ─── Platform detectors & resolvers ───────────────────────────────────────────

type Resolver = (url: URL) => Promise<string | null>

// Returns true if the URL looks like a profile/collection page (no token ID)
function isProfileUrl(url: URL): boolean {
  const p = url.pathname
  const h = url.hostname

  // objkt.com/@handle or objkt.com/profile/...
  if (h.includes('objkt.com') && (p.match(/^\/@[^/]+\/?$/) || p.startsWith('/profile/'))) return true
  // foundation.app/@handle (no further path or just /collection)
  if (h.includes('foundation.app') && p.match(/^\/@[^/]+\/?$|^\/@[^/]+\/[^/]+\/?$/)) {
    // Allow /mint/eth/0x.../N
    if (p.includes('/mint/')) return false
    return true
  }
  // opensea.io/username (no assets/eth/contract/token structure)
  if (h.includes('opensea.io') && !p.includes('/assets/') && !p.includes('/collection/')) {
    // Profile: /username or /username/collected etc
    if (p.match(/^\/[^/]+\/?$/) || p.match(/^\/[^/]+\/(collected|created|favorited)/)) return true
  }
  // superrare.com/@handle
  if (h.includes('superrare.com') && p.match(/^\/@[^/]+\/?$/)) return true
  // exchange.art/artists/... (artist profile, not single token)
  if (h.includes('exchange.art') && p.startsWith('/artists/')) return true
  // fxhash.xyz/u/... (user profile)
  if (h.includes('fxhash.xyz') && p.startsWith('/u/')) return true

  return false
}

// Zora: zora.co/collect/zora:0xADDR/TOKEN_ID  or  zora.co/collect/base:0x.../N
async function resolveZora(url: URL): Promise<string | null> {
  const m = url.pathname.match(/\/collect\/([^/]+):?(0x[a-fA-F0-9]+)\/(\d+)/)
  if (!m) return null
  const [, chain, contract, tokenId] = m
  const chainId = chain?.toLowerCase().includes('base') ? '8453' :
                  chain?.toLowerCase().includes('oeth') ? '10'  :
                  chain?.toLowerCase().includes('zora') ? '7777777' : '1'
  try {
    const res = await fetch(
      `https://api.zora.co/discover/token/${chainId}/${contract}/${tokenId}`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.token?.image ?? (data?.token?.content?.mime_type?.startsWith('image') ? data?.token?.content?.url : null)
  } catch { return null }
}

// Objkt & Teia: objkt.com/tokens/KT1.../42  or  teia.art/objkt/42
async function resolveObjkt(url: URL): Promise<string | null> {
  let tokenId: string | null = null
  let contractAddr: string | null = null

  const teiaM = url.pathname.match(/\/objkt\/(\d+)/)
  if (teiaM) {
    tokenId = teiaM[1]
    contractAddr = 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton'
  }

  const objktM = url.pathname.match(/\/tokens?\/(KT[^/]+)\/(\d+)/)
  if (objktM) {
    contractAddr = objktM[1]
    tokenId = objktM[2]
  }

  const shortM = !objktM && !teiaM && url.pathname.match(/\/o\/(\d+)/)
  if (shortM) {
    tokenId = shortM[1]
    contractAddr = null
  }

  if (!tokenId) return null

  const query = contractAddr
    ? `{ token(where: {token_id: {_eq: "${tokenId}"}, fa_contract: {_eq: "${contractAddr}"}}) { display_uri artifact_uri thumbnail_uri } }`
    : `{ token(where: {token_id: {_eq: "${tokenId}"}}, limit: 1) { display_uri artifact_uri thumbnail_uri } }`

  try {
    const res = await fetch('https://data.objkt.com/v3/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const token = data?.data?.token?.[0]
    if (!token) return null
    const ipfsUri = token.display_uri || token.thumbnail_uri || token.artifact_uri
    return ipfsToHttp(ipfsUri)
  } catch { return null }
}

// fxhash: fxhash.xyz/gentk/SLUG  or  fxhash.xyz/generative/SLUG
async function resolveFxhash(url: URL): Promise<string | null> {
  const gentkM = url.pathname.match(/\/gentk\/([^/?]+)/)
  const genM   = url.pathname.match(/\/generative\/([^/?]+)/)

  if (gentkM) {
    const slug = gentkM[1]
    try {
      const res = await fetch('https://api.fxhash.xyz/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ objkt(id: ${isNaN(Number(slug)) ? `"${slug}"` : slug}) { metadata { thumbnailUri displayUri } } }`,
        }),
        next: { revalidate: 86400 },
      })
      const data = await res.json()
      const meta = data?.data?.objkt?.metadata
      const uri = meta?.displayUri || meta?.thumbnailUri
      return uri ? ipfsToHttp(uri) : null
    } catch { return null }
  }

  if (genM) {
    const slug = genM[1]
    try {
      const res = await fetch('https://api.fxhash.xyz/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ generativeToken(slug: "${slug}") { metadata { thumbnailUri displayUri } } }`,
        }),
        next: { revalidate: 86400 },
      })
      const data = await res.json()
      const meta = data?.data?.generativeToken?.metadata
      const uri = meta?.displayUri || meta?.thumbnailUri
      return uri ? ipfsToHttp(uri) : null
    } catch { return null }
  }

  return null
}

// Foundation: foundation.app/mint/eth/0xADDR/TOKEN_ID
async function resolveFoundation(url: URL): Promise<string | null> {
  const mintM = url.pathname.match(/\/mint\/(?:eth|base)?\/?(?:(0x[a-fA-F0-9]+))\/(\d+)/)
  if (mintM) {
    const [, contract, tokenId] = mintM
    return resolveERC721Metadata(contract, tokenId)
  }
  return null
}

// SuperRare: superrare.com/artwork-v2/TOKEN_ID  or  superrare.com/artwork/eth/0xADDR/TOKEN_ID
async function resolveSuperRare(url: URL): Promise<string | null> {
  const m = url.pathname.match(/\/artwork(?:-v2)?\/(?:eth\/)?(0x[a-fA-F0-9]+)\/(\d+)/)
  if (m) {
    const [, contract, tokenId] = m
    return resolveERC721Metadata(contract, tokenId)
  }
  const v2m = url.pathname.match(/\/artwork-v2\/(\d+)/)
  if (v2m) {
    return resolveERC721Metadata('0xb932a70A57673d89f4acfFBE830E8ed7f75Fb9e0', v2m[1])
  }
  return null
}

// Exchange.art: exchange.art/single/MINT_ADDR  (Solana)
async function resolveExchangeArt(url: URL): Promise<string | null> {
  const m = url.pathname.match(/\/single\/([A-Za-z0-9]+)/)
  if (!m) return null
  const mint = m[1]
  try {
    const res = await fetch(`https://api.exchange.art/v1/nfts/${mint}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.nft?.image ?? data?.image ?? null
  } catch { return null }
}

// Manifold (manifold.xyz/c/CONTRACT/TOKEN_ID)
async function resolveManifold(url: URL): Promise<string | null> {
  const m = url.pathname.match(/\/c\/(0x[a-fA-F0-9]+)\/(\d+)/)
  if (!m) return null
  return resolveERC721Metadata(m[1], m[2])
}

// OpenSea: opensea.io/assets/ethereum/0xADDR/TOKEN_ID
async function resolveOpenSea(url: URL): Promise<string | null> {
  const m = url.pathname.match(/\/assets\/(?:ethereum|base|matic|arbitrum)?\/?(?:(0x[a-fA-F0-9]+))\/(\d+)/)
  if (!m) return null
  return resolveERC721Metadata(m[1], m[2])
}

// Mallow (mallow.art) - Solana
async function resolveMallow(url: URL): Promise<string | null> {
  const m = url.pathname.match(/\/art\/([A-Za-z0-9]+)/)
  if (!m) return null
  const mint = m[1]
  try {
    const res = await fetch(`https://api.mallow.art/v1/nft/${mint}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.image ?? null
  } catch { return null }
}

// Generic EVM: fetch tokenURI from public RPC and resolve metadata
async function resolveERC721Metadata(contract: string, tokenId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.opensea.io/api/v2/chain/ethereum/contract/${contract}/nfts/${tokenId}`,
      {
        headers: { 'Accept': 'application/json', 'x-api-key': process.env.OPENSEA_API_KEY || '' },
        next: { revalidate: 86400 },
      }
    )
    if (res.ok) {
      const data = await res.json()
      return data?.nft?.image_url ?? data?.nft?.display_image_url ?? null
    }
  } catch {}

  if (process.env.ALCHEMY_API_KEY) {
    try {
      const res = await fetch(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}`,
        { next: { revalidate: 86400 } }
      )
      if (res.ok) {
        const data = await res.json()
        return data?.image?.cachedUrl ?? data?.image?.originalUrl ?? null
      }
    } catch {}
  }

  return null
}

// ─── OG image fallback ─────────────────────────────────────────────────────────

// Try to extract og:image from a page — useful for platforms we don't have a
// specific resolver for, or when the resolver returns null.
async function resolveOgImage(rawUrl: string): Promise<string | null> {
  try {
    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CuradoriaBot/1.0; +https://exposicaotkn2026.vercel.app)',
        'Accept': 'text/html',
      },
      // Short timeout via signal
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return null
    const html = await res.text()

    // Match og:image or twitter:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
              || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
              || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
              || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)

    if (ogMatch && ogMatch[1]) {
      let imgUrl = ogMatch[1]
      // Resolve relative URLs
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
      else if (imgUrl.startsWith('/')) {
        const base = new URL(rawUrl)
        imgUrl = `${base.protocol}//${base.host}${imgUrl}`
      }
      return imgUrl
    }
    return null
  } catch { return null }
}

// IPFS → HTTP gateway
function ipfsToHttp(uri: string | null | undefined): string | null {
  if (!uri) return null
  if (uri.startsWith('ipfs://')) {
    const cid = uri.slice(7)
    return `https://ipfs.io/ipfs/${cid}`
  }
  if (uri.startsWith('https://') || uri.startsWith('http://')) return uri
  return null
}

// ─── Platform routing ──────────────────────────────────────────────────────────

const RESOLVERS: Array<{ match: (u: URL) => boolean; resolve: Resolver }> = [
  {
    match: u => u.hostname.includes('zora.co'),
    resolve: resolveZora,
  },
  {
    match: u => u.hostname.includes('objkt.com'),
    resolve: resolveObjkt,
  },
  {
    match: u => u.hostname.includes('teia.art') || u.hostname.includes('hicetnunc'),
    resolve: resolveObjkt,
  },
  {
    match: u => u.hostname.includes('fxhash.xyz'),
    resolve: resolveFxhash,
  },
  {
    match: u => u.hostname.includes('foundation.app'),
    resolve: resolveFoundation,
  },
  {
    match: u => u.hostname.includes('superrare.com'),
    resolve: resolveSuperRare,
  },
  {
    match: u => u.hostname.includes('exchange.art'),
    resolve: resolveExchangeArt,
  },
  {
    match: u => u.hostname.includes('manifold.xyz') || u.hostname.includes('gallery.manifold.xyz'),
    resolve: resolveManifold,
  },
  {
    match: u => u.hostname.includes('opensea.io'),
    resolve: resolveOpenSea,
  },
  {
    match: u => u.hostname.includes('mallow.art'),
    resolve: resolveMallow,
  },
]

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const platform = parsed.hostname.replace(/^www\./, '').split('.')[0]

  // Early exit for profile/collection pages — no image to resolve
  if (isProfileUrl(parsed)) {
    return NextResponse.json({ imageUrl: null, platform, reason: 'profile' })
  }

  const resolver = RESOLVERS.find(r => r.match(parsed))

  try {
    let imageUrl: string | null = null

    if (resolver) {
      imageUrl = await resolver.resolve(parsed)
    }

    // Fallback: try OG image scraping (for unknown platforms OR when resolver returned null)
    if (!imageUrl) {
      imageUrl = await resolveOgImage(rawUrl)
    }

    return NextResponse.json({ imageUrl, platform })
  } catch (err) {
    console.error('[thumb] Error resolving', rawUrl, err)
    return NextResponse.json({ imageUrl: null, platform }, { status: 200 })
  }
}
