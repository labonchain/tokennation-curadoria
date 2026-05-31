'use client'

import { useEffect, useState, useCallback } from 'react'

const PB_BASE = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-tokennation.dokploy.tekne.studio'

interface Obra {
  id: string
  titulo: string
  nomeArtistico: string
  evento: string
  formato: string
  marketplace: string
  ativo: boolean
  thumb: string
  media: string
}

type Filter = 'all' | 'ativo' | 'inativo' | 'sem-media'

export default function AdminPage() {
  const [token, setToken]       = useState<string | null>(null)
  const [email, setEmail]       = useState('acervo@tokennation.com.br')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [obras, setObras]       = useState<Obra[]>([])
  const [loading, setLoading]   = useState(false)
  const [filter, setFilter]     = useState<Filter>('all')
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = localStorage.getItem('admin_pb_token')
    if (t) setToken(t)
  }, [])

  const login = async () => {
    setLoginError('')
    try {
      const res = await fetch(`${PB_BASE}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password }),
      })
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
        localStorage.setItem('admin_pb_token', data.token)
      } else {
        setLoginError('Credenciais inválidas')
      }
    } catch {
      setLoginError('Erro de conexão')
    }
  }

  const fetchObras = useCallback(async (tk: string) => {
    setLoading(true)
    const all: Obra[] = []
    let page = 1
    while (true) {
      const res = await fetch(
        `${PB_BASE}/api/collections/obras/records?perPage=200&page=${page}&fields=id,titulo,nomeArtistico,evento,formato,marketplace,ativo,thumb,media&sort=-created`,
        { headers: { Authorization: `Bearer ${tk}` } }
      )
      const data = await res.json()
      if (data.code === 401) {
        setToken(null)
        localStorage.removeItem('admin_pb_token')
        setLoading(false)
        return
      }
      all.push(...(data.items || []))
      if (page >= data.totalPages) break
      page++
    }
    setObras(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (token) fetchObras(token)
  }, [token, fetchObras])

  const toggle = async (obra: Obra) => {
    if (!token) return
    setSaving(prev => new Set(prev).add(obra.id))
    try {
      const res = await fetch(`${PB_BASE}/api/collections/obras/records/${obra.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !obra.ativo }),
      })
      if (res.ok) {
        setObras(prev => prev.map(o => o.id === obra.id ? { ...o, ativo: !o.ativo } : o))
      }
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(obra.id); return s })
    }
  }

  const uploadFile = async (obra: Obra, field: 'media' | 'thumb', file: File) => {
    if (!token) return
    const key = `${obra.id}-${field}`
    setUploading(prev => new Set(prev).add(key))
    try {
      const form = new FormData()
      form.append(field, file)
      const res = await fetch(`${PB_BASE}/api/collections/obras/records/${obra.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (res.ok) {
        const updated = await res.json()
        setObras(prev => prev.map(o => o.id === obra.id ? { ...o, [field]: updated[field] } : o))
      }
    } finally {
      setUploading(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const triggerUpload = (obra: Obra, field: 'media' | 'thumb') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = field === 'thumb' ? 'image/*' : '*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) uploadFile(obra, field, file)
    }
    input.click()
  }

  const thumbUrl = (obra: Obra) => {
    if (obra.thumb)  return `${PB_BASE}/api/files/obras/${obra.id}/${obra.thumb}?thumb=256x256`
    if (obra.media)  return `${PB_BASE}/api/files/obras/${obra.id}/${obra.media}?thumb=256x256`
    return null
  }

  const filtradas = obras.filter(o => {
    if (filter === 'ativo'    && !o.ativo)  return false
    if (filter === 'inativo'  &&  o.ativo)  return false
    if (filter === 'sem-media' && o.media)  return false
    if (search) {
      const s = search.toLowerCase()
      return o.titulo?.toLowerCase().includes(s) || o.nomeArtistico?.toLowerCase().includes(s)
    }
    return true
  })

  const ativas          = obras.filter(o =>  o.ativo).length
  const inativas        = obras.filter(o => !o.ativo).length
  const inativasComMidia = obras.filter(o => !o.ativo &&  o.media).length
  const inativasSemMidia = obras.filter(o => !o.ativo && !o.media).length
  const comMedia        = obras.filter(o => o.media).length
  const semMedia        = obras.filter(o => !o.media).length

  // ─── Login ──────────────────────────────────────────────────────────────────

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 40, width: 340 }}>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Admin <span style={{ color: '#e040fb' }}>TokenNation</span></div>
          <div style={{ color: '#555', fontSize: 13, marginBottom: 28 }}>Acesso restrito</div>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ ...inputStyle, marginBottom: loginError ? 10 : 18 }}
          />
          {loginError && <div style={{ color: '#f55', fontSize: 13, marginBottom: 14 }}>{loginError}</div>}
          <button onClick={login} style={btnPrimary}>Entrar →</button>
        </div>
      </div>
    )
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #1e1e1e', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Admin <span style={{ color: '#e040fb' }}>TokenNation</span></div>
        <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: 12 }}>
            <span style={{ color: '#22c55e' }}>{ativas}</span> ativas ·{' '}
            <span style={{ color: '#ef4444' }}>{inativas}</span> inativas{' '}
            <span style={{ color: '#333' }}>({' '}</span>
            <span style={{ color: '#f59e0b' }}>{inativasComMidia}</span>
            <span style={{ color: '#555' }}> c/ mídia · </span>
            <span style={{ color: '#ef4444' }}>{inativasSemMidia}</span>
            <span style={{ color: '#555' }}> s/ mídia</span>
            <span style={{ color: '#333' }}>{' '})</span>
            {' '}· {obras.length} total
          </span>
          <button
            onClick={() => fetchObras(token)}
            style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', color: '#888', fontSize: 12, cursor: 'pointer' }}
          >↺ Atualizar</button>
          <button
            onClick={() => { setToken(null); localStorage.removeItem('admin_pb_token') }}
            style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', color: '#666', fontSize: 12, cursor: 'pointer' }}
          >Sair</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '14px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #1a1a1a' }}>
        <input
          type="text"
          placeholder="Buscar por obra ou artista..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 260, marginBottom: 0, fontSize: 13 }}
        />
        {([
          ['all',      'Todas'],
          ['ativo',    'Ativas'],
          ['inativo',  'Inativas'],
          ['sem-media','Sem media'],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? '#e040fb' : '#1a1a1a',
              border: '1px solid ' + (filter === f ? '#e040fb' : '#2a2a2a'),
              borderRadius: 6, padding: '6px 14px', color: '#fff', fontSize: 12, cursor: 'pointer',
            }}
          >{label}</button>
        ))}
        <span style={{ color: '#444', fontSize: 12, marginLeft: 4 }}>{filtradas.length} obras</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#444' }}>Carregando {obras.length} obras...</div>
      ) : (
        <div style={{ padding: '16px 20px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {filtradas.map(obra => {
            const img           = thumbUrl(obra)
            const isSaving      = saving.has(obra.id)
            const isUploadMedia = uploading.has(`${obra.id}-media`)
            const isUploadThumb = uploading.has(`${obra.id}-thumb`)
            return (
              <div
                key={obra.id}
                style={{
                  background: '#111',
                  border: '1px solid ' + (obra.ativo ? '#222' : '#181818'),
                  borderRadius: 8,
                  overflow: 'hidden',
                  opacity: obra.ativo ? 1 : 0.55,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', aspectRatio: '1', background: '#0d0d0d', overflow: 'hidden' }}>
                  {img ? (
                    <img src={img} alt={obra.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a', fontSize: 11 }}>
                      sem media
                    </div>
                  )}
                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: obra.ativo ? '#22c55e' : '#ef4444',
                    borderRadius: '50%', width: 7, height: 7,
                    boxShadow: obra.ativo ? '0 0 6px #22c55e' : 'none',
                  }} />
                </div>

                {/* Info */}
                <div style={{ padding: '8px 8px 6px' }}>
                  <div style={{ fontSize: 11, color: '#ccc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={obra.titulo}>
                    {obra.titulo || '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {obra.nomeArtistico || '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#444', marginTop: 1 }}>
                    {obra.evento || '—'}{obra.formato ? ` · ${obra.formato}` : ''}
                  </div>
                  <button
                    onClick={() => toggle(obra)}
                    disabled={isSaving}
                    style={{
                      marginTop: 7, width: '100%',
                      background: obra.ativo ? 'transparent' : '#e040fb18',
                      border: '1px solid ' + (obra.ativo ? '#2a2a2a' : '#e040fb55'),
                      borderRadius: 5, padding: '5px 0', fontSize: 11,
                      color: obra.ativo ? '#555' : '#e040fb',
                      cursor: isSaving ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSaving ? '···' : obra.ativo ? 'Desativar' : 'Ativar'}
                  </button>

                  {/* Upload buttons */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                    <button
                      onClick={() => triggerUpload(obra, 'media')}
                      disabled={isUploadMedia}
                      title="Substituir arquivo de mídia"
                      style={{
                        flex: 1,
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: 5, padding: '5px 0', fontSize: 10,
                        color: isUploadMedia ? '#666' : '#aaa',
                        cursor: isUploadMedia ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isUploadMedia ? '···' : '⬆ Mídia'}
                    </button>
                    <button
                      onClick={() => triggerUpload(obra, 'thumb')}
                      disabled={isUploadThumb}
                      title="Substituir thumbnail"
                      style={{
                        flex: 1,
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: 5, padding: '5px 0', fontSize: 10,
                        color: isUploadThumb ? '#666' : '#aaa',
                        cursor: isUploadThumb ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isUploadThumb ? '···' : '⬆ Thumb'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {filtradas.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#333' }}>
              Nenhuma obra encontrada
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 6,
  padding: '9px 12px',
  color: '#fff',
  fontSize: 14,
  marginBottom: 10,
  boxSizing: 'border-box',
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  background: '#e040fb',
  border: 'none',
  borderRadius: 6,
  padding: '10px 0',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}
