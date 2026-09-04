import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { aeroProxyEnvelope, aeroProxyLoads, F1_2026_REFERENCE, freeStreamData, reynoldsNumber, wheelKinematics } from '../src/data/f1Reference'
import { teams } from '../src/data/teams'
import { useF1Store } from '../src/store/useF1Store'
import { FLOW_SCENARIOS, integrateProxyStreamline, sampleProxyFlow } from '../src/aerodynamics/flowModel'

describe('aerodynamic reference math', () => {
  it('derives the expected free-stream values at 300 km/h', () => {
    const data = freeStreamData(300)
    expect(data.speedMs).toBeCloseTo(83.333, 3)
    expect(data.dynamicPressureKpa).toBeCloseTo(4.253, 3)
    expect(data.mach).toBeCloseTo(.243, 3)
  })

  it('derives a full-scale Reynolds-number proxy from air properties and wheelbase', () => {
    expect(reynoldsNumber(300)).toBeCloseTo(19.18e6, -4)
  })

  it('derives wheel rpm from physical tyre diameter', () => {
    const wheels = wheelKinematics(300)
    expect(wheels.frontRpm).toBeCloseTo(2257.6, 0)
    expect(wheels.rearRpm).toBeCloseTo(2241.7, 0)
  })

  it('scales proxy aerodynamic loads with velocity squared', () => {
    const slow = aeroProxyLoads(150, 'Corner')
    const fast = aeroProxyLoads(300, 'Corner')
    expect(fast.dragN / slow.dragN).toBeCloseTo(4, 5)
    expect(fast.downforceN / slow.downforceN).toBeCloseTo(4, 5)
  })

  it('reduces proxy drag and downforce in straight-line active aero state', () => {
    const corner = aeroProxyLoads(300, 'Corner')
    const straight = aeroProxyLoads(300, 'Straight')
    expect(straight.dragN).toBeLessThan(corner.dragN)
    expect(straight.downforceN).toBeLessThan(corner.downforceN)
  })

  it('produces a bounded front/rear aero-balance proxy', () => {
    const team = teams[0]
    const envelope = aeroProxyEnvelope(300, 'Corner', team.geometry, .08, .12)
    expect(envelope.frontShare).toBeGreaterThanOrEqual(.41)
    expect(envelope.frontShare).toBeLessThanOrEqual(.49)
    expect(envelope.frontShare + envelope.rearShare).toBeCloseTo(1, 8)
    expect(envelope.effectiveDownforceN).toBeGreaterThan(0)
  })

  it('keeps the public 2026 proxy dimensions internally sane', () => {
    expect(F1_2026_REFERENCE.maxWheelbaseM).toBeGreaterThan(3)
    expect(F1_2026_REFERENCE.maxWidthM).toBeLessThanOrEqual(1.9)
    expect(F1_2026_REFERENCE.frontTyreDiameterM).toBeGreaterThan(.6)
    expect(F1_2026_REFERENCE.rearTyreDiameterM).toBeGreaterThan(.6)
  })
})

