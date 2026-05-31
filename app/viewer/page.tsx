'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import s from './viewer.module.css'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Obra {
  id: string
  collectionId: string
  titulo: string
  descricao: string
  ano: number | null
  formato: string
  media: string
  thumb: string
  blockchain: string
  marketplace: string
  exposicaoTitulo: string
  artistaNome: string
}

interface Artista {
  id: string
  nome_artistico: string
  cidade: string
  estado: string
  pais: string
  bio: string
  obras: Obra[]
}

interface Panel {
  id: string
  name: string
  sub: string
  desc: string
  obras: Obra[]
}

type Mode = 'home' | 'artists' | 'catList' | 'panel' | 'artwork'
type CatType = 'tipo' | 'edicao' | 'ano'

// ─── PocketBase helpers ─────────────────────────────────────────────────────────

const PB = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-tokennation.dokploy.tekne.studio'

const FIELDS = [
  'id', 'collectionId', 'titulo', 'descricao', 'ano', 'formato', 'media', 'thumb', 'blockchain', 'marketplace',
  'expand.artista.id', 'expand.artista.nome_artistico',
  'expand.artista.cidade', 'expand.artista.estado', 'expand.artista.pais', 'expand.artista.bio',
  'expand.exposicao.titulo',
].join(',')

function thumbUrl(obra: Obra): string | null {
  const file = obra.thumb || (!isVideo(obra.media) ? obra.media : null)
  if (!file) return null
  return `${PB}/api/files/${obra.collectionId}/${obra.id}/${file}?thumb=300x300f`
}

function fullUrl(obra: Obra): string {
  if (isVideo(obra.media)) {
    return `${PB}/api/files/${obra.collectionId}/${obra.id}/${obra.media}`
  }
  const file = obra.thumb || obra.media
  if (!file) return ''
  return `${PB}/api/files/${obra.collectionId}/${obra.id}/${file}?thumb=1920x1920f`
}

function isVideo(fname: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(fname ?? '')
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function normalizeTipo(obra: Obra): string {
  if (isVideo(obra.media)) return 'Vídeo'
  if (/\.gif$/i.test(obra.media || '') || /\.gif$/i.test(obra.thumb || '')) return 'Animação'
  const f = (obra.formato || '').toLowerCase()
  if (/gif|animaç|animac/.test(f)) return 'Animação'
  if (/vídeo|video|mp4|webm|mov/.test(f)) return 'Vídeo'
  if (/física|fisica|physical/.test(f)) return 'Física'
  if (/mista|phygital|mixed/.test(f)) return 'Mista'
  return 'Digital'
}

function buildGroups(artistas: Artista[], catType: CatType): Panel[] {
  const allObras: Obra[] = artistas.reduce<Obra[]>((acc, a) => acc.concat(a.obras), [])
  const map = new Map<string, Obra[]>()
  for (const o of allObras) {
    let key: string
    if (catType === 'tipo')        key = normalizeTipo(o)
    else if (catType === 'edicao') key = o.exposicaoTitulo || 'Sem edição'
    else                           key = o.ano ? String(o.ano) : 'Sem ano'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(o)
  }

  let entries = Array.from(map.entries())
  if (catType === 'tipo') {
    const ORDER = ['Digital', 'Animação', 'Vídeo', 'Mista', 'Física']
    const ordered = ORDER.filter(k => map.has(k)).map<[string, Obra[]]>(k => [k, map.get(k)!])
    const rest    = entries.filter(([k]) => ORDER.indexOf(k) === -1)
    entries = ordered.concat(rest)
  } else if (catType === 'ano') {
    entries.sort((a, b) => {
      if (a[0] === 'Sem ano') return 1
      if (b[0] === 'Sem ano') return -1
      return Number(b[0]) - Number(a[0])
    })
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { sensitivity: 'base' }))
  }

  return entries.map<Panel>(([k, obras]) => ({
    id: k,
    name: k,
    sub: `${obras.length} obra${obras.length !== 1 ? 's' : ''}`,
    desc: '',
    obras,
  }))
}

function artistaToPanel(a: Artista): Panel {
  return {
    id: a.id,
    name: a.nome_artistico,
    sub: [a.cidade, a.pais].filter(Boolean).join(' · '),
    desc: a.bio,
    obras: a.obras,
  }
}

