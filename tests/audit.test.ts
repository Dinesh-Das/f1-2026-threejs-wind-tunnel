import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { aeroProxyLoads, F1_2026_REFERENCE, freeStreamData, wheelKinematics } from '../src/data/f1Reference'
import { teams } from '../src/data/teams'
import { useF1Store } from '../src/store/useF1Store'

describe('aerodynamic reference math', () => {
  it('derives the expected free-stream values at 300 km/h', () => {
    const data = freeStreamData(300)
    expect(data.speedMs).toBeCloseTo(83.333, 3)
    expect(data.dynamicPressureKpa).toBeCloseTo(4.253, 3)
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