describe('2026 team dataset', () => {
  it('contains 11 unique constructors with two drivers and local logo assets', () => {
    expect(teams).toHaveLength(11)
    expect(new Set(teams.map((team) => team.id)).size).toBe(11)

    for (const team of teams) {
      expect(team.drivers).toHaveLength(2)
      expect(team.reference_based_approximation).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', team.logo))).toBe(true)
    }
  })

  it('does not duplicate driver numbers across the active grid', () => {
    const numbers = teams.flatMap((team) => team.drivers.map((driver) => driver.number))
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('gives every constructor a distinct procedural geometry signature', () => {
    const signatures = teams.map((team) => JSON.stringify(team.geometry))
    expect(new Set(signatures).size).toBe(teams.length)
  })

  it('keeps geometry profile multipliers within a conservative visualization envelope', () => {
    for (const team of teams) {
      for (const value of Object.values(team.geometry)) {
        expect(value).toBeGreaterThanOrEqual(.85)
        expect(value).toBeLessThanOrEqual(1.16)
      }
    }
  })

  it('preserves the major 2026 Ferrari and Red Bull livery identities', () => {
    const ferrari = teams.find((team) => team.id === 'ferrari')!
    const redBull = teams.find((team) => team.id === 'redbull')!
    expect(ferrari.livery.body).toBe('#e80020')
    expect(ferrari.livery.engineCover).toBe('#e80020')
    expect(ferrari.livery.accent2).toBe('#f3f1ed')
    expect(redBull.livery.body).toBe('#f2f2ef')
    expect(redBull.livery.engineCover).toBe('#f2f2ef')
    expect(redBull.livery.wing).toBe('#13284d')
  })
})

describe('geometry-reactive wind-tunnel proxy', () => {
  it('accelerates underfloor flow relative to a far-field streamline', () => {
    const geometry = teams[0].geometry
    const scenario = FLOW_SCENARIOS['High Speed']
    const floor = sampleProxyFlow(0, -.5, -.25, geometry, scenario, 300 / 350)
    const free = sampleProxyFlow(3.2, 2.2, -.25, geometry, scenario, 300 / 350)
    expect(floor.speedRatio).toBeGreaterThan(free.speedRatio)
  })

  it('creates a rear wake velocity deficit downstream of the car', () => {
    const geometry = teams[0].geometry
    const scenario = FLOW_SCENARIOS['Dirty Air']
    const wake = sampleProxyFlow(0, .2, -5.2, geometry, scenario, 220 / 350)
    expect(wake.speedRatio).toBeLessThan(1)
    expect(wake.vorticity).toBeGreaterThan(0)
  })

  it('changes diffuser flow when constructor geometry changes', () => {
    const scenario = FLOW_SCENARIOS['High Speed']
    const redBull = teams.find((team) => team.id === 'redbull')!
    const cadillac = teams.find((team) => team.id === 'cadillac')!
    const a = sampleProxyFlow(.8, -.45, -4.1, redBull.geometry, scenario, 300 / 350)
    const b = sampleProxyFlow(.8, -.45, -4.1, cadillac.geometry, scenario, 300 / 350)
    expect(a.dx).not.toBeCloseTo(b.dx, 5)
  })

  it('advects streamlines continuously downstream through the proxy field', () => {
    const geometry = teams[0].geometry
    const scenario = FLOW_SCENARIOS['High Speed']
    const points = integrateProxyStreamline(.4, .1, geometry, scenario, 300 / 350, 3)
    expect(points).toHaveLength(52)
    expect(points.at(-1)!.z).toBeLessThan(points[0].z)
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index].z).toBeLessThan(points[index - 1].z)
      expect(Number.isFinite(points[index].x)).toBe(true)
      expect(Number.isFinite(points[index].y)).toBe(true)
    }
  })
})

describe('simulation mode invariants', () => {
  beforeEach(() => {
    useF1Store.setState({ aerodynamicMode: false, compareMode: false, windTunnel: false })
  })

  it('exits compare mode when aerodynamics is enabled', () => {
    useF1Store.setState({ compareMode: true })
    useF1Store.getState().set({ aerodynamicMode: true })
    expect(useF1Store.getState().aerodynamicMode).toBe(true)
    expect(useF1Store.getState().compareMode).toBe(false)
  })

  it('makes an active wind tunnel imply aerodynamic mode', () => {
    useF1Store.setState({ compareMode: true })
    useF1Store.getState().set({ windTunnel: true })
    expect(useF1Store.getState().windTunnel).toBe(true)
    expect(useF1Store.getState().aerodynamicMode).toBe(true)
    expect(useF1Store.getState().compareMode).toBe(false)
  })

  it('exits aerodynamics when compare mode is enabled', () => {
    useF1Store.setState({ aerodynamicMode: true, windTunnel: true })
    useF1Store.getState().set({ compareMode: true })
    expect(useF1Store.getState().compareMode).toBe(true)
    expect(useF1Store.getState().aerodynamicMode).toBe(false)
  })
})
