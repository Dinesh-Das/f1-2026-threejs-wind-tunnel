import { useEffect, useMemo, useState } from 'react'
import { useF1Store } from '../../store/useF1Store'
import { carManifestForTeam } from '../../cars/carAssetManifest'
import { GeometryProxyFieldProvider } from '../providers/GeometryProxyFieldProvider'
import { PrecomputedCfdFieldProvider } from '../providers/PrecomputedCfdFieldProvider'
import type { AeroFieldProvider } from './aeroTypes'
import { loadPrecomputedCfdDataset, selectCfdDatasetReferences, type PrecomputedCfdDataset } from './cfdDataset'
import { FLOW_SCENARIOS } from './flowScenarios'
import { useGeometryFieldSnapshot } from './geometryFieldRegistry'

type LoadedCfdState = {
  selectionKey: string
  datasets: PrecomputedCfdDataset[]
}

export function useAeroField(): AeroFieldProvider {
  const selectedTeamId = useF1Store((state) => state.selectedTeamId)
  const windSpeed = useF1Store((state) => state.windSpeed)
  const yawDeg = useF1Store((state) => state.yawDeg)
  const flowPreset = useF1Store((state) => state.flowPreset)
  const activeAeroState = useF1Store((state) => state.activeAeroState)
  const snapshot = useGeometryFieldSnapshot(selectedTeamId)
  const manifest = carManifestForTeam(selectedTeamId)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const aeroMode = activeAeroState === 'Straight' ? 'straight' : 'corner'
  const selectedCfdReferences = useMemo(
    () => selectCfdDatasetReferences(manifest.cfdDatasets, { speedKmh: windSpeed, yawDeg, aeroMode }),
    [manifest.cfdDatasets, windSpeed, yawDeg, aeroMode],
  )
  const selectionKey = selectedCfdReferences
    .map((reference) => `${reference.id}:${reference.path}:${reference.conditions.speedKmh}`)
    .join('|')
  const [loadedCfd, setLoadedCfd] = useState<LoadedCfdState | null>(null)

  useEffect(() => {
    if (!selectedCfdReferences.length) return
    const controller = new AbortController()
    let cancelled = false

    void Promise.all(selectedCfdReferences.map((reference) => loadPrecomputedCfdDataset(reference, controller.signal)))
      .then((datasets) => {
        if (!cancelled) setLoadedCfd({ selectionKey, datasets })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('Precomputed CFD dataset unavailable; using geometry-aware approximation.', error)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [selectedCfdReferences, selectionKey])

  return useMemo(() => {
    if (selectionKey && loadedCfd?.selectionKey === selectionKey) {
      if (loadedCfd.datasets.length === 1) return new PrecomputedCfdFieldProvider(loadedCfd.datasets[0])
      if (loadedCfd.datasets.length === 2) {
        return new PrecomputedCfdFieldProvider([loadedCfd.datasets[0], loadedCfd.datasets[1]], windSpeed)
      }
    }
    return new GeometryProxyFieldProvider(snapshot, { speedKmh: windSpeed, yawDeg, aeroMode, scenario })
  }, [selectionKey, loadedCfd, snapshot, windSpeed, yawDeg, aeroMode, scenario])
}
