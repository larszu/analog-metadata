/**
 * Runtime GPS + weather capture (browser/device APIs + free web services).
 * Kept out of core/ because it touches navigator and the network; the parsing
 * it relies on is unit-tested in core/weather.ts.
 */
import type { Weather } from "../domain/types";
import {
  openMeteoUrl,
  parseOpenMeteo,
  parseReverseGeocode,
  reverseGeocodeUrl,
} from "../core/weather";

export interface GeoWeather {
  lat: number;
  lon: number;
  alt?: number;
  place?: string;
  weather?: Weather;
  temperatureC?: number;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation isn't available on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/**
 * Read the current position, then best-effort fetch weather and a place name.
 * Location always resolves if GPS succeeds; weather/place are optional extras.
 */
export async function captureGeoWeather(): Promise<GeoWeather> {
  const pos = await getPosition();
  const { latitude, longitude, altitude } = pos.coords;
  const result: GeoWeather = {
    lat: Number(latitude.toFixed(6)),
    lon: Number(longitude.toFixed(6)),
    alt: altitude ?? undefined,
  };

  const [weather, place] = await Promise.allSettled([
    fetchJson(openMeteoUrl(latitude, longitude)),
    fetchJson(reverseGeocodeUrl(latitude, longitude)),
  ]);

  if (weather.status === "fulfilled") {
    const w = parseOpenMeteo(weather.value);
    result.weather = w.weather;
    result.temperatureC = w.temperatureC;
  }
  if (place.status === "fulfilled") {
    result.place = parseReverseGeocode(place.value);
  }
  return result;
}
