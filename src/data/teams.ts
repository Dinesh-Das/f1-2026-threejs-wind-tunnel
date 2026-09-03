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
  carModel: string
  drivers: Driver[]
  reference_based_approximation: boolean
  materials: {
    metallic: number
    roughness: number
    clearcoat: number
    clearcoatRoughness: number
  }
  meshMap: Record<string, string[]>
}

const meshMap = {
  frontWing: ['FRONT_WING', 'FW_MAIN', 'FW_FLAP_01'],
  nose: ['NOSE'],
  suspension: ['FRONT_SUSPENSION', 'REAR_SUSPENSION'],
  sidepods: ['SIDEPOD_L', 'SIDEPOD_R'],
  floor: ['FLOOR', 'FLOOR_MAIN'],
  diffuser: ['DIFFUSER'],
  rearWing: ['REAR_WING', 'RW_MAIN', 'RW_FLAP'],
  halo: ['HALO'],
  wheels: ['FRONT_LEFT_WHEEL', 'FRONT_RIGHT_WHEEL', 'REAR_LEFT_WHEEL', 'REAR_RIGHT_WHEEL'],
}

const drivers = (items: Array<[string, string, string, number, string]>): Driver[] =>
  items.map(([id, name, shortName, number, nationality]) => ({ id, name, shortName, number, nationality }))

