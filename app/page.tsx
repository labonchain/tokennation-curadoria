'use client'

import { useEffect, useState, useCallback } from 'react'

type Voto = '✅ Sim' | '❌ Não' | '🤔 Talvez' | ''

interface Obra {
  row: number
  nomeArtistico: string
  evento: string
  titulo: string
  descricao: string
  ano: string
  formato: string
  drive: string
  marketplace: string
  voto1: Voto
  voto2: Voto
  voto3: Voto
  resultado: string
}

const CURADORES = ['Curador 1', 'Curador 2', 'Curador 3'] as const
type Curador = 1 | 2 | 3

const VOTO_ICONS: Record<string, string> = {
  '✅ Sim': '✅',
  '❌ Não': '❌',
  '🤔 Talvez': '🤔',
}

function getVotoBadge(v: Voto) {
  if (v === '✅ Sim')    return 'sim'
  if (v === '❌ Não')    return 'nao'
  if (v === '🤔 Talvez') return 'talvez'
  return ''
}

function getThumbUrl(driveUrl: string): string | null {
  // Convert Google Drive share links to direct image/preview
  const fileMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w400`
  }
  // Dropbox
  if (driveUrl.includes('dropbox.com') && /\.(png|jpg|jpeg|gif|webp)/i.test(driveUrl)) {
    return driveUrl.replace('dl=0', 'raw=1')
  }
  return null
}

function CardSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-thumb" />
      <div className="skeleton-body">
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-line short" />
      </div>
      <div className="skeleton-actions" />
    </div>
  )
}

export default function Home() {
  const [obras, setObras]         = useState<Obra[]>([])
  const [loading, setLoading]     = useState(true)
  const [curador, setCurador]     = useState<Curador>(1)
  const [filtroEvento, setFiltro] = useState('todos')
  const [filtroVoto, setFiltroV]  = useState('todos')
  const [busca, setBusca]         = useState('')
  const [voting, setVoting]       = useState<Record<number, boolean>>({})
  const [toast, setToast]         = useState<string | null>(null)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

  const fetchObras = useCallback(async () => {
    try {
      const res = await fetch('/api/obras')
      const data = await res.json()
      if (data.obras) setObras(data.obras)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchObras() }, [fetchObras])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const votar = async (obra: Obra, voto: Voto) => {
    const curVoto = curador === 1 ? obra.voto1 : curador === 2 ? obra.voto2 : obra.voto3
    if (voting[obra.row]) return

    // Optimistic update
    setObras(prev => prev.map(o => {
      if (o.row !== obra.row) return o
      const next = { ...o }
      const key = `voto${curador}` as 'voto1' | 'voto2' | 'voto3'
      next[key] = curVoto === voto ? '' : voto
      return next
    }))

    setVoting(v => ({ ...v, [obra.row]: true }))

    try {
      const newVoto = curVoto === voto ? '' : voto
      await fetch('/api/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: obra.row, curador, voto: newVoto }),
      })
      showToast(newVoto ? `${VOTO_ICONS[newVoto]} Voto salvo!` : 'Voto removido')
    } catch {
      showToast('❌ Erro ao salvar voto')
      fetchObras() // revert on error
    } finally {
      setVoting(v => ({ ...v, [obra.row]: false }))
    }
  }

  const obrasFiltradas = obras.filter(o => {
    if (filtroEvento !== 'todos' && o.evento !== filtroEvento) return false
    if (busca && !o.titulo.toLowerCase().includes(busca.toLowerCase()) &&
        !o.nomeArtistico.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroVoto !== 'todos') {
      const meuVoto = curador === 1 ? o.voto1 : curador === 2 ? o.voto2 : o.voto3
      if (filtroVoto === 'sem-voto' && meuVoto) return false
      if (filtroVoto === 'sim'     && meuVoto !== '✅ Sim') return false
      if (filtroVoto === 'nao'     && meuVoto !== '❌ Não') return false
      if (filtroVoto === 'talvez'  && meuVoto !== '🤔 Talvez') return false
    }
    return true
  })

  const countVoto = (v: string) => obras.filter(o => {
    const mv = curador === 1 ? o.voto1 : curador === 2 ? o.voto2 : o.voto3
    return mv === v
  }).length

  return (
    <>
      <header className="header">
        <h1>🎨 Curadoria NFT Brasil 2026</h1>
        <span className="header-meta">{obras.length} obras · {obras.filter(o => o.resultado === '✅ SELECIONADA').length} selecionadas</span>
      </header>

      <div className="toolbar">
        {/* Curador selector */}
        <div className="curador-selector">
          <span className="filter-label">Você é:</span>
          {([1, 2, 3] as Curador[]).map(n => (
            <button
              key={n}
              className={`curador-btn ${curador === n ? 'active' : ''}`}
              onClick={() => setCurador(n)}
            >
              Curador {n}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-group">
          <span className="filter-label">Evento:</span>
          <select value={filtroEvento} onChange={e => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="TokenNation 2025">TokenNation 2025</option>
            <option value="NFT Brasil 2024">NFT Brasil 2024</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Meu voto:</span>
          <select value={filtroVoto} onChange={e => setFiltroV(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="sem-voto">Sem voto</option>
            <option value="sim">✅ Sim</option>
            <option value="nao">❌ Não</option>
            <option value="talvez">🤔 Talvez</option>
          </select>
        </div>

        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar obra ou artista..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ width: 220 }}
          />
        </div>

        <div className="stats-bar">
          <div className="stat">
            <div className="stat-dot" style={{ background: 'var(--sim)' }} />
            <span>{countVoto('✅ Sim')} sim</span>
          </div>
          <div className="stat">
            <div className="stat-dot" style={{ background: 'var(--nao)' }} />
            <span>{countVoto('❌ Não')} não</span>
          </div>
          <div className="stat">
            <div className="stat-dot" style={{ background: 'var(--talvez)' }} />
            <span>{countVoto('🤔 Talvez')} talvez</span>
          </div>
          <div className="stat">
            <div className="stat-dot" style={{ background: 'var(--muted)' }} />
            <span>{obras.length - countVoto('✅ Sim') - countVoto('❌ Não') - countVoto('🤔 Talvez')} sem voto</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid">
          {obrasFiltradas.length === 0 && (
            <div className="empty">Nenhuma obra encontrada</div>
          )}
          {obrasFiltradas.map(obra => {
            const meuVoto = curador === 1 ? obra.voto1 : curador === 2 ? obra.voto2 : obra.voto3
            const votoBadge = getVotoBadge(meuVoto)
            const thumbUrl = imgErrors[obra.row] ? null : getThumbUrl(obra.drive)

            return (
              <div key={obra.row} className={`card ${votoBadge ? `voted-${votoBadge}` : ''}`}>
                <div className="card-thumb">
                  {thumbUrl && !imgErrors[obra.row] ? (
                    <img
                      src={thumbUrl}
                      alt={obra.titulo}
                      onError={() => setImgErrors(e => ({ ...e, [obra.row]: true }))}
                    />
                  ) : (
                    <div className="card-thumb-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      {obra.drive && (
                        <a href={obra.drive} target="_blank" rel="noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent)', opacity: 0.8 }}>
                          Ver arquivo ↗
                        </a>
                      )}
                    </div>
                  )}

                  <span className={`evento-badge ${obra.evento === 'TokenNation 2025' ? 'badge-tn' : 'badge-alem'}`}>
                    {obra.evento === 'TokenNation 2025' ? 'TN 2025' : '2024'}
                  </span>

                  {votoBadge && (
                    <div className={`vote-badge ${votoBadge}`}>
                      {VOTO_ICONS[meuVoto]}
                    </div>
                  )}
                </div>

                <div className="card-body">
                  <div className="card-title" title={obra.titulo}>{obra.titulo}</div>
                  <div className="card-artist">{obra.nomeArtistico}</div>
                  <div className="card-year">{obra.ano}{obra.formato ? ` · ${obra.formato}` : ''}</div>
                  {obra.drive && (
                    <a className="drive-link" href={obra.drive} target="_blank" rel="noreferrer">
                      🔗 Ver arquivo da obra
                    </a>
                  )}
                  {obra.marketplace && (
                    <a className="drive-link" href={obra.marketplace} target="_blank" rel="noreferrer">
                      🛒 Ver no marketplace
                    </a>
                  )}
                </div>

                <div className="card-actions">
                  {(['✅ Sim', '❌ Não', '🤔 Talvez'] as Voto[]).map(v => (
                    <button
                      key={v}
                      className={`btn-vote ${getVotoBadge(v)} ${meuVoto === v ? 'active' : ''} ${voting[obra.row] ? 'loading' : ''}`}
                      onClick={() => votar(obra, v)}
                      disabled={voting[obra.row]}
                    >
                      {VOTO_ICONS[v!]} {v === '✅ Sim' ? 'Sim' : v === '❌ Não' ? 'Não' : 'Talvez'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
