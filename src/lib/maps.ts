import type { LatLng } from '@/types';

export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

export const MAPS_PROVIDER: 'google' | 'leaflet' = GOOGLE_MAPS_API_KEY ? 'google' : 'leaflet';

declare global {
  interface Window {
    google?: any;
    __rapijobMapsReady?: () => void;
    __rapijobMapsPromise?: Promise<any>;
  }
}

/** Carga el SDK de Google Maps una sola vez. */
export function loadGoogleMaps(): Promise<any> {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Falta la clave de Google Maps.'));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__rapijobMapsPromise) return window.__rapijobMapsPromise;

  window.__rapijobMapsPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Google Maps tardó demasiado en cargar.'));
    }, 12000);

    window.__rapijobMapsReady = () => {
      window.clearTimeout(timeout);
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('Google Maps no está disponible.'));
    };

    const script = document.createElement('script');
    script.id = 'rapijob-google-maps';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&v=weekly&loading=async&callback=__rapijobMapsReady`;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('No se pudo cargar Google Maps. Revisa tu conexión o la clave API.'));
    };
    document.head.appendChild(script);
  });

  return window.__rapijobMapsPromise;
}

/** Obtiene una dirección aproximada a partir de coordenadas. */
export async function reverseGeocode(point: LatLng): Promise<string | null> {
  if (MAPS_PROVIDER === 'google') {
    try {
      const google = await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<any>((resolve, reject) => {
        geocoder.geocode(
          { location: { lat: point.lat, lng: point.lng } },
          (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) resolve(results[0]);
            else reject(new Error(status));
          },
        );
      });
      return result.formatted_address as string;
    } catch {
      // Si Google falla, intentamos con OpenStreetMap.
    }
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&accept-language=es`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = (await response.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

/** Busca coordenadas a partir de una dirección. */
export async function geocodeAddress(
  query: string,
  near?: LatLng,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const clean = query.trim();
  if (!clean) return null;

  if (MAPS_PROVIDER === 'google') {
    try {
      const google = await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<any>((resolve, reject) => {
        geocoder.geocode(
          {
            address: `${clean}, Perú`,
            ...(near
              ? { location: { lat: near.lat, lng: near.lng }, bounds: undefined }
              : {}),
          },
          (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) resolve(results[0]);
            else reject(new Error(status));
          },
        );
      });
      const location = result.geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
        label: result.formatted_address as string,
      };
    } catch {
      // Continuamos con OpenStreetMap.
    }
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: `${clean}, Huancayo, Perú`,
      limit: '1',
      'accept-language': 'es',
      countrycodes: 'pe',
    });
    if (near) {
      const delta = 0.06;
      params.set(
        'viewbox',
        `${near.lng - delta},${near.lat + delta},${near.lng + delta},${near.lat - delta}`,
      );
      params.set('bounded', '0');
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!rows.length) return null;
    return {
      lat: Number(rows[0].lat),
      lng: Number(rows[0].lon),
      label: rows[0].display_name,
    };
  } catch {
    return null;
  }
}

export function pinSvgDataUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><path d="M20 46.5S36.5 30.5 36.5 18.5A16.5 16.5 0 1 0 3.5 18.5C3.5 30.5 20 46.5 20 46.5Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="20" cy="18.5" r="6" fill="#FFFFFF"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
