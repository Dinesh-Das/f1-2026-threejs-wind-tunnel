export type Driver = {
  id: string
  name: string
  shortName: string
  number: number
  nationality: string
  portrait?: string
  helmetModel?: string
}

export type TeamGeometryProfile = {
  noseTipWidth: number
  noseCrown: number
  sidepodWidth: number
  sidepodHeight: number
  sidepodUndercut: number
  sidepodInletScale: number
  cokeBottleTaper: number
  engineCoverHeight: number
  sharkFinHeight: number
  floorEdgeWidth: number
  frontWingChord: number
  frontWingCamber: number
  rearWingSpan: number
  rearWingCamber: number
  diffuserExpansion: number
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
  /** Optional authorized production model. Omit it to use the regulation-based proxy without a failed network request. */
  carModel?: string
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
  /** Public-reference-inspired visual differentiation, not confidential constructor geometry. */
  geometry: TeamGeometryProfile
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

const geometryProfiles: Record<string, TeamGeometryProfile> = {
  mclaren: {
    noseTipWidth: .92, noseCrown: .94, sidepodWidth: .96, sidepodHeight: .92, sidepodUndercut: 1.08,
    sidepodInletScale: .94, cokeBottleTaper: 1.08, engineCoverHeight: .94, sharkFinHeight: .92,
    floorEdgeWidth: 1.02, frontWingChord: 1.02, frontWingCamber: 1.04, rearWingSpan: .98, rearWingCamber: 1.01,
    diffuserExpansion: 1.04,
  },
  mercedes: {
    noseTipWidth: .86, noseCrown: .9, sidepodWidth: .91, sidepodHeight: .88, sidepodUndercut: 1.12,
    sidepodInletScale: .88, cokeBottleTaper: 1.12, engineCoverHeight: .91, sharkFinHeight: .96,
    floorEdgeWidth: .98, frontWingChord: .98, frontWingCamber: 1.08, rearWingSpan: 1.02, rearWingCamber: .98,
    diffuserExpansion: 1.08,
  },
  ferrari: {
    noseTipWidth: 1.02, noseCrown: 1.05, sidepodWidth: 1.04, sidepodHeight: 1.06, sidepodUndercut: .96,
    sidepodInletScale: 1.08, cokeBottleTaper: .98, engineCoverHeight: 1.03, sharkFinHeight: 1.06,
    floorEdgeWidth: 1.04, frontWingChord: 1.05, frontWingCamber: 1.02, rearWingSpan: 1.01, rearWingCamber: 1.04,
    diffuserExpansion: 1.0,
  },
  redbull: {
    noseTipWidth: .89, noseCrown: .96, sidepodWidth: .93, sidepodHeight: .9, sidepodUndercut: 1.15,
    sidepodInletScale: .91, cokeBottleTaper: 1.14, engineCoverHeight: .92, sharkFinHeight: .9,
    floorEdgeWidth: 1.06, frontWingChord: 1.0, frontWingCamber: 1.1, rearWingSpan: .96, rearWingCamber: 1.08,
    diffuserExpansion: 1.12,
  },
  'racing-bulls': {
    noseTipWidth: .95, noseCrown: .98, sidepodWidth: .97, sidepodHeight: .95, sidepodUndercut: 1.06,
    sidepodInletScale: .96, cokeBottleTaper: 1.05, engineCoverHeight: .96, sharkFinHeight: .95,
    floorEdgeWidth: 1.0, frontWingChord: 1.01, frontWingCamber: 1.06, rearWingSpan: .99, rearWingCamber: 1.05,
    diffuserExpansion: 1.05,
  },
  alpine: {
    noseTipWidth: 1.04, noseCrown: 1.02, sidepodWidth: 1.02, sidepodHeight: 1.02, sidepodUndercut: 1.0,
    sidepodInletScale: 1.04, cokeBottleTaper: 1.0, engineCoverHeight: 1.0, sharkFinHeight: 1.04,
    floorEdgeWidth: .99, frontWingChord: 1.04, frontWingCamber: 1.0, rearWingSpan: 1.03, rearWingCamber: 1.01,
    diffuserExpansion: .99,
  },
  haas: {
    noseTipWidth: 1.06, noseCrown: 1.06, sidepodWidth: 1.05, sidepodHeight: 1.04, sidepodUndercut: .94,
    sidepodInletScale: 1.06, cokeBottleTaper: .96, engineCoverHeight: 1.04, sharkFinHeight: 1.02,
    floorEdgeWidth: .97, frontWingChord: 1.03, frontWingCamber: .97, rearWingSpan: 1.04, rearWingCamber: 1.0,
    diffuserExpansion: .96,
  },
  audi: {
    noseTipWidth: .94, noseCrown: .92, sidepodWidth: .95, sidepodHeight: .94, sidepodUndercut: 1.09,
    sidepodInletScale: .92, cokeBottleTaper: 1.1, engineCoverHeight: .95, sharkFinHeight: .98,
    floorEdgeWidth: 1.01, frontWingChord: .97, frontWingCamber: 1.07, rearWingSpan: 1.0, rearWingCamber: 1.03,
    diffuserExpansion: 1.09,
  },
  williams: {
    noseTipWidth: .98, noseCrown: 1.0, sidepodWidth: .98, sidepodHeight: .97, sidepodUndercut: 1.04,
    sidepodInletScale: .98, cokeBottleTaper: 1.04, engineCoverHeight: .98, sharkFinHeight: .94,
    floorEdgeWidth: 1.03, frontWingChord: 1.0, frontWingCamber: 1.03, rearWingSpan: .97, rearWingCamber: 1.06,
    diffuserExpansion: 1.03,
  },
  'aston-martin': {
    noseTipWidth: .9, noseCrown: .95, sidepodWidth: 1.0, sidepodHeight: .93, sidepodUndercut: 1.1,
    sidepodInletScale: 1.0, cokeBottleTaper: 1.07, engineCoverHeight: .93, sharkFinHeight: .93,
    floorEdgeWidth: 1.05, frontWingChord: .99, frontWingCamber: 1.09, rearWingSpan: 1.01, rearWingCamber: 1.02,
    diffuserExpansion: 1.1,
  },
  cadillac: {
    noseTipWidth: 1.08, noseCrown: 1.08, sidepodWidth: 1.07, sidepodHeight: 1.08, sidepodUndercut: .92,
    sidepodInletScale: 1.1, cokeBottleTaper: .94, engineCoverHeight: 1.06, sharkFinHeight: 1.08,
    floorEdgeWidth: .96, frontWingChord: 1.06, frontWingCamber: .96, rearWingSpan: 1.05, rearWingCamber: .97,
    diffuserExpansion: .95,
  },
}

const drivers = (items: Array<[string, string, string, number, string]>): Driver[] =>
  items.map(([id, name, shortName, number, nationality]) => ({ id, name, shortName, number, nationality }))

export const teams: Team[] = [
  {
    id: 'mclaren', name: 'McLaren Mercedes', shortName: 'McLaren', constructor: 'McLaren', powerUnit: 'Mercedes',
    primaryColor: '#ff8000', secondaryColor: '#111317', logo: '/assets/teams/mclaren/logo.webp',
    livery: { body:'#ff8000', sidepod:'#111317', engineCover:'#ff8000', wing:'#111317', accent:'#00c7b1', accent2:'#f4f4f4', halo:'#111317', finish:'gloss' },
    geometry: geometryProfiles.mclaren,
    drivers: drivers([['norris','Lando Norris','NOR',1,'United Kingdom'],['piastri','Oscar Piastri','PIA',81,'Australia']]),
    reference_based_approximation: true, materials: { metallic: .48, roughness: .2, clearcoat: 1, clearcoatRoughness: .12 }, meshMap,
  },
  {
    id: 'mercedes', name: 'Mercedes', shortName: 'Mercedes', constructor: 'Mercedes', powerUnit: 'Mercedes',
    primaryColor: '#c7c9cb', secondaryColor: '#0a0b0d', logo: '/assets/teams/mercedes/logo.webp',
    livery: { body:'#c7c9cb', sidepod:'#0b0d0f', engineCover:'#0b0d0f', wing:'#0a0b0d', accent:'#00a19b', accent2:'#e7e8e8', halo:'#0a0b0d', finish:'metallic' },
    geometry: geometryProfiles.mercedes,
    drivers: drivers([['russell','George Russell','RUS',63,'United Kingdom'],['antonelli','Kimi Antonelli','ANT',12,'Italy']]),
    reference_based_approximation: true, materials: { metallic: .78, roughness: .18, clearcoat: .9, clearcoatRoughness: .1 }, meshMap,
  },
  {
    id: 'ferrari', name: 'Scuderia Ferrari', shortName: 'Ferrari', constructor: 'Ferrari', powerUnit: 'Ferrari',
    primaryColor: '#e80020', secondaryColor: '#f4f4f2', logo: '/assets/teams/ferrari/logo.webp',
    livery: { body:'#e80020', sidepod:'#e80020', engineCover:'#e80020', wing:'#171717', accent:'#ffd21e', accent2:'#f3f1ed', halo:'#e80020', finish:'gloss' },
    geometry: geometryProfiles.ferrari,
    drivers: drivers([['leclerc','Charles Leclerc','LEC',16,'Monaco'],['hamilton','Lewis Hamilton','HAM',44,'United Kingdom']]),
    reference_based_approximation: true, materials: { metallic: .52, roughness: .16, clearcoat: 1, clearcoatRoughness: .08 }, meshMap,
  },
  {
    id: 'redbull', name: 'Red Bull Racing Ford', shortName: 'Red Bull', constructor: 'Red Bull Racing', powerUnit: 'Ford',
    primaryColor: '#f2f2ef', secondaryColor: '#16305c', logo: '/assets/teams/redbull/logo.webp',
    livery: { body:'#f2f2ef', sidepod:'#f2f2ef', engineCover:'#f2f2ef', wing:'#13284d', accent:'#f6c900', accent2:'#e3272d', halo:'#f2f2ef', finish:'gloss' },
    geometry: geometryProfiles.redbull,
    drivers: drivers([['verstappen','Max Verstappen','VER',3,'Netherlands'],['hadjar','Isack Hadjar','HAD',6,'France']]),
    reference_based_approximation: true, materials: { metallic: .45, roughness: .26, clearcoat: .82, clearcoatRoughness: .16 }, meshMap,
  },
  {
    id: 'racing-bulls', name: 'Racing Bulls Red Bull Ford', shortName: 'Racing Bulls', constructor: 'Racing Bulls', powerUnit: 'Ford',
    primaryColor: '#f5f6f3', secondaryColor: '#173fce', logo: '/assets/teams/racing-bulls/logo.webp',
    livery: { body:'#f5f6f3', sidepod:'#f5f6f3', engineCover:'#f5f6f3', wing:'#173fce', accent:'#173fce', accent2:'#d8232a', halo:'#173fce', finish:'gloss' },
    geometry: geometryProfiles['racing-bulls'],
    drivers: drivers([['lawson','Liam Lawson','LAW',30,'New Zealand'],['lindblad','Arvid Lindblad','LIN',41,'United Kingdom']]),
    reference_based_approximation: true, materials: { metallic: .42, roughness: .22, clearcoat: .9, clearcoatRoughness: .14 }, meshMap,
  },
  {
    id: 'alpine', name: 'Alpine Mercedes', shortName: 'Alpine', constructor: 'Alpine', powerUnit: 'Mercedes',
    primaryColor: '#1688f8', secondaryColor: '#ff72b6', logo: '/assets/teams/alpine/logo.webp',
    livery: { body:'#1688f8', sidepod:'#ff72b6', engineCover:'#1688f8', wing:'#10161c', accent:'#ff72b6', accent2:'#f2f4f8', halo:'#10161c', finish:'gloss' },
    geometry: geometryProfiles.alpine,
    drivers: drivers([['gasly','Pierre Gasly','GAS',10,'France'],['colapinto','Franco Colapinto','COL',43,'Argentina']]),
    reference_based_approximation: true, materials: { metallic: .5, roughness: .2, clearcoat: 1, clearcoatRoughness: .12 }, meshMap,
  },
  {
    id: 'haas', name: 'Haas Toyota F1 Team', shortName: 'Haas', constructor: 'Haas', powerUnit: 'Ferrari',
    primaryColor: '#f1f1ef', secondaryColor: '#171717', logo: '/assets/teams/haas/logo.webp',
    livery: { body:'#f1f1ef', sidepod:'#f1f1ef', engineCover:'#f1f1ef', wing:'#171717', accent:'#d71920', accent2:'#171717', halo:'#171717', finish:'gloss' },
    geometry: geometryProfiles.haas,
    drivers: drivers([['ocon','Esteban Ocon','OCO',31,'France'],['bearman','Oliver Bearman','BEA',87,'United Kingdom']]),
    reference_based_approximation: true, materials: { metallic: .48, roughness: .24, clearcoat: .86, clearcoatRoughness: .14 }, meshMap,
  },
  {
    id: 'audi', name: 'Audi', shortName: 'Audi', constructor: 'Audi', powerUnit: 'Audi',
    primaryColor: '#b5b8b2', secondaryColor: '#111214', logo: '/assets/teams/audi/logo.webp',
    livery: { body:'#b5b8b2', sidepod:'#111214', engineCover:'#111214', wing:'#111214', accent:'#f50537', accent2:'#b5b8b2', halo:'#111214', finish:'metallic' },
    geometry: geometryProfiles.audi,
    drivers: drivers([['hulkenberg','Nico Hülkenberg','HUL',27,'Germany'],['bortoleto','Gabriel Bortoleto','BOR',5,'Brazil']]),
    reference_based_approximation: true, materials: { metallic: .72, roughness: .2, clearcoat: .92, clearcoatRoughness: .12 }, meshMap,
  },
  {
    id: 'williams', name: 'Williams Mercedes', shortName: 'Williams', constructor: 'Williams', powerUnit: 'Mercedes',
    primaryColor: '#005aff', secondaryColor: '#f4f5f6', logo: '/assets/teams/williams/logo.webp',
    livery: { body:'#005aff', sidepod:'#f4f5f6', engineCover:'#101316', wing:'#f4f5f6', accent:'#e31b23', accent2:'#f4f5f6', halo:'#005aff', finish:'gloss' },
    geometry: geometryProfiles.williams,
    drivers: drivers([['sainz','Carlos Sainz','SAI',55,'Spain'],['albon','Alexander Albon','ALB',23,'Thailand']]),
    reference_based_approximation: true, materials: { metallic: .5, roughness: .2, clearcoat: .9, clearcoatRoughness: .13 }, meshMap,
  },
  {
    id: 'aston-martin', name: 'Aston Martin Honda', shortName: 'Aston Martin', constructor: 'Aston Martin', powerUnit: 'Honda',
    primaryColor: '#00665e', secondaryColor: '#c9df00', logo: '/assets/teams/aston-martin/logo.webp',
    livery: { body:'#00665e', sidepod:'#00665e', engineCover:'#00665e', wing:'#111315', accent:'#c9df00', accent2:'#f0f1ed', halo:'#00665e', finish:'metallic' },
    geometry: geometryProfiles['aston-martin'],
    drivers: drivers([['alonso','Fernando Alonso','ALO',14,'Spain'],['stroll','Lance Stroll','STR',18,'Canada']]),
    reference_based_approximation: true, materials: { metallic: .54, roughness: .18, clearcoat: 1, clearcoatRoughness: .1 }, meshMap,
  },
  {
    id: 'cadillac', name: 'Cadillac F1 Team', shortName: 'Cadillac', constructor: 'Cadillac', powerUnit: 'Ferrari',
    primaryColor: '#111214', secondaryColor: '#f2f2ef', logo: '/assets/teams/cadillac/logo.webp',
    livery: { body:'#111214', sidepod:'#f2f2ef', engineCover:'#111214', wing:'#111214', accent:'#c8c9c7', accent2:'#f2f2ef', halo:'#111214', finish:'satin' },
    geometry: geometryProfiles.cadillac,
    drivers: drivers([['perez','Sergio Pérez','PER',11,'Mexico'],['bottas','Valtteri Bottas','BOT',77,'Finland']]),
    reference_based_approximation: true, materials: { metallic: .75, roughness: .2, clearcoat: .94, clearcoatRoughness: .1 }, meshMap,
  },
]

export const reserveDrivers: Driver[] = drivers([['tsunoda','Yuki Tsunoda','TSU',22,'Japan']])

export const teamById = (id: string) => teams.find((team) => team.id === id) ?? teams[0]
