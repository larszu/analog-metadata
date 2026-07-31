/**
 * Weather + reverse-geocoding helpers for the "auto GPS + weather" capture.
 * The network calls live in data/geo.ts; here is only the pure mapping and
 * response parsing, so the interesting logic is unit-testable.
 *
 * Weather comes from Open-Meteo (free, no key, CORS-enabled) whose current
 * conditions use WMO weather codes. Reverse geocoding uses BigDataCloud's free
 * client endpoint.
 */
import type { Weather } from "../domain/types";

/** Map a WMO weather code (+ day/night) to our Weather chip value. */
export function wmoToWeather(code: number, isDay = true): Weather {
  if (code === 0 || code === 1) return isDay ? "sunny" : "night";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  // 51–67 drizzle/rain, 80–82 showers, 95–99 thunderstorm
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) {
    return "rain";
  }
  return isDay ? "partly-cloudy" : "night";
}

export interface CurrentWeather {
  weather: Weather;
  code: number;
  temperatureC?: number;
  isDay: boolean;
}

export function openMeteoUrl(lat: number, lon: number): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`;
}

export function reverseGeocodeUrl(lat: number, lon: number): string {
  return `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
}

export function parseOpenMeteo(json: unknown): CurrentWeather {
  const cur = (json as { current?: Record<string, unknown> })?.current ?? {};
  const code = Number(cur.weather_code ?? 0);
  const isDay = Number(cur.is_day ?? 1) !== 0;
  const temp = cur.temperature_2m;
  return {
    weather: wmoToWeather(code, isDay),
    code,
    temperatureC: typeof temp === "number" ? temp : undefined,
    isDay,
  };
}

/** Build a human place label like "Hamburg, Germany" from a reverse-geocode. */
export function parseReverseGeocode(json: unknown): string | undefined {
  const j = json as Record<string, unknown>;
  const city = (j?.city || j?.locality || j?.principalSubdivision) as string | undefined;
  const country = j?.countryName as string | undefined;
  const parts = [city, country].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? parts.join(", ") : undefined;
}