async function loadData(): Promise<Artista[]> {
  const items: any[] = []
  let page = 1
  while (true) {
    const r = await fetch(
      `${PB}/api/collections/obras/records?page=${page}&perPage=500&skipTotal=1` +
      `&expand=artista,exposicao&sort=titulo&fields=${encodeURIComponent(FIELDS)}`
    )
    if (!r.ok) break
    const d = await r.json()
    items.push(...(d.items ?? []))
    if ((d.items?.length ?? 0) < 500) break
    page++
  }

  const map = new Map<string, Artista>()
  for (const item of items) {
    const a = item.expand?.artista
    if (!a) continue
    if (!map.has(a.id)) {
      map.set(a.id, {
        id: a.id,
        nome_artistico: a.nome_artistico ?? '',
        cidade: a.cidade ?? '',
        estado: a.estado ?? '',
        pais: a.pais ?? '',
        bio: a.bio ?? '',
        obras: [],
      })
    }
    map.get(a.id)!.obras.push({
      id: item.id,
      collectionId: item.collectionId,
      titulo: item.titulo ?? '',
      descricao: item.descricao ?? '',
      ano: item.ano ?? null,
      formato: item.formato ?? '',
      media: item.media ?? '',
      thumb: item.thumb ?? '',
      blockchain: item.blockchain ?? '',
      marketplace: item.marketplace ?? '',
      exposicaoTitulo: item.expand?.exposicao?.titulo ?? '',
      artistaNome: a.nome_artistico ?? '',
    })
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nome_artistico.localeCompare(b.nome_artistico, 'pt-BR', { sensitivity: 'base' })
  )
}

// ─── Thumb ─────────────────────────────────────────────────────────────────────