export const teams: Team[] = [
  {
    id: 'mclaren', name: 'McLaren Mercedes', shortName: 'McLaren', constructor: 'McLaren', powerUnit: 'Mercedes',
    primaryColor: '#ff8700', secondaryColor: '#101820', logo: '/assets/teams/mclaren/logo.svg', carModel: '/assets/cars/mclaren/mclaren-2026.glb',
    drivers: drivers([['norris','Lando Norris','NOR',4,'United Kingdom'],['piastri','Oscar Piastri','PIA',81,'Australia']]),
    reference_based_approximation: true, materials: { metallic: .48, roughness: .2, clearcoat: 1, clearcoatRoughness: .12 }, meshMap,
  },
  {
    id: 'mercedes', name: 'Mercedes', shortName: 'Mercedes', constructor: 'Mercedes', powerUnit: 'Mercedes',
    primaryColor: '#00a19c', secondaryColor: '#c8c8c8', logo: '/assets/teams/mercedes/logo.svg', carModel: '/assets/cars/mercedes/mercedes-2026.glb',
    drivers: drivers([['russell','George Russell','RUS',63,'United Kingdom'],['antonelli','Kimi Antonelli','ANT',12,'Italy']]),
    reference_based_approximation: true, materials: { metallic: .78, roughness: .18, clearcoat: .9, clearcoatRoughness: .1 }, meshMap,
  },
  {
    id: 'ferrari', name: 'Scuderia Ferrari', shortName: 'Ferrari', constructor: 'Ferrari', powerUnit: 'Ferrari',
    primaryColor: '#e10600', secondaryColor: '#ffd400', logo: '/assets/teams/ferrari/logo.svg', carModel: '/assets/cars/ferrari/ferrari-2026.glb',
    drivers: drivers([['leclerc','Charles Leclerc','LEC',16,'Monaco'],['hamilton','Lewis Hamilton','HAM',44,'United Kingdom']]),
    reference_based_approximation: true, materials: { metallic: .52, roughness: .16, clearcoat: 1, clearcoatRoughness: .08 }, meshMap,
  },
  {
    id: 'redbull', name: 'Red Bull Racing Ford', shortName: 'Red Bull', constructor: 'Red Bull Racing', powerUnit: 'Ford',
    primaryColor: '#2446ff', secondaryColor: '#ff1e1e', logo: '/assets/teams/redbull/logo.svg', carModel: '/assets/cars/redbull/redbull-2026.glb',
    drivers: drivers([['verstappen','Max Verstappen','VER',3,'Netherlands'],['hadjar','Isack Hadjar','HAD',6,'France']]),
    reference_based_approximation: true, materials: { metallic: .45, roughness: .26, clearcoat: .82, clearcoatRoughness: .16 }, meshMap,
  },
  {
    id: 'racing-bulls', name: 'Racing Bulls Red Bull Ford', shortName: 'Racing Bulls', constructor: 'Racing Bulls', powerUnit: 'Ford',
    primaryColor: '#f5f7ff', secondaryColor: '#2354ff', logo: '/assets/teams/racing-bulls/logo.svg', carModel: '/assets/cars/racing-bulls/racing-bulls-2026.glb',
    drivers: drivers([['lawson','Liam Lawson','LAW',30,'New Zealand'],['lindblad','Arvid Lindblad','LIN',41,'United Kingdom']]),
    reference_based_approximation: true, materials: { metallic: .42, roughness: .22, clearcoat: .9, clearcoatRoughness: .14 }, meshMap,
  },
  {
    id: 'alpine', name: 'Alpine Mercedes', shortName: 'Alpine', constructor: 'Alpine', powerUnit: 'Mercedes',
    primaryColor: '#ff87bc', secondaryColor: '#1688f8', logo: '/assets/teams/alpine/logo.svg', carModel: '/assets/cars/alpine/alpine-2026.glb',
    drivers: drivers([['gasly','Pierre Gasly','GAS',10,'France'],['colapinto','Franco Colapinto','COL',43,'Argentina']]),
    reference_based_approximation: true, materials: { metallic: .5, roughness: .2, clearcoat: 1, clearcoatRoughness: .12 }, meshMap,
  },
  {
    id: 'haas', name: 'Haas Toyota F1 Team', shortName: 'Haas', constructor: 'Haas', powerUnit: 'Ferrari',
    primaryColor: '#e8e8e8', secondaryColor: '#d71920', logo: '/assets/teams/haas/logo.svg', carModel: '/assets/cars/haas/haas-2026.glb',
    drivers: drivers([['ocon','Esteban Ocon','OCO',31,'France'],['bearman','Oliver Bearman','BEA',87,'United Kingdom']]),
    reference_based_approximation: true, materials: { metallic: .48, roughness: .24, clearcoat: .86, clearcoatRoughness: .14 }, meshMap,
  },
  {
    id: 'audi', name: 'Audi', shortName: 'Audi', constructor: 'Audi', powerUnit: 'Audi',
    primaryColor: '#e5001c', secondaryColor: '#b5b8b2', logo: '/assets/teams/audi/logo.svg', carModel: '/assets/cars/audi/audi-2026.glb',
    drivers: drivers([['hulkenberg','Nico Hülkenberg','HUL',27,'Germany'],['bortoleto','Gabriel Bortoleto','BOR',5,'Brazil']]),
    reference_based_approximation: true, materials: { metallic: .72, roughness: .2, clearcoat: .92, clearcoatRoughness: .12 }, meshMap,
  },
  {
    id: 'williams', name: 'Williams Mercedes', shortName: 'Williams', constructor: 'Williams', powerUnit: 'Mercedes',
    primaryColor: '#005aff', secondaryColor: '#00a3e0', logo: '/assets/teams/williams/logo.svg', carModel: '/assets/cars/williams/williams-2026.glb',
    drivers: drivers([['sainz','Carlos Sainz','SAI',55,'Spain'],['albon','Alexander Albon','ALB',23,'Thailand']]),
    reference_based_approximation: true, materials: { metallic: .5, roughness: .2, clearcoat: .9, clearcoatRoughness: .13 }, meshMap,
  },
  {
    id: 'aston-martin', name: 'Aston Martin Honda', shortName: 'Aston Martin', constructor: 'Aston Martin', powerUnit: 'Honda',
    primaryColor: '#006f62', secondaryColor: '#cedc00', logo: '/assets/teams/aston-martin/logo.svg', carModel: '/assets/cars/aston-martin/aston-martin-2026.glb',
    drivers: drivers([['alonso','Fernando Alonso','ALO',14,'Spain'],['stroll','Lance Stroll','STR',18,'Canada']]),
    reference_based_approximation: true, materials: { metallic: .54, roughness: .18, clearcoat: 1, clearcoatRoughness: .1 }, meshMap,
  },
  {
    id: 'cadillac', name: 'Cadillac F1 Team', shortName: 'Cadillac', constructor: 'Cadillac', powerUnit: 'Ferrari',
    primaryColor: '#e5e5e5', secondaryColor: '#111111', logo: '/assets/teams/cadillac/logo.svg', carModel: '/assets/cars/cadillac/cadillac-2026.glb',
    drivers: drivers([['perez','Sergio Pérez','PER',11,'Mexico'],['bottas','Valtteri Bottas','BOT',77,'Finland']]),
    reference_based_approximation: true, materials: { metallic: .75, roughness: .2, clearcoat: .94, clearcoatRoughness: .1 }, meshMap,
  },
]

export const reserveDrivers: Driver[] = drivers([['tsunoda','Yuki Tsunoda','TSU',22,'Japan']])

export const teamById = (id: string) => teams.find((team) => team.id === id) ?? teams[0]
