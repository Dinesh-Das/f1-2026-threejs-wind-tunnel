import { useSyncExternalStore } from 'react'

export type GeometryObstacle = {
  semantic: string
  min: [number, number, number]
  max: [number, number, number]
}

export type GeometryFieldSnapshot = {
  teamId: string
  sourceModel: string
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
  }
  obstacles: GeometryObstacle[]
}

const snapshots = new Map<string, GeometryFieldSnapshot>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  for (const listener of listeners) listener()
}

export function setGeometryFieldSnapshot(snapshot: GeometryFieldSnapshot) {
  snapshots.set(snapshot.teamId, snapshot)
  emit()
}

export function clearGeometryFieldSnapshot(teamId: string, sourceModel?: string) {
  const current = snapshots.get(teamId)
  if (!current || (sourceModel && current.sourceModel !== sourceModel)) return
  snapshots.delete(teamId)
  emit()
}

export function getGeometryFieldSnapshot(teamId: string) {
  return snapshots.get(teamId) ?? null
}

export function subscribeGeometryField(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useGeometryFieldSnapshot(teamId: string) {
  useSyncExternalStore(
    subscribeGeometryField,
    () => version,
    () => version,
  )
  return getGeometryFieldSnapshot(teamId)
}
