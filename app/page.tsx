import Link from 'next/link'

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <div className="hero">
      <div className="hero-grid-bg" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="hero-grid-line-v" style={{ left: `${(i / 11) * 100}%`, animationDelay: `${i * 0.18}s` }} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="hero-grid-line-h" style={{ top: `${(i / 6) * 100}%`, animationDelay: `${i * 0.22}s` }} />
        ))}
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />
      </div>
      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          4ª Edição · Exposição de Arte Digital · NFT Brasil
        </div>
        <h1 className="hero-title">
          Estado de<br /><em>Transição</em>
        </h1>
        <p className="hero-sub">Pavilhão da Bienal, São Paulo</p>
      </div>
    </div>
  )
}

// ─── Galeria de fotos ──────────────────────────────────────────────────────────

function PhotoGallery({ photos }: { photos: string[] }) {
  return (
    <div className="edicao-gallery">
      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <div key={i} className="edicao-gallery-item">
          <img src={src} alt="" className="edicao-gallery-img" />
        </div>
      ))}
    </div>
  )
}

// ─── Seção de edição ───────────────────────────────────────────────────────────

interface EdicaoProps {
  id: string
  ano: string
  tema: string
  subtema?: string
  texto: string
  photos?: string[]
  ctaHref?: string
  ctaLabel?: string
}

function Edicao({ id, ano, tema, subtema, texto, photos, ctaHref, ctaLabel }: EdicaoProps) {
  return (
    <section className="edicao" id={id}>
      <div className="edicao-intro">
        <div className="edicao-ano-tag">{ano}</div>
        <h2 className="edicao-tema">{tema}</h2>
        {subtema && <div className="edicao-subtema">{subtema}</div>}
        <p className="edicao-texto">{texto}</p>
        {ctaHref && (
          <div className="edicao-cta-wrap">
            <Link href={ctaHref} className="edicao-cta-btn">
              {ctaLabel ?? `Ver exposição ${ano} →`}
            </Link>
          </div>
        )}
      </div>
      {photos && photos.length > 0 && <PhotoGallery photos={photos} />}
    </section>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <header className="header">
        <div className="header-logo"><span>Token</span>Nation</div>
        <div className="header-right">
          <a href="/viewer" className="header-viewer-btn">Explorar acervo →</a>
        </div>
      </header>

      <Hero />

      <nav className="edicoes-nav">
        <a href="#2026" className="edicao-nav-item">2026</a>
        <a href="#2025" className="edicao-nav-item">2025</a>
        <a href="#2024" className="edicao-nav-item">2024</a>
        <a href="#2023" className="edicao-nav-item">2023</a>
      </nav>

      <Edicao
        id="2026"
        ano="2026"
        tema="Estado de Transição"
        subtema="Entre códigos, ética, processos e conexões"
        texto="Houve um tempo em que a mudança tinha começo, meio e fim. Hoje, ela não termina. Não transitamos mais entre momentos — habitamos a própria transição. O que está em jogo não é apenas inovação; é a forma como nos posicionamos dentro de sistemas que continuam se reconfigurando enquanto os utilizamos."
      />

      <Edicao
        id="2025"
        ano="2025"
        tema="Topografia da Desobediência"
        subtema="TokenNation 2025 · Pavilhão da Bienal, São Paulo"
        texto="A arte sempre se fez nas fronteiras movediças do possível. Propomos a arte como corpo irrestrito — a blockchain uma língua franca para artistas que sabem que valor tem um acordo coletivo. Não se trata de substituir um sistema por outro, mas de criar as condições para que novas formas de produção e distribuição possam emergir. Sendo mais nítido para o Sul Global, este movimento transcende a estética ou a individualidade: é ato político de descolonização."
        photos={[
          '/ambientes/2025/a1.jpg',
          '/ambientes/2025/a2.jpg',
          '/ambientes/2025/a3.jpg',
        ]}
      />

      <Edicao
        id="2024"
        ano="2024"
        tema="Além da Linha e do Tempo"
        subtema="Explorando Multiversos Artísticos · NFT Brasil 2024 · Pavilhão da Bienal, São Paulo"
        texto="Uma jornada transcultural e transdimensional através da evolução da arte, desde suas diversas raízes primordiais até os horizontes infinitos da arte digital. Partindo da concepção de uma timeline descentralizada, onde cada ecossistema representa um universo artístico único — esta exposição convida os visitantes a explorarem os múltiplos caminhos da criatividade humana e as interconexões entre passado, presente e futuro."
        photos={[
          '/ambientes/2024/b1.jpg',
          '/ambientes/2024/b2.jpg',
          '/ambientes/2024/b3.jpg',
        ]}
      />

      <Edicao
        id="2023"
        ano="2023"
        tema="NFT Brasil 2023"
        subtema="Primeira Exposição de Arte Digital · Pavilhão da Bienal, São Paulo"
        texto="O início do movimento. Em 2023, o NFT Brasil reuniu cerca de 20 mil pessoas no Pavilhão da Bienal, realizando a primeira Exposição de Arte Digital da América Latina — com mais de 100 artistas e 500 obras neste icônico local da arte brasileira."
      />
    </>
  )
}