function Thumb({ obra, onClick }: { obra: Obra; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const src = thumbUrl(obra)
  const vid = isVideo(obra.media) && !obra.thumb

  return (
    <button className={s.thumbItem} onClick={onClick} title={obra.titulo}>
      <div className={s.thumbBg} />
      {src && !vid ? (
        <img
          src={src}
          alt={obra.titulo}
          loading="lazy"
          decoding="async"
          className={`${s.thumbImg} ${loaded ? s.thumbLoaded : ''}`}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className={s.thumbVideoIcon}>▶</div>
      )}
      <div className={s.thumbOverlay}>
        <span className={s.thumbTitle}>{obra.titulo}</span>
      </div>
    </button>
  )
}

// ─── Media ─────────────────────────────────────────────────────────────────────

function Media({ obra }: { obra: Obra }) {
  const [loaded, setLoaded] = useState(false)
  const idRef = useRef(obra.id)

  useEffect(() => {
    if (obra.id !== idRef.current) { setLoaded(false); idRef.current = obra.id }
  }, [obra.id])

  const vid  = isVideo(obra.media)
  const full = fullUrl(obra)
  const prev = thumbUrl(obra)

  return (
    <div className={`${s.frame} ${loaded ? s.frameLoaded : ''}`}>
      {prev && !vid && <img src={prev} alt="" aria-hidden className={s.frameBlur} />}
      {vid
        ? <video key={obra.id} src={full} autoPlay loop muted playsInline
            className={s.frameMedia} onCanPlay={() => setLoaded(true)} />
        : <img key={obra.id} src={full} alt={obra.titulo}
            className={s.frameMedia} onLoad={() => setLoaded(true)} />
      }
    </div>
  )
}

// ─── Home screen ───────────────────────────────────────────────────────────────

const HOME_ITEMS: Array<{ key: 'artistas' | CatType; label: string }> = [
  { key: 'artistas', label: 'Artistas' },
  { key: 'tipo',     label: 'Tipo de Obra' },
  { key: 'edicao',   label: 'Edição TKN' },
  { key: 'ano',      label: 'Ano de Criação' },
]

function HomeScreen({ idx, onChangeIdx, onSelect, artistCount, obraCount }: {
  idx: number
  onChangeIdx: (i: number) => void
  onSelect: (key: string) => void
  artistCount: number
  obraCount: number
}) {
  return (
    <div className={s.homeScreen}>
      <div className={s.homeInner}>
        <div className={s.homeLogo}>
          <span className={s.homeLogoWord}>TOKEN</span>
          <span className={s.homeLogoWord}>NATION</span>
          <span className={s.homeLogoYear}>2026</span>
        </div>
        <p className={s.homeStat}>{artistCount} artistas · {obraCount} obras</p>
        <nav className={s.homeMenu}>
          {HOME_ITEMS.map((item, i) => (
            <button
              key={item.key}
              className={`${s.homeMenuItem} ${i === idx ? s.homeMenuActive : ''}`}
              onClick={() => onSelect(item.key)}
              onMouseEnter={() => onChangeIdx(i)}
            >
              <span className={s.homeMenuLabel}>{item.label}</span>
              <span className={s.homeMenuArrow}>→</span>
            </button>
          ))}
        </nav>
        <p className={s.homeHint}><kbd>↑↓</kbd> navegar &nbsp; <kbd>→</kbd> entrar</p>
      </div>
    </div>
  )
}

// ─── CatList screen ────────────────────────────────────────────────────────────

const CAT_LABELS: Record<CatType, string> = {
  tipo:   'Tipo de Obra',
  edicao: 'Edição TKN',
  ano:    'Ano de Criação',
}

function CatListScreen({ catType, panels, idx, onChangeIdx, onSelect, onBack }: {
  catType: CatType
  panels: Panel[]
  idx: number
  onChangeIdx: (i: number) => void
  onSelect: (i: number) => void
  onBack: () => void
}) {
  return (
    <div className={s.catScreen}>
      <div className={s.catInner}>
        <div className={s.catHeader}>
          <button className={s.backBtn} onClick={onBack}>← início</button>
          <h2 className={s.catTitle}>{CAT_LABELS[catType]}</h2>
        </div>
        <ul className={s.catList}>
          {panels.map((p, i) => (
            <li key={p.id} className={s.catListItem}>
              <button
                className={`${s.catItem} ${i === idx ? s.catItemActive : ''}`}
                onClick={() => onSelect(i)}
                onMouseEnter={() => onChangeIdx(i)}
              >
                <span className={s.catItemName}>{p.name}</span>
                <span className={s.catItemSub}>{p.sub}</span>
                <span className={s.catItemArrow}>→</span>
              </button>
            </li>
          ))}
        </ul>
        <p className={s.catHint}><kbd>↑↓</kbd> navegar &nbsp; <kbd>→</kbd> ver obras &nbsp; <kbd>←</kbd> voltar</p>
      </div>
    </div>
  )
}

// ─── Panel screen (artists or category group) ──────────────────────────────────

function PanelScreen({ panels, idx, onChangeIdx, onSelectObra, onBack, backLabel }: {
  panels: Panel[]
  idx: number
  onChangeIdx: (i: number) => void
  onSelectObra: (obraIdx: number) => void
  onBack: () => void
  backLabel: string
}) {
  const panel = panels[idx]
  const thumbObras = panel.obras.slice(0, 4)
  const extra = panel.obras.length - 4
  const isSingle = thumbObras.length === 1
  const cols = isSingle ? '1fr' : '1fr 1fr'
  const rows = isSingle ? '1fr' : '1fr 1fr'

  return (
    <div className={s.artistScreen}>
      <div className={s.artistHeader}>
        <button className={s.backBtn} onClick={onBack}>← {backLabel}</button>
        <div className={s.artistNav}>
          <button className={s.navCircle} onClick={() => onChangeIdx(mod(idx - 1, panels.length))}>↑</button>
          <span className={s.navCount}>{idx + 1} / {panels.length}</span>
          <button className={s.navCircle} onClick={() => onChangeIdx(mod(idx + 1, panels.length))}>↓</button>
        </div>
      </div>

      <div className={s.artistLeft}>
        <div className={s.artistInfo} key={panel.id}>
          <h1 className={s.artistName}>{panel.name}</h1>
          {panel.sub && <p className={s.artistLoc}>{panel.sub}</p>}
          {panel.desc && <p className={s.artistBio}>{panel.desc}</p>}
        </div>
        <p className={s.artistHint}>
          <kbd>↑↓</kbd> navegar &nbsp; <kbd>→</kbd> ver obras
        </p>
      </div>

      <div className={s.artistRight}>
        <div className={s.thumbGrid} key={panel.id} style={{ gridTemplateColumns: cols, gridTemplateRows: rows }}>
          {thumbObras.map((obra, i) => (
            <Thumb key={obra.id} obra={obra} onClick={() => onSelectObra(i)} />
          ))}
          {extra > 0 && (
            <button className={s.thumbMore} onClick={() => onSelectObra(4)}>+{extra}</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Artwork screen ────────────────────────────────────────────────────────────

function ArtworkScreen({ obra, idx, total, onBack, onPrev, onNext, backLabel }: {
  obra: Obra
  idx: number
  total: number
  onBack: () => void
  onPrev: () => void
  onNext: () => void
  backLabel: string
}) {
  const desc = obra.descricao
    ? obra.descricao.length > 180 ? obra.descricao.slice(0, 177) + '…' : obra.descricao
    : ''
  const meta = [obra.ano, obra.formato].filter(Boolean).join(' · ')

  return (
    <div className={s.artworkScreen}>
      <button className={s.artworkBackBtn} onClick={onBack}>← {backLabel}</button>

      <div className={s.artworkStage}>
        <Media obra={obra} />
      </div>

      <div className={s.artworkBar}>
        <div className={s.artworkBarAccent} />
        <div className={s.artworkBarBody}>
          <div className={s.artworkBarLeft}>
            <p className={s.artworkArtistName}>{obra.artistaNome}</p>
            <p className={s.artworkTitle}>{obra.titulo}</p>
            {desc && <p className={s.artworkDesc}>{desc}</p>}
            {meta && <p className={s.artworkMeta}>{meta}</p>}
            {obra.marketplace && (
              <a href={obra.marketplace} target="_blank" rel="noreferrer" className={s.artworkLink}>
                Ver no marketplace →
              </a>
            )}
          </div>
          <div className={s.artworkBarRight}>
            <span className={s.artworkCounter}>{idx + 1} / {total}</span>
            <div className={s.artworkNavRow}>
              <button className={s.navCircle} onClick={onPrev} aria-label="Obra anterior">←</button>
              <button className={s.navCircle} onClick={onNext} aria-label="Próxima obra">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ViewerPage() {
  const [artistas, setArtistas]             = useState<Artista[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(false)
  const [mode, setMode]                     = useState<Mode>('home')
  const [homeIdx, setHomeIdx]               = useState(0)
  const [aIdx, setAIdx]                     = useState(0)
  const [catType, setCatType]               = useState<CatType>('tipo')
  const [groups, setGroups]                 = useState<Panel[]>([])
  const [gIdx, setGIdx]                     = useState(0)
  const [oIdx, setOIdx]                     = useState(0)
  const [artworkOrigin, setArtworkOrigin]   = useState<'artists' | 'panel'>('artists')

  useEffect(() => {
    loadData().then(setArtistas).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const panels: Panel[]  = artistas.map(artistaToPanel)
  const totalObras       = artistas.reduce((acc, a) => acc + a.obras.length, 0)

  const currentPanel: Panel | undefined =
    mode === 'artists'                                ? panels[aIdx] :
    mode === 'panel'                                  ? groups[gIdx] :
    mode === 'artwork' && artworkOrigin === 'artists' ? panels[aIdx] :
    mode === 'artwork' && artworkOrigin === 'panel'   ? groups[gIdx] :
    undefined

  const enterHome = useCallback((key: string) => {
    if (key === 'artistas') {
      setAIdx(0); setOIdx(0); setMode('artists')
    } else {
      const ct = key as CatType
      setCatType(ct)
      setGroups(buildGroups(artistas, ct))
      setGIdx(0)
      setMode('catList')
    }
  }, [artistas])

  const selectObra = useCallback((obraIdx: number) => {
    setArtworkOrigin(mode === 'artists' ? 'artists' : 'panel')
    setOIdx(obraIdx)
    setMode('artwork')
  }, [mode])

  const changeArtist = useCallback((i: number) => { setAIdx(i); setOIdx(0) }, [])
  const changeGroup  = useCallback((i: number) => { setGIdx(i); setOIdx(0) }, [])

  const goPrev = useCallback(() => {
    setOIdx(i => mod(i - 1, currentPanel?.obras.length ?? 1))
  }, [currentPanel])

  const goNext = useCallback(() => {
    setOIdx(i => mod(i + 1, currentPanel?.obras.length ?? 1))
  }, [currentPanel])

  const onKey = useCallback((e: KeyboardEvent) => {
    if (mode === 'home') {
      if      (e.key === 'ArrowUp')    setHomeIdx(i => mod(i - 1, HOME_ITEMS.length))
      else if (e.key === 'ArrowDown')  setHomeIdx(i => mod(i + 1, HOME_ITEMS.length))
      else if (e.key === 'ArrowRight') enterHome(HOME_ITEMS[homeIdx].key)
    } else if (mode === 'artists') {
      if      (e.key === 'ArrowUp')    changeArtist(mod(aIdx - 1, panels.length))
      else if (e.key === 'ArrowDown')  changeArtist(mod(aIdx + 1, panels.length))
      else if (e.key === 'ArrowRight') selectObra(0)
      else if (e.key === 'ArrowLeft')  setMode('home')
    } else if (mode === 'catList') {
      if (!groups.length) return
      if      (e.key === 'ArrowUp')    setGIdx(i => mod(i - 1, groups.length))
      else if (e.key === 'ArrowDown')  setGIdx(i => mod(i + 1, groups.length))
      else if (e.key === 'ArrowRight') { setOIdx(0); setMode('panel') }
      else if (e.key === 'ArrowLeft')  setMode('home')
    } else if (mode === 'panel') {
      if (!groups.length) return
      if      (e.key === 'ArrowUp')    changeGroup(mod(gIdx - 1, groups.length))
      else if (e.key === 'ArrowDown')  changeGroup(mod(gIdx + 1, groups.length))
      else if (e.key === 'ArrowRight') selectObra(0)
      else if (e.key === 'ArrowLeft')  setMode('catList')
    } else if (mode === 'artwork') {
      if      (e.key === 'ArrowLeft')  goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowUp')    setMode(artworkOrigin)
    }
  }, [mode, homeIdx, aIdx, panels, gIdx, groups, artworkOrigin,
      enterHome, changeArtist, changeGroup, selectObra, goPrev, goNext])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const obra = currentPanel?.obras[oIdx]

  return (
    <div className={s.root}>
      {loading && (
        <div className={s.centered}>
          <span className={s.spinner} />
          Carregando acervo…
        </div>
      )}
      {error && !loading && (
        <div className={s.centered}>Erro ao carregar. Tente novamente.</div>
      )}
      {!loading && !error && artistas.length === 0 && (
        <div className={s.centered}>Nenhum artista encontrado.</div>
      )}

      {!loading && !error && artistas.length > 0 && mode === 'home' && (
        <HomeScreen
          idx={homeIdx}
          onChangeIdx={setHomeIdx}
          onSelect={enterHome}
          artistCount={artistas.length}
          obraCount={totalObras}
        />
      )}

      {!loading && !error && artistas.length > 0 && mode === 'artists' && (
        <PanelScreen
          panels={panels}
          idx={aIdx}
          onChangeIdx={changeArtist}
          onSelectObra={selectObra}
          onBack={() => setMode('home')}
          backLabel="início"
        />
      )}

      {!loading && !error && artistas.length > 0 && mode === 'catList' && (
        <CatListScreen
          catType={catType}
          panels={groups}
          idx={gIdx}
          onChangeIdx={setGIdx}
          onSelect={(i) => { setGIdx(i); setOIdx(0); setMode('panel') }}
          onBack={() => setMode('home')}
        />
      )}

      {!loading && !error && artistas.length > 0 && mode === 'panel' && groups[gIdx] && (
        <PanelScreen
          panels={groups}
          idx={gIdx}
          onChangeIdx={changeGroup}
          onSelectObra={selectObra}
          onBack={() => setMode('catList')}
          backLabel={CAT_LABELS[catType]}
        />
      )}

      {!loading && !error && mode === 'artwork' && obra && (
        <ArtworkScreen
          obra={obra}
          idx={oIdx}
          total={currentPanel?.obras.length ?? 1}
          onBack={() => setMode(artworkOrigin)}
          onPrev={goPrev}
          onNext={goNext}
          backLabel={artworkOrigin === 'artists' ? 'artistas' : CAT_LABELS[catType]}
        />
      )}
    </div>
  )
}
