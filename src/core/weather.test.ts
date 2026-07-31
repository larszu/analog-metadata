import { describe, expect, it } from "vitest";
import {
  daysAgo,
  geocodeUrl,
  historicalWeatherUrl,
  localHourPrefix,
  parseGeocode,
  parseHistoricalWeather,
  wmoToWeather,
} from "./weather";

describe("wmoToWeather", () => {
  it("maps clear/cloud/rain/snow/fog codes", () => {
    expect(wmoToWeather(0, true)).toBe("sunny");
    expect(wmoToWeather(2)).toBe("partly-cloudy");
    expect(wmoToWeather(3)).toBe("overcast");
    expect(wmoToWeather(45)).toBe("fog");
    expect(wmoToWeather(61)).toBe("rain");
    expect(wmoToWeather(95)).toBe("rain");
    expect(wmoToWeather(73)).toBe("snow");
  });
  it("returns night for clear skies at night", () => {
    expect(wmoToWeather(0, false)).toBe("night");
  });
});

describe("forward geocoding", () => {
  it("builds a query url", () => {
    expect(geocodeUrl("Hamburg, Speicherstadt")).toContain("name=Hamburg%2C%20Speicherstadt");
  });
  it("parses the first result", () => {
    const g = parseGeocode({ results: [{ name: "Hamburg", country: "Germany", latitude: 53.55, longitude: 9.99 }] });
    expect(g).toEqual({ lat: 53.55, lon: 9.99, place: "Hamburg, Germany" });
  });
  it("returns undefined when there are no results", () => {
    expect(parseGeocode({ results: [] })).toBeUndefined();
    expect(parseGeocode({})).toBeUndefined();
  });
});

describe("localHourPrefix", () => {
  it("splits a local datetime", () => {
    expect(localHourPrefix("2026-05-01T14:30")).toEqual({ date: "2026-05-01", prefix: "2026-05-01T14" });
  });
  it("defaults the hour to noon for a bare date", () => {
    expect(localHourPrefix("2026-05-01")).toEqual({ date: "2026-05-01", prefix: "2026-05-01T12" });
  });
  it("rejects junk", () => {
    expect(localHourPrefix("nope")).toBeUndefined();
  });
});

describe("historicalWeatherUrl", () => {
  const today = new Date("2026-07-31T12:00:00Z");
  it("uses the archive API for old dates", () => {
    expect(historicalWeatherUrl(53.5, 9.9, "2026-05-01", today)).toContain("archive-api.open-meteo.com");
  });
  it("uses the forecast API for recent dates", () => {
    expect(historicalWeatherUrl(53.5, 9.9, "2026-07-29", today)).toContain("api.open-meteo.com/v1/forecast");
  });
  it("passes the date range and hourly fields", () => {
    const url = historicalWeatherUrl(53.5, 9.9, "2026-05-01", today);
    expect(url).toContain("start_date=2026-05-01");
    expect(url).toContain("hourly=weather_code,temperature_2m");
  });
});

describe("daysAgo", () => {
  it("counts days into the past", () => {
    expect(daysAgo("2026-07-21", new Date("2026-07-31T12:00:00Z"))).toBe(10);
  });
});

describe("parseHistoricalWeather", () => {
  const hourly = {
    time: ["2026-05-01T12:00", "2026-05-01T13:00", "2026-05-01T14:00"],
    weather_code: [0, 3, 61],
    temperature_2m: [18, 17, 15],
  };
  it("picks the matching hour", () => {
    const w = parseHistoricalWeather({ hourly }, "2026-05-01T14")!;
    expect(w.weather).toBe("rain");
    expect(w.temperatureC).toBe(15);
  });
  it("maps midday clear sky to sunny", () => {
    const w = parseHistoricalWeather({ hourly }, "2026-05-01T12")!;
    expect(w.weather).toBe("sunny");
  });
  it("returns undefined without hourly data", () => {
    expect(parseHistoricalWeather({}, "2026-05-01T12")).toBeUndefined();
  });
});
