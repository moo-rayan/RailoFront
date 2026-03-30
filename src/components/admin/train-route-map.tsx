"use client"

import { useEffect, useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps"
import { railwayApi, type TripStationPoint } from "@/lib/api/railway"
import { tripsApi } from "@/lib/api/trips"
import { Loader2, MapPinOff } from "lucide-react"

interface LivePosition {
  lat: number
  lng: number
  speed: number
}

interface TrainRouteMapProps {
  tripId: number
  className?: string
  livePosition?: LivePosition | null
}

interface LiveTrainMapProps {
  tripId?: number | null
  trainNumber: string
  className?: string
  livePosition?: LivePosition | null
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

// Egypt center fallback
const EGYPT_CENTER = { lat: 30.0444, lng: 31.2357 }

// ── Clean map styles — cities only ──────────────────────────────────────────

const CLEAN_LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#c0c0c0" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#dadada" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#333333" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#eeeeee" }, { visibility: "simplified" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e0e0e0" }, { visibility: "simplified" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d6e3" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
]

const CLEAN_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#3a3a5c" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#2a2a4a" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c0c0d0" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#252540" }, { visibility: "simplified" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2d2d50" }, { visibility: "simplified" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1a2b" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
]

// ── SVG icons ───────────────────────────────────────────────────────────────

function createStationIcon(color: string, size: number): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="white" stroke-width="2.5"/>
      ${size > 20 ? `<circle cx="${size / 2}" cy="${size / 2}" r="4" fill="white"/>` : ""}
    </svg>`,
  )}`
}

function createTrainIcon(): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="#f97316" stroke="white" stroke-width="3"/>
      <path d="M18 10 L18 22 M14 18 L18 22 L22 18" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(0 18 18)"/>
      <circle cx="18" cy="18" r="3" fill="white"/>
    </svg>`,
  )}`
}

// ── Theme-aware style applier ───────────────────────────────────────────────

function ThemeStyler({ isDark }: { isDark: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    map.setOptions({ styles: isDark ? CLEAN_DARK_STYLE : CLEAN_LIGHT_STYLE })
  }, [map, isDark])

  return null
}

// ── Route renderer ──────────────────────────────────────────────────────────

