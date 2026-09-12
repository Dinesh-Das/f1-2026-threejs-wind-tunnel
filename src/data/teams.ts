export type Driver = {
  id: string
  name: string
  shortName: string
  number: number
  nationality: string
  portrait?: string
  helmetModel?: string
}

export type Team = {
  id: string
  name: string
  shortName: string
  constructor: string
  powerUnit: string
  primaryColor: string
  secondaryColor: string
  logo: string
  livery: {
    body: string
    sidepod: string
    engineCover: string
    wing: string
    accent: string
    accent2: string
    halo: string
    finish: 'gloss' | 'satin' | 'metallic'
  }
  drivers: Driver[]
}

const drivers = (items: Array<[string, string, string, number, string]>): Driver[] =>
  items.map(([id, name, shortName, number, nationality]) => ({ id, name, shortName, number, nationality }))

export const teams: Team[] = [
  {
    id: 'mclaren',
    name: 'McLaren Mercedes',
    shortName: 'McLaren',
    constructor: 'McLaren',
    powerUnit: 'Mercedes',
    primaryColor: '#ff8000',
    secondaryColor: '#111317',
    logo: '/assets/teams/mclaren/logo.webp',
    livery: {
      body: '#ff8000',
      sidepod: '#111317',
      engineCover: '#ff8000',
      wing: '#111317',
      accent: '#00c7b1',
      accent2: '#f4f4f4',
      halo: '#111317',
      finish: 'gloss',
    },
    drivers: drivers([
      ['norris', 'Lando Norris', 'NOR', 1, 'United Kingdom'],
      ['piastri', 'Oscar Piastri', 'PIA', 81, 'Australia'],
    ]),
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    shortName: 'Mercedes',
    constructor: 'Mercedes',
    powerUnit: 'Mercedes',
    primaryColor: '#c7c9cb',
    secondaryColor: '#0a0b0d',
    logo: '/assets/teams/mercedes/logo.webp',
    livery: {
      body: '#c7c9cb',
      sidepod: '#0b0d0f',
      engineCover: '#0b0d0f',
      wing: '#0a0b0d',
      accent: '#00a19b',
      accent2: '#e7e8e8',
      halo: '#0a0b0d',
      finish: 'metallic',
    },
    drivers: drivers([
      ['russell', 'George Russell', 'RUS', 63, 'United Kingdom'],
      ['antonelli', 'Kimi Antonelli', 'ANT', 12, 'Italy'],
    ]),
  },
  {
    id: 'ferrari',
    name: 'Scuderia Ferrari',
    shortName: 'Ferrari',
    constructor: 'Ferrari',
    powerUnit: 'Ferrari',
    primaryColor: '#e80020',
    secondaryColor: '#f4f4f2',
    logo: '/assets/teams/ferrari/logo.webp',
    livery: {
      body: '#e80020',
      sidepod: '#e80020',
      engineCover: '#e80020',
      wing: '#171717',
      accent: '#ffd21e',
      accent2: '#f3f1ed',
      halo: '#e80020',
      finish: 'gloss',
    },
    drivers: drivers([
      ['leclerc', 'Charles Leclerc', 'LEC', 16, 'Monaco'],
      ['hamilton', 'Lewis Hamilton', 'HAM', 44, 'United Kingdom'],
    ]),
  },
  {
    id: 'redbull',
    name: 'Red Bull Racing Ford',
    shortName: 'Red Bull',
    constructor: 'Red Bull Racing',
    powerUnit: 'Ford',
    primaryColor: '#f2f2ef',
    secondaryColor: '#16305c',
    logo: '/assets/teams/redbull/logo.webp',
    livery: {
      body: '#f2f2ef',
      sidepod: '#f2f2ef',
      engineCover: '#f2f2ef',
      wing: '#13284d',
      accent: '#f6c900',
      accent2: '#e3272d',
      halo: '#f2f2ef',
      finish: 'gloss',
    },
    drivers: drivers([
      ['verstappen', 'Max Verstappen', 'VER', 3, 'Netherlands'],
      ['hadjar', 'Isack Hadjar', 'HAD', 6, 'France'],
    ]),
  },
  {
    id: 'racing-bulls',
    name: 'Racing Bulls Red Bull Ford',
    shortName: 'Racing Bulls',
    constructor: 'Racing Bulls',
    powerUnit: 'Ford',
    primaryColor: '#f5f6f3',
    secondaryColor: '#173fce',
    logo: '/assets/teams/racing-bulls/logo.webp',
    livery: {
      body: '#f5f6f3',
      sidepod: '#f5f6f3',
      engineCover: '#f5f6f3',
      wing: '#173fce',
      accent: '#173fce',
      accent2: '#d8232a',
      halo: '#173fce',
      finish: 'gloss',
    },
    drivers: drivers([
      ['lawson', 'Liam Lawson', 'LAW', 30, 'New Zealand'],
      ['lindblad', 'Arvid Lindblad', 'LIN', 41, 'United Kingdom'],
    ]),
  },
  {
    id: 'alpine',
    name: 'Alpine Mercedes',
    shortName: 'Alpine',
    constructor: 'Alpine',
    powerUnit: 'Mercedes',
    primaryColor: '#1688f8',
    secondaryColor: '#ff72b6',
    logo: '/assets/teams/alpine/logo.webp',
    livery: {
      body: '#1688f8',
      sidepod: '#ff72b6',
      engineCover: '#1688f8',
      wing: '#10161c',
      accent: '#ff72b6',
      accent2: '#f2f4f8',
      halo: '#10161c',
      finish: 'gloss',
    },
    drivers: drivers([
      ['gasly', 'Pierre Gasly', 'GAS', 10, 'France'],
      ['colapinto', 'Franco Colapinto', 'COL', 43, 'Argentina'],
    ]),
  },
  {
    id: 'haas',
    name: 'Haas Toyota F1 Team',
    shortName: 'Haas',
    constructor: 'Haas',
    powerUnit: 'Ferrari',
    primaryColor: '#f1f1ef',
    secondaryColor: '#171717',
    logo: '/assets/teams/haas/logo.webp',
    livery: {
      body: '#f1f1ef',
      sidepod: '#f1f1ef',
      engineCover: '#f1f1ef',
      wing: '#171717',
      accent: '#d71920',
      accent2: '#171717',
      halo: '#171717',
      finish: 'gloss',
    },
    drivers: drivers([
      ['ocon', 'Esteban Ocon', 'OCO', 31, 'France'],
      ['bearman', 'Oliver Bearman', 'BEA', 87, 'United Kingdom'],
    ]),
  },
  {
    id: 'audi',
    name: 'Audi',
    shortName: 'Audi',
    constructor: 'Audi',
    powerUnit: 'Audi',
    primaryColor: '#b5b8b2',
    secondaryColor: '#111214',
    logo: '/assets/teams/audi/logo.webp',
    livery: {
      body: '#b5b8b2',
      sidepod: '#111214',
      engineCover: '#111214',
      wing: '#111214',
      accent: '#f50537',
      accent2: '#b5b8b2',
      halo: '#111214',
      finish: 'metallic',
    },
    drivers: drivers([
      ['hulkenberg', 'Nico Hülkenberg', 'HUL', 27, 'Germany'],
      ['bortoleto', 'Gabriel Bortoleto', 'BOR', 5, 'Brazil'],
    ]),
  },
  {
    id: 'williams',
    name: 'Williams Mercedes',
    shortName: 'Williams',
    constructor: 'Williams',
    powerUnit: 'Mercedes',
    primaryColor: '#005aff',
    secondaryColor: '#f4f5f6',
    logo: '/assets/teams/williams/logo.webp',
    livery: {
      body: '#005aff',
      sidepod: '#f4f5f6',
      engineCover: '#101316',
      wing: '#f4f5f6',
      accent: '#e31b23',
      accent2: '#f4f5f6',
      halo: '#005aff',
      finish: 'gloss',
    },
    drivers: drivers([
      ['sainz', 'Carlos Sainz', 'SAI', 55, 'Spain'],
      ['albon', 'Alexander Albon', 'ALB', 23, 'Thailand'],
    ]),
  },
  {
    id: 'aston-martin',
    name: 'Aston Martin Honda',
    shortName: 'Aston Martin',
    constructor: 'Aston Martin',
    powerUnit: 'Honda',
    primaryColor: '#00665e',
    secondaryColor: '#c9df00',
    logo: '/assets/teams/aston-martin/logo.webp',
    livery: {
      body: '#00665e',
      sidepod: '#00665e',
      engineCover: '#00665e',
      wing: '#111315',
      accent: '#c9df00',
      accent2: '#f0f1ed',
      halo: '#00665e',
      finish: 'metallic',
    },
    drivers: drivers([
      ['alonso', 'Fernando Alonso', 'ALO', 14, 'Spain'],
      ['stroll', 'Lance Stroll', 'STR', 18, 'Canada'],
    ]),
  },
  {
    id: 'cadillac',
    name: 'Cadillac F1 Team',
    shortName: 'Cadillac',
    constructor: 'Cadillac',
    powerUnit: 'Ferrari',
    primaryColor: '#111214',
    secondaryColor: '#f2f2ef',
    logo: '/assets/teams/cadillac/logo.webp',
    livery: {
      body: '#111214',
      sidepod: '#f2f2ef',
      engineCover: '#111214',
      wing: '#111214',
      accent: '#c8c9c7',
      accent2: '#f2f2ef',
      halo: '#111214',
      finish: 'satin',
    },
    drivers: drivers([
      ['perez', 'Sergio Pérez', 'PER', 11, 'Mexico'],
      ['bottas', 'Valtteri Bottas', 'BOT', 77, 'Finland'],
    ]),
  },
]

export const reserveDrivers: Driver[] = drivers([['tsunoda', 'Yuki Tsunoda', 'TSU', 22, 'Japan']])

export const teamById = (id: string) => teams.find((team) => team.id === id) ?? teams[0]
