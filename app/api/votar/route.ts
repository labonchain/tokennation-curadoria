import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || ''

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: 'APPS_SCRIPT_URL not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { row, curador, voto } = body

  if (!row || !curador || !voto) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'votar', row, curador, voto }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
