import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || ''

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: 'APPS_SCRIPT_URL not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { row, email, voto, edicao } = body

  if (!row || !email || !voto || !edicao) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'votarPublico', row, email, voto, edicao }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