function RouteRenderer({ tripId, livePosition, isDark }: { tripId: number; livePosition?: LivePosition | null; isDark: boolean }) {
  const map = useMap()
  const mapsLib = useMapsLibrary("maps")

  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const trainMarkerRef = useRef<google.maps.Marker | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const { data: pathData } = useQuery({
    queryKey: ["trip-path", tripId],
    queryFn: () => railwayApi.getTripPath(tripId),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  const { data: stationsData } = useQuery({
    queryKey: ["trip-stations", tripId],
    queryFn: () => railwayApi.getTripStations(tripId),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  // Cleanup old overlays
  const cleanup = useCallback(() => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (infoWindowRef.current) {
      infoWindowRef.current.close()
    }
  }, [])

  // Draw polyline
  useEffect(() => {
    if (!map || !mapsLib || !pathData?.path?.length) return

    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    const path = pathData.path.map(([lat, lon]) => ({
      lat,
      lng: lon,
    }))

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: isDark ? "#60a5fa" : "#2563eb",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      geodesic: true,
      map,
    })
    polylineRef.current = polyline

    // Fit bounds
    const bounds = new google.maps.LatLngBounds()
    path.forEach((p) => bounds.extend(p))
    map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 })

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
    }
  }, [map, mapsLib, pathData, isDark])

  // Draw station markers
  useEffect(() => {
    if (!map || !mapsLib || !stationsData?.stations?.length) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow()
    }
    const infoWindow = infoWindowRef.current

    const stations = stationsData.stations
    const isFirst = (i: number) => i === 0
    const isLast = (i: number) => i === stations.length - 1

    stations.forEach((station: TripStationPoint, i: number) => {
      const color = isFirst(i) ? "#16a34a" : isLast(i) ? "#dc2626" : isDark ? "#60a5fa" : "#2563eb"
      const size = isFirst(i) || isLast(i) ? 28 : 18

      const marker = new google.maps.Marker({
        map,
        position: { lat: station.lat, lng: station.lon },
        title: `${station.order}. ${station.name_ar}`,
        icon: {
          url: createStationIcon(color, size),
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        },
        zIndex: isFirst(i) || isLast(i) ? 10 : 5,
      })

      const bgColor = isDark ? "#1e1e2f" : "#fff"
      const textColor = isDark ? "#e0e0e0" : "#333"
      const subColor = isDark ? "#9ca3af" : "#666"
      const mutedColor = isDark ? "#6b7280" : "#888"

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:sans-serif;direction:rtl;text-align:right;padding:6px 4px;min-width:150px;background:${bgColor};color:${textColor};border-radius:6px;">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${station.name_ar}</div>
            <div style="color:${subColor};font-size:12px;">${station.name_en}</div>
            <div style="margin-top:6px;font-size:13px;">
              <span style="color:${mutedColor};">الترتيب:</span> ${station.order}
              &nbsp;&nbsp;
              <span style="color:${mutedColor};">الوقت:</span> ${station.time_ar}
            </div>
          </div>
        `)
        infoWindow.open(map, marker)
      })

      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
    }
  }, [map, mapsLib, stationsData, isDark])

  // Draw/update live train position marker
  useEffect(() => {
    if (!map || !mapsLib) return
    if (!livePosition || (livePosition.lat === 0 && livePosition.lng === 0)) {
      if (trainMarkerRef.current) {
        trainMarkerRef.current.setMap(null)
        trainMarkerRef.current = null
      }
      return
    }

    const pos = { lat: livePosition.lat, lng: livePosition.lng }

    if (trainMarkerRef.current) {
      trainMarkerRef.current.setPosition(pos)
      trainMarkerRef.current.setTitle(`القطار — ${livePosition.speed.toFixed(0)} كم/س`)
    } else {
      trainMarkerRef.current = new google.maps.Marker({
        map,
        position: pos,
        title: `القطار — ${livePosition.speed.toFixed(0)} كم/س`,
        icon: {
          url: createTrainIcon(),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
        zIndex: 100,
      })
    }
  }, [map, mapsLib, livePosition])

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (trainMarkerRef.current) {
        trainMarkerRef.current.setMap(null)
        trainMarkerRef.current = null
      }
    }
  }, [cleanup])

  return null
}

// ── Main map components ─────────────────────────────────────────────────────

export function TrainRouteMap({ tripId, className, livePosition }: TrainRouteMapProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const { data: pathData, isLoading: pathLoading, error: pathError } = useQuery({
    queryKey: ["trip-path", tripId],
    queryFn: () => railwayApi.getTripPath(tripId),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">مفتاح Google Maps غير متوفر</p>
      </div>
    )
  }

  if (pathLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="mr-2 text-sm text-muted-foreground">جاري تحميل المسار...</span>
      </div>
    )
  }

  if (pathError) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">تعذر تحميل بيانات المسار</p>
      </div>
    )
  }

  const center = pathData
    ? {
        lat: (pathData.from_lat + pathData.to_lat) / 2,
        lng: (pathData.from_lon + pathData.to_lon) / 2,
      }
    : EGYPT_CENTER

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        className={className}
        defaultCenter={center}
        defaultZoom={8}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        styles={isDark ? CLEAN_DARK_STYLE : CLEAN_LIGHT_STYLE}
      >
        <ThemeStyler isDark={isDark} />
        <RouteRenderer tripId={tripId} livePosition={livePosition} isDark={isDark} />
      </Map>
    </APIProvider>
  )
}

/**
 * LiveTrainMap — wrapper for live tracking page.
 * Resolves tripId automatically from trainNumber if not provided.
 */
export function LiveTrainMap({ tripId, trainNumber, className, livePosition }: LiveTrainMapProps) {
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["train-trips", trainNumber],
    queryFn: () => tripsApi.getByTrainNumber(trainNumber),
    staleTime: 60 * 60 * 1000,
    enabled: !tripId && !!trainNumber,
  })

  const resolvedTripId = tripId ?? trips?.[0]?.id ?? null

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 rounded-lg ${className}`}>
        <p className="text-muted-foreground text-sm">مفتاح Google Maps غير متوفر</p>
      </div>
    )
  }

  if (!resolvedTripId && tripsLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 rounded-lg ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="mr-2 text-sm text-muted-foreground">جاري تحميل بيانات الخريطة...</span>
      </div>
    )
  }

  if (!resolvedTripId) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted/50 rounded-lg ${className}`}>
        <MapPinOff className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm">لا توجد بيانات مسار متاحة لهذا القطار</p>
      </div>
    )
  }

  return (
    <TrainRouteMap
      tripId={resolvedTripId}
      className={className}
      livePosition={livePosition}
    />
  )
}
