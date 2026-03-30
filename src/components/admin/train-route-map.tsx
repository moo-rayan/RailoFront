"use client"

import { useEffect, useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps"
import { railwayApi, type TripStationPoint } from "@/lib/api/railway"
import { Loader2 } from "lucide-react"

interface TrainRouteMapProps {
  tripId: number
  className?: string
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

// Egypt center fallback
const EGYPT_CENTER = { lat: 30.0444, lng: 31.2357 }

// SVG circle icon for station markers
function createStationIcon(
  color: string,
  size: number,
): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="white" stroke-width="2.5"/>
      ${size > 20 ? `<circle cx="${size / 2}" cy="${size / 2}" r="4" fill="white"/>` : ""}
    </svg>`,
  )}`
}

function RouteRenderer({ tripId }: { tripId: number }) {
  const map = useMap()
  const mapsLib = useMapsLibrary("maps")

  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const { data: pathData } = useQuery({
    queryKey: ["trip-path", tripId],
    queryFn: () => railwayApi.getTripPath(tripId),
    staleTime: 60 * 60 * 1000, // 1 hour
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

    // Clean only polyline, not markers
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
      strokeColor: "#2563eb",
      strokeOpacity: 0.85,
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
  }, [map, mapsLib, pathData])

  // Draw station markers
  useEffect(() => {
    if (!map || !mapsLib || !stationsData?.stations?.length) return

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // Shared InfoWindow
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow()
    }
    const infoWindow = infoWindowRef.current

    const stations = stationsData.stations
    const isFirst = (i: number) => i === 0
    const isLast = (i: number) => i === stations.length - 1

    stations.forEach((station: TripStationPoint, i: number) => {
      const color = isFirst(i) ? "#16a34a" : isLast(i) ? "#dc2626" : "#2563eb"
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

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family:sans-serif;direction:rtl;text-align:right;padding:4px 2px;min-width:140px;">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${station.name_ar}</div>
            <div style="color:#666;font-size:12px;">${station.name_en}</div>
            <div style="margin-top:6px;font-size:13px;">
              <span style="color:#888;">الترتيب:</span> ${station.order}
              &nbsp;&nbsp;
              <span style="color:#888;">الوقت:</span> ${station.time_ar}
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
  }, [map, mapsLib, stationsData])

  // Full cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return null
}

export function TrainRouteMap({ tripId, className }: TrainRouteMapProps) {
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
      >
        <RouteRenderer tripId={tripId} />
      </Map>
    </APIProvider>
  )
}
