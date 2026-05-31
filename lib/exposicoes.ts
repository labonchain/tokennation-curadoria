export interface Instalacao {
  nome: string
  descricao: string
  fotos: string[]
  driveUrl?: string
}

export interface ExposicaoData {
  ano: number
  titulo: string
  subtitulo: string
  descricao: string
  local: string
  data: string
  coverPhotoId?: string
  driveUrl?: string
  instalacoes: Instalacao[]
}

const BASE = 'https://drive.google.com/thumbnail?id='
const SZ = '&sz=w1200'

export function photoUrl(id: string, sz = 'w1200') {
  return `https://drive.google.com/thumbnail?id=${id}&sz=${sz}`
}

export const exposicoes: Record<string, ExposicaoData> = {
  '2023': {
    ano: 2023,
    titulo: 'NFT Brasil 2023',
    subtitulo: 'Arte Digital na Vanguarda',
    descricao:
      'A primeira grande exposição de arte digital tokenizada do Brasil. Realizada em São Paulo, reuniu artistas pioneiros do movimento NFT nacional em uma imersão que mesclou tecnologia, arte e cultura brasileira. O evento explorou as possibilidades da arte na blockchain e o impacto da tokenização na cadeia criativa.',
    local: 'Blue Note São Paulo',
    data: 'Setembro 2023',
    instalacoes: [],
  },

  '2024': {
    ano: 2024,
    titulo: 'NFT Brasil 2024',
    subtitulo: 'Convergências',
    descricao:
      'Convergências explorou os pontos de encontro entre arte, tecnologia e humanidade. Nove instalações únicas convidaram o público a uma jornada sensorial pelo universo da arte digital — da imersão sonora à arqueologia do pixel, das tradições ancestrais criptografadas às crianças explorando o metaverso. Uma experiência que demonstrou como arte e blockchain podem convergir para criar novas formas de expressão e conexão.',
    local: 'São Paulo',
    data: 'Setembro 2024',
    coverPhotoId: '1KypKaoyFWt6sGatn8uSaeu1nVezL6YMa',
    driveUrl: 'https://drive.google.com/drive/folders/1-inWvhx3tYyjFRgcqaATaDupQlejUTQv',
    instalacoes: [
      {
        nome: 'Sala Imersiva',
        descricao: 'Ambiente de total imersão audiovisual onde obras digitais ganham dimensão física através de projeções em escala arquitetônica.',
        fotos: [
          '1KypKaoyFWt6sGatn8uSaeu1nVezL6YMa',
          '1UtPuNR86lHX7Jdv03Ap4RqaWNIJ2VH-r',
          '1v__YhTAfFf3rZh_JN2D34mBJ2_r3Y_zT',
          '1bpdeOs9dYALn_tMOsfbNAaqqIS2w2zjD',
          '1Z65hdYjrBffUktS3opGVK2XriVgGmvAk',
          '1L01KIwB1CKHdekiZg5yQVeCENCrOvkDL',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1Ors44cKQYBO5ui_7Z8vD_mpvNEg6tM-j',
      },
      {
        nome: 'Tradições Criptografadas',
        descricao: 'Encontro entre o folclore brasileiro e a tecnologia blockchain — onde mitos, lendas e tradições são preservados em código imutável.',
        fotos: [
          '1MhmAkaNPokhdwOEjxSQciDg77dpkUN_S',
          '1yEkEWh31ujvM_z61-7rZw4lPm4sE0HEI',
          '1dYY4s4BOQmPncwHunzKjHjAEEHzyMeNJ',
          '1L_6y75cvJSuajZU2V0e3YIqbGgztx4VX',
          '1D2FwF-WgaKwgdXMj2cMLISpJkiyPqBqp',
          '10DL9GkEExZ6RlaYlDgCTDZ8rhjrJSa5-',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1uAuFvN1Zf8amDdyZ4YvfNPpvumsuNDh0',
      },
      {
        nome: 'Aqui e Agora',
        descricao: 'Obras que capturam a efemeridade do presente, transformando o momento atual em registro eterno na blockchain.',
        fotos: [
          '1QUviRVWrDmNJsRqIxbPTEf_L1PxuN5ys',
          '1OaKQMOo8yT3nHbt7rBPv16aH6hZrm8KU',
          '1VQdxqF4lm-yROCMCsEHSkzlqWyNunfLF',
          '1W6c05uxbGvOfxxWMseONJa-eqs3rrZHC',
          '1WWCQzFNN4kMBVYfCfg8GjFr3YzG51Zz-',
          '1d9nMXsi22xXFMNXeEVBNMjqL0sRd14P1',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/13TJG5TdlRudzQFZ_LOM3MNGgtxkcM_lp',
      },
      {
        nome: 'Dimensões Convergentes',
        descricao: 'Espaço onde realidade física e digital se fundem em experiências multidimensionais que desafiam a percepção.',
        fotos: [
          '19Ge2CpQGmUpHW-EU_11pbO5TzQSzmRK4',
          '1tpzo05E_qVBDDRrRDJvFWpkp94cHI88s',
          '13fiuQMJSizUhACZ7i_nVoxPQm9VP2GHY',
          '1usPqp7FVSavMYQKKUrv3TIINlx02Jjpv',
          '1jyLS0NWWx0gibOwrX6FZ8E5v82eNMtIt',
          '1WnMLXQ7NiM7LCKnT6jBHh3JmYyARUdB6',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1BNPZe_fxRjTlRMxAmdyzsYCudC16dqEn',
      },
      {
        nome: 'Computadores Fazem Arte',
        descricao: 'Uma homenagem à arte generativa e à criatividade algorítmica — onde código se transforma em poesia visual.',
        fotos: [
          '1V6S8F6ORYAPUrtiin-Ci4rgxKbAHxund',
          '1fprnrc5Tv97bIJvPloDWmf7SLJEDRDx3',
          '1jQ-rsAZ7KrrPLdYgWEZF0Czcv_UbSTQq',
          '1dnxwN3tfT6dl45gOArLnD4EiVLzoWagx',
          '1orWM-lS8_NlltRwtspUNg8C4l4oidlow',
          '1DT4di-VyOHMH188C_Yei6gAUaZCfncJ7',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1tu_jhrs7rR-X338DEtBdG3zUa9eBxaK9',
      },
      {
        nome: 'Eterno Efêmero',
        descricao: 'Reflexão sobre a permanência e o transitório — obras que existem apenas como tokens, eternamente digitais e fisicamente impalpáveis.',
        fotos: [
          '1zxgdxkuD8ubF4Mmx1ErN-woGHmktQTvN',
          '11UDuAYlvPOJeoAiSZybn98XnZqSCuMPZ',
          '1pDPUQ7ZQ8LvKg1cArwo85nDest6caX4s',
          '1TKhPcB7vj3yd23YAy8gYo1LfyiE-NW0Y',
          '1BREwfqwStQEcn6A71__cenjEmhEj8q52',
          '1qk9Dt88-rU3fDwEMI2xOjhdSDMbrHZYT',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1KWr4louzkIF4d0a9RcL_bX2tuHwEfa1U',
      },
      {
        nome: 'Linha do Tempo',
        descricao: 'Uma arqueologia do movimento NFT brasileiro — da gênese até hoje, rastreando a evolução de uma cena que mudou a arte nacional.',
        fotos: [
          '1y0dvrpx4DmhnAO7pInoCn-QTMNoImB8v',
          '170wrsUSmFVWgmeqlglCxDLtM3CNBXbUO',
          '1yQDsj8l-v5S0O2lQhtK_kVvQhfUu92HV',
          '1uZ7DBWO7JHiWYzgSM3uNVhHxEmGF3NLC',
          '1hJBlpdzhOaXbx_I8U_kbEsIEU3HJ0mc2',
          '1Q_E7RdcoZLAXdBG_crnUy5uj9VZCNbfV',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1vfnZG7viHW3iMuxtkVMJe0cC4Iironxw',
      },
      {
        nome: 'Cebola',
        descricao: 'Instalação interativa que desvenda camadas e camadas de significado — como a arte digital revela novas dimensões a cada interação.',
        fotos: [
          '1eN0ATz-I0IPQ_c15ycEysGbY9tPDBgry',
          '18C64ympoo-6QsuqV1bzY6w4VJPKJPeS0',
          '1V_FXGr-zSlhZVMx9veuLrrQLMmuvnpPA',
          '1bQ6svgyQLNxWYo_8etP02cTywpdUzo2o',
          '1EKKgChYxZyNYw1HgJsHiG0QQihnnlzR4',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1D6v3QsB-W59DnWABERIYJd3jpsWW6Glv',
      },
      {
        nome: 'Crianças Nouns',
        descricao: 'Uma janela para o futuro — crianças explorando os Nouns e o mundo dos NFTs, reprogramando conceitos de arte e propriedade digital.',
        fotos: [
          '1pwxW3oWCKNp9Y9qfiegyHasosYE0sb1K',
          '1BNejDIxoG9uvho-Jpql1R_YC7PLu43Up',
          '1VM88ZdCdFNlOEe_IljjmkTNPko5N0hXM',
          '1YAANem5Jes8e8U2aYPMFAnYl72nJDn-x',
          '1wpAiUuxyT6Rh2HZwDHUolOlK66YtbeUD',
          '1QF5LXp1wVh01by75rg6W6r8qtQTjDJIe',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1MmXfexeKJVxuu6HIAFe8RCz5j_EJfcf8',
      },
    ],
  },

  '2025': {
    ano: 2025,
    titulo: 'NFT Brasil 2025',
    subtitulo: 'Área Experience',
    descricao:
      'A edição 2025 levou a arte digital a um nível de imersão sem precedentes. Oito instalações formaram a Área Experience — um território onde passado, presente e futuro coexistem. Do portal de entrada que prepara os sentidos ao cubo imersivo que dissolve as fronteiras do espaço, cada ambiente foi concebido como uma obra em si mesma. Uma celebração da arte brasileira na era da blockchain.',
    local: 'São Paulo',
    data: 'Junho 2025',
    coverPhotoId: '1P7vUg8j7zo2K7dM5bDUnhwLSdnvFiIlm',
    driveUrl: 'https://drive.google.com/drive/folders/1-inWvhx3tYyjFRgcqaATaDupQlejUTQv',
    instalacoes: [
      {
        nome: 'O Ontem Que Nunca Acabou',
        descricao: 'Uma viagem ao passado que permanece vivo no presente — obras que revisitam memórias coletivas e as ressignificam no contexto da arte digital.',
        fotos: [
          '134luK1DRAW7n7BUt4i0xzq-sQdmTdQp2',
          '1YtqdJ2cFmTVdeWfs2tdd_uT5zkOMFzlH',
          '1P7vUg8j7zo2K7dM5bDUnhwLSdnvFiIlm',
          '1o2J8FBl0zm9kupukzTm5D4K0RoOElC-H',
          '1hCOBlMgk79-Mhlx7naDQGHr4Ub3vG_O5',
          '1MS3KSqkxt0Q_rH9DHn9txU8DXCI23xL7',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1ZT-FVufNcz47d5WA8QFII0Bwb7tbd3CU',
      },
      {
        nome: 'Cubo Imersivo',
        descricao: 'Arquitetura de luz e dados — um cubo de seis faces transformado em tela viva onde a arte digital transcende a dimensão da tela.',
        fotos: [
          '1p6zApdKu9WhL9mejoQkRDmQh7KBg9u5k',
          '1hlgYJrAcg-xez9wil67I4kPoxhd_8VZA',
          '1Ne7kM5KZ-UqzGqlrFsMetMfR9T4Ts2yH',
          '1CI_HtigtdZjIkjKlDpRKD9iTn-GEcN4n',
          '1wWNi6P6l0hog3DbGsax3OYtjCMUKXEAR',
          '186KvG6KN5CPupyPHQkJSMiMYqQb5-80j',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1ssLUb2gDYAmOESjMlol0yFcaOlexEkFw',
      },
      {
        nome: 'Códigos Abertos da América Latina',
        descricao: 'Uma declaração política e estética — arte criada com tecnologias abertas, celebrando a colaboração e a soberania criativa latino-americana.',
        fotos: [
          '1qRE39-ZenR_2NFF4hamIlOo9qrfWFnFY',
          '1x0V_-9uyYNtVAu22o_0hCpTOT0m8yz-d',
          '1xYvy-4fdKE-cTaMIilkn80D7BkYzasA4',
          '197YjECbnRLt7Q-cmvHpdZwIazIetJ55W',
          '13V2gxlb0qiAop66BlL1G4Hy11vwKopqq',
          '1ON697p0b1bANYJiZBDH31mxPfYZhuO9y',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1F3Xq7600W0u6OI3hljLONsnsNi05_S63',
      },
      {
        nome: 'Memorial Vamoss',
        descricao: 'Uma homenagem ao coletivo que abriu caminhos — registro vivo de uma comunidade que escolheu a arte como forma de existência.',
        fotos: [
          '1kNuHyZUw0OmJsmayr9WGcZm0SSe-m5Lc',
          '11uGQAe0BczrHItWnP2AQK3jZ0gSDnZQl',
          '1M7Q29QPPVYc7wTt_kED9g8p-8OOOldaB',
          '1P0ugvJhhqNATxSsXqH7ZgjU0n5GE28SE',
          '1_-DK4baM0RQSs9cbbnB9p_zGWx6PIN1g',
          '1ARm-o7tx5yhVUh5uoM5MfnrCBtGA1Mnl',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1EuEtlJC0CQBf3E-AueueAvr4PHd2_iFe',
      },
      {
        nome: 'Físico Digital',
        descricao: 'O ponto de colapso entre o tangível e o intangível — obras que existem simultaneamente como objeto e como token, desafiando a ontologia da arte.',
        fotos: [
          '1Z68BKw8OTpYgkrFflPpE-AUZpl8AHQZD',
          '1CE9R1C7P2UWt8Ud1GKFSPobFkzX4AVlu',
          '19mGDc4JrXWKY2Xh67Pd5jSF5MQ0HpI68',
          '1x3wIIGSy9WTQzF8RFYZZ1OHbmBVipI2J',
          '1eBVZtLw9d4JQEEO2ICzGWJlH2SJDP3xP',
          '14BOIEZKBZs0g96BVq526h_DJ6Xi9aDwi',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1X2122nEwN1sdLmaGdRaE8_-KJy994KVJ',
      },
      {
        nome: 'Portal de Entrada à Imensidão',
        descricao: 'A transição ritual de um mundo para outro — um portal que prepara corpo e mente para a experiência da arte digital em sua plenitude.',
        fotos: [
          '1sZ6CwdiYzz7YLWZMHXv0sPXL6baeKSzk',
          '1Bn2NZ1zW8RX-pKuVfd-YPbI9sqeBtlne',
          '18GUyKXIZ06WNlhx-UIAMgaCsmInqY1Pd',
          '1Vp-BiTcyUHdAneEslJWAhHzGq1Q9I8wL',
          '1iAApiT5ivcnqa0RqPfAM_rTefFGd7vb8',
          '1o5vZIeslFJjEf5QjYt5znoMC8kGFMXhe',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1qbYqoWh3j8D2DQUWSUPj_F-AJP_e8rMz',
      },
      {
        nome: 'Escola Metaverso SP',
        descricao: 'Educação e arte se fundem neste espaço dedicado ao aprendizado — onde o metaverso é território de descoberta para todas as idades.',
        fotos: [
          '15eQA6tH5D2X_0U49VCnyaHOsrjobzR0s',
          '1yVnhpD5K1v_4VRkncUsWNJM_kRzWftnh',
          '18MEkDJFLCz3VAJx8v03lwzPshZ3uGSiH',
          '1eH2ZXvlDL6X0Pok34ANLcChMREXcLAEP',
          '1YhdDuoRShhG-KWCR4SBBobyQaQSUisEG',
          '1AhsbXV-ug0EISjygsSv01mRmFEfuY_wr',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/1SaJU4lg2QscJaCP2wTqv9PdgMCoLsmdA',
      },
      {
        nome: 'Cripto Arqueologia do Amanhã',
        descricao: 'Uma speculative fiction em forma de instalação — como os arqueólogos do futuro interpretarão os artefatos digitais que criamos hoje?',
        fotos: [
          '1d4UFK0y21OfLu-gwAi0LCdzZjjO2TeWH',
          '1svaNlaSbKgohsYLfS-fY8Y7dpKAjB-0q',
          '1Kz-sQPqPF_WMxe8NovN4TK-UewD6Krd5',
          '1ZZIkLEXfVFPwrKyPAxEUm5rVZegRmCoF',
          '1-aW58dmWMm52tyri5FNyaOXcIG6GELZG',
          '1oWBC4xrMY_lV09pGJpAwXEbRaWhQZWew',
        ],
        driveUrl: 'https://drive.google.com/drive/folders/17t2Jd3apLjKEmPnjd7-Fr7TAzPYdcp7l',
      },
    ],
  },
}
