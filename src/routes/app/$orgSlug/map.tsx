import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

import type * as ReactLeaflet from 'react-leaflet'
import type * as Leaflet from 'leaflet'
import type {LocationStatus} from '~/lib/mocks/locations';
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  
  STATUS_COLOR,
  formatPrice,
  locations
} from '~/lib/mocks/locations'

export const Route = createFileRoute('/app/$orgSlug/map')({
  component: MapPage,
  head: () => ({
    meta: [
      { title: getI18n(getLocale()).getFixedT(null, 'org')('map.metaTitle') },
    ],
  }),
})

const STATUS_BADGE_VARIANT: Record<
  LocationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  available: 'default',
  occupied: 'secondary',
  maintenance: 'outline',
}

function MapPage() {
  const { t } = useTranslation(['org'])
  const counts = useMemo(() => {
    const acc: Record<LocationStatus, number> = {
      available: 0,
      occupied: 0,
      maintenance: 0,
    }
    for (const loc of locations) acc[loc.status] += 1
    return acc
  }, [])

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('org:map.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('org:map.subtitle', { count: locations.length })}
        </p>
      </div>

      <Alert>
        <Sparkles className="size-4" />
        <AlertTitle>{t('org:map.demoTitle')}</AlertTitle>
        <AlertDescription>{t('org:map.demoDescription')}</AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <LocationsMap />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('org:map.portfolio')}</CardTitle>
              <CardDescription>{t('org:map.byStatus')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(counts) as Array<LocationStatus>).map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[s] }}
                    />
                    {t(`org:map.status.${s}`)}
                  </span>
                  <Badge variant={STATUS_BADGE_VARIANT[s]}>{counts[s]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('org:map.list')}</CardTitle>
              <CardDescription>
                {t('org:map.officeCount', { count: locations.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-start justify-between gap-2 rounded-md border p-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{loc.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {loc.city} · {formatPrice(loc)}
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[loc.status]}
                    className="shrink-0"
                  >
                    {t(`org:map.status.${loc.status}`)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

/**
 * Leaflet touches `window` at import time, so we defer the import to client
 * mount. This avoids SSR hydration errors and keeps the bundle lean on first
 * paint. Pattern: useEffect → setMounted → dynamic import → render.
 */
function LocationsMap() {
  const { t } = useTranslation(['org'])
  type LeafletModules = {
    MapContainer: typeof ReactLeaflet.MapContainer
    TileLayer: typeof ReactLeaflet.TileLayer
    Marker: typeof ReactLeaflet.Marker
    Popup: typeof ReactLeaflet.Popup
    divIcon: typeof Leaflet.divIcon
  }

  const [mods, setMods] = useState<LeafletModules | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      // Side-effect import of Leaflet CSS — must be client-side only.
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl, L]) => {
      if (cancelled) return
      setMods({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
        divIcon: L.divIcon,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!mods) {
    return (
      <div className="bg-muted/30 flex h-[520px] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          {t('org:map.loadingMap')}
        </p>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, divIcon } = mods

  function pinIcon(status: LocationStatus) {
    const color = STATUS_COLOR[status]
    return divIcon({
      className: 'locations-pin',
      html: `<span style="display:inline-block;width:20px;height:20px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  }

  return (
    <MapContainer
      center={[46.7, 2.5]}
      zoom={6}
      style={{ height: 520, width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={pinIcon(loc.status)}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {loc.title}
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
                {loc.address}
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {t('org:map.desk', { count: loc.capacity })} ·{' '}
                {formatPrice(loc)}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: STATUS_COLOR[loc.status],
                  color: 'white',
                  fontWeight: 500,
                }}
              >
                {t(`org:map.status.${loc.status}`)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
