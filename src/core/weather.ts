/**
 * Weather + geocoding helpers for retroactively filling a frame's conditions.
 *
 * An analog frame carries no GPS or timestamp — the photographer knows *where*
 * and *when* it was shot and types that in. So the flow is:
 *   1. manual location  →  forward-geocode a place name to coordinates
 *   2. coordinates + the frame's date & time  →  look up the *historical*
 *      weather for that moment.
 *
 * Data comes from Open-Meteo (free, no key, CORS): a geocoding endpoint and the
 * archive/forecast endpoints for past hourly conditions. The network calls live
 * in data/geo.ts; the pure mapping and parsing here are unit-tested.
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

// --- Forward geocoding (place name -> coordinates) --------------------------

export interface GeoPlace {
  lat: number;
  lon: number;
  place?: string;
}

export function geocodeUrl(name: string): string {
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name,
  )}&count=1&language=en&format=json`;
}

export function parseGeocode(json: unknown): GeoPlace | undefined {
  const r = (json as { results?: Record<string, unknown>[] })?.results?.[0];
  if (!r || typeof r.latitude !== "number" || typeof r.longitude !== "number") return undefined;
  const place = [r.name, r.country].filter((p): p is string => Boolean(p)).join(", ");
  return { lat: r.latitude, lon: r.longitude, place: place || undefined };
}

// --- Historical weather (coords + date/time -> conditions) ------------------

/** Whole days from `date` to `today` (positive = in the past). */
export function daysAgo(dateYMD: string, today = new Date()): number {
  const target = new Date(`${dateYMD}T12:00:00`);
  return Math.floor((today.getTime() - target.getTime()) / 86_400_000);
}

/**
 * Open-Meteo split: the archive API holds settled history (~5+ days old); the
 * forecast API covers the recent past and near future. Both return the same
 * hourly shape, so the parser doesn't care which one answered.
 */
export function historicalWeatherUrl(lat: number, lon: number, dateYMD: string, today = new Date()): string {
  const base =
    daysAgo(dateYMD, today) > 5
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast";
  return `${base}?latitude=${lat}&longitude=${lon}&start_date=${dateYMD}&end_date=${dateYMD}&hourly=weather_code,temperature_2m&timezone=auto`;
}

/**
 * Split a stored date/time into the day and an "YYYY-MM-DDTHH" hour prefix used
 * to match Open-Meteo's local hourly timestamps. Accepts a plain date, a local
 * datetime ("2026-05-01T14:30") or an ISO string; missing time defaults to noon.
 */
export function localHourPrefix(dateTime: string): { date: string; prefix: string } | undefined {
  const m = dateTime.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):\d{2})?/);
  if (!m) return undefined;
  const date = m[1];
  const hh = m[2] ?? "12";
  return { date, prefix: `${date}T${hh}` };
}

export function parseHistoricalWeather(json: unknown, hourPrefix: string): CurrentWeather | undefined {
  const h = (json as { hourly?: { time?: string[]; weather_code?: number[]; temperature_2m?: number[] } })?.hourly;
  if (!h?.time?.length || !h.weather_code) return undefined;
  let idx = h.time.findIndex((t) => t.startsWith(hourPrefix));
  if (idx < 0) idx = Math.min(12, h.time.length - 1); // fall back to midday
  const code = Number(h.weather_code[idx] ?? 0);
  const temp = h.temperature_2m?.[idx];
  const hour = Number(hourPrefix.slice(11, 13));
  const isDay = hour >= 7 && hour < 20;
  return {
    weather: wmoToWeather(code, isDay),
    code,
    temperatureC: typeof temp === "number" ? temp : undefined,
    isDay,
  };
}
