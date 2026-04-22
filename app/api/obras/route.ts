import { NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || ''

export async function GET() {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: 'APPS_SCRIPT_URL not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getObras`, {
      next: { revalidate: 10 }, // cache 10s
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch obras' }, { status: 500 })
  }
}
