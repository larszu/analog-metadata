/**
 * Runtime geocoding + historical weather (network calls to free Open-Meteo
 * services). The parsing/mapping lives in core/weather.ts and is unit-tested.
 *
 * These describe the *photo's* place and time — which the user supplies — not
 * the device's current position. An analog frame has no GPS or timestamp.
 */
import {
  geocodeUrl,
  historicalWeatherUrl,
  localHourPrefix,
  parseGeocode,
  parseHistoricalWeather,
  type CurrentWeather,
  type GeoPlace,
} from "../core/weather";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Turn a typed place name into coordinates + a tidy label. */
export async function geocodePlace(name: string): Promise<GeoPlace> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Type a place name first");
  const place = parseGeocode(await fetchJson(geocodeUrl(trimmed)));
  if (!place) throw new Error(`Couldn't find “${trimmed}”`);
  return place;
}

/** Look up the weather that was actually happening at a place, date and time. */
export async function lookupHistoricalWeather(
  lat: number,
  lon: number,
  dateTaken: string,
): Promise<CurrentWeather> {
  const hp = localHourPrefix(dateTaken);
  if (!hp) throw new Error("Set the frame's date & time first");
  const json = await fetchJson(historicalWeatherUrl(lat, lon, hp.date));
  const weather = parseHistoricalWeather(json, hp.prefix);
  if (!weather) throw new Error("No weather data for that date and place");
  return weather;
}
