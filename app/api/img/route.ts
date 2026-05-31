import { NextRequest, NextResponse } from 'next/server'

// Proxy de imagem — evita CORS e mixed-content issues no browser
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('src')
  if (!src) return new NextResponse('Missing src', { status: 400 })

  // Só aceita https para segurança
  let url: URL
  try {
    url = new URL(src)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return new NextResponse('Invalid protocol', { status: 400 })
    }
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CuradoriaBot/1.0)',
        'Accept': 'image/*,*/*',
      },
      next: { revalidate: 86400 },
    })

    if (!res.ok) return new NextResponse('Upstream error', { status: 502 })

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 })
  }
}
