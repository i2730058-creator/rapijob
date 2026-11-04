import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import type { LatLng } from '@/types';
import { MAPS_PROVIDER, loadGoogleMaps, pinSvgDataUrl } from '@/lib/maps';
import { cn } from '@/lib/utils';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind?: 'tech' | 'selected' | 'user';
}

interface MapViewProps {
  center: LatLng;
  points?: MapPoint[];
  selected?: LatLng | null;
  userLocation?: LatLng | null;
  onPick?: (point: LatLng) => void;
  onPointClick?: (id: string) => void;
  zoom?: number;
  className?: string;
  interactive?: boolean;
  autoCenter?: boolean;
  showLegend?: boolean;
  radiusKm?: number;
}

const COLOR = {
  tech: '#0B2447',
  techSelected: '#1565FF',
  selected: '#FFC531',
  user: '#1565FF',
};

function pinDataUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 40 48"><path d="M20 46.5S36.5 30.5 36.5 18.5A16.5 16.5 0 1 0 3.5 18.5C3.5 30.5 20 46.5 20 46.5Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="20" cy="18.5" r="6" fill="#FFFFFF"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-2 rounded-xl bg-white/95 px-2.5 py-2 text-[11px] font-medium text-slate-600 shadow-card backdrop-blur">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-brand-100" /> Tú
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-900 ring-2 ring-slate-200" /> Técnico
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-sun-500 ring-2 ring-amber-100" /> Ubicación
      </span>
    </div>
  );
}

function LeafletMap({
  center,
  points = [],
  userLocation,
  onPick,
  onPointClick,
  zoom = 14,
  interactive = true,
  autoCenter = true,
  showLegend = true,
  radiusKm,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbacksRef = useRef({ onPick, onPointClick });
  callbacksRef.current = { onPick, onPointClick };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      callbacksRef.current.onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && autoCenter) {
      mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [center.lat, center.lng, autoCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (radiusKm && radiusKm > 0) {
      L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: '#1565FF',
        weight: 1.5,
        dashArray: '5 7',
        fillColor: '#1565FF',
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(layer);
    }

    for (const point of points) {
      const isTech = point.kind === 'tech' || !point.kind;
      const color = point.kind === 'selected' ? COLOR.selected : isTech ? COLOR.tech : COLOR.user;
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: 'rapijob-marker',
          html: `<div class="rj-pin ${point.kind === 'selected' ? 'rj-pin--selected' : ''}" style="--pin-color:${color}"><span></span></div>`,
          iconSize: [34, 44],
          iconAnchor: [17, 42],
          popupAnchor: [0, -40],
        }),
        title: point.label,
        riseOnHover: true,
      });
      marker.bindTooltip(point.label, {
        direction: 'top',
        offset: [0, -38],
        opacity: 0.95,
        className: 'rapijob-tooltip',
      });
      if (onPointClick && point.kind !== 'selected') {
        marker.on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          callbacksRef.current.onPointClick?.(point.id);
        });
      }
      marker.addTo(layer);
    }

    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'rapijob-marker',
          html: '<div class="rj-user-dot"><span></span></div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        title: 'Tu ubicación',
        zIndexOffset: 1000,
      }).addTo(layer);
    }
  }, [points, userLocation, center.lat, center.lng, radiusKm, onPointClick]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div ref={containerRef} className="h-full w-full" />
      {showLegend && <Legend />}
    </div>
  );
}

function GoogleMap(props: MapViewProps) {
  const {
    center,
    points = [],
    userLocation,
    onPick,
    onPointClick,
    zoom = 14,
    autoCenter = true,
    showLegend = true,
    radiusKm,
    className,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const googleRef = useRef<any>(null);
  const callbacksRef = useRef({ onPick, onPointClick });
  callbacksRef.current = { onPick, onPointClick };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        googleRef.current = google;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });
        map.addListener('click', (event: any) => {
          callbacksRef.current.onPick?.({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        });
        mapRef.current = map;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap?.(null));
      markersRef.current = [];
      overlaysRef.current.forEach((o) => o.setMap?.(null));
      overlaysRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && autoCenter) {
      mapRef.current.panTo({ lat: center.lat, lng: center.lng });
    }
  }, [center.lat, center.lng, autoCenter]);

  useEffect(() => {
    const google = googleRef.current;
    const map = mapRef.current;
    if (!google || !map || status !== 'ready') return;

    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];
    overlaysRef.current.forEach((o) => o.setMap?.(null));
    overlaysRef.current = [];

    if (radiusKm && radiusKm > 0) {
      overlaysRef.current.push(
        new google.maps.Circle({
          map,
          center: { lat: center.lat, lng: center.lng },
          radius: radiusKm * 1000,
          strokeColor: '#1565FF',
          strokeOpacity: 0.55,
          strokeWeight: 1.5,
          fillColor: '#1565FF',
          fillOpacity: 0.05,
        }),
      );
    }

    points.forEach((point) => {
      const isTech = point.kind === 'tech' || !point.kind;
      const color = point.kind === 'selected' ? COLOR.selected : isTech ? COLOR.tech : COLOR.user;
      const marker = new google.maps.Marker({
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.label,
        icon: {
          url: pinDataUrl(color),
          scaledSize: new google.maps.Size(36, 44),
          anchor: new google.maps.Point(18, 42),
        },
        zIndex: point.kind === 'selected' ? 999 : 10,
      });
      if (onPointClick && point.kind !== 'selected') {
        marker.addListener('click', () => callbacksRef.current.onPointClick?.(point.id));
      }
      markersRef.current.push(marker);
    });

    if (userLocation) {
      overlaysRef.current.push(
        new google.maps.Circle({
          map,
          center: { lat: userLocation.lat, lng: userLocation.lng },
          radius: 180,
          strokeColor: '#1565FF',
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillColor: '#1565FF',
          fillOpacity: 0.12,
        }),
      );
      markersRef.current.push(
        new google.maps.Marker({
          map,
          position: { lat: userLocation.lat, lng: userLocation.lng },
          title: 'Tu ubicación',
          icon: {
            url: pinDataUrl(COLOR.user),
            scaledSize: new google.maps.Size(30, 36),
            anchor: new google.maps.Point(15, 34),
          },
          zIndex: 1000,
        }),
      );
    }
  }, [points, userLocation, center.lat, center.lng, radiusKm, onPointClick, status]);

  if (status === 'error') {
    return <LeafletMap {...props} />;
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-cloud">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-card">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" /> Cargando mapa…
          </span>
        </div>
      )}
      {showLegend && <Legend />}
    </div>
  );
}

export function MapView(props: MapViewProps) {
  if (MAPS_PROVIDER === 'google') {
    return <GoogleMap {...props} />;
  }
  return <LeafletMap {...props} />;
}

export function MapPlaceholder({ label = 'Mapa' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-brand-50 text-brand-400">
      <MapPin className="h-8 w-8" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

export { pinDataUrl };
