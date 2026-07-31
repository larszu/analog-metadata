import { describe, expect, it } from "vitest";
import {
  openMeteoUrl,
  parseOpenMeteo,
  parseReverseGeocode,
  reverseGeocodeUrl,
  wmoToWeather,
} from "./weather";

describe("wmoToWeather", () => {
  it("maps clear/cloud/rain/snow/fog codes", () => {
    expect(wmoToWeather(0, true)).toBe("sunny");
    expect(wmoToWeather(2)).toBe("partly-cloudy");
    expect(wmoToWeather(3)).toBe("overcast");
    expect(wmoToWeather(45)).toBe("fog");
    expect(wmoToWeather(61)).toBe("rain");
    expect(wmoToWeather(80)).toBe("rain");
    expect(wmoToWeather(95)).toBe("rain");
    expect(wmoToWeather(73)).toBe("snow");
    expect(wmoToWeather(86)).toBe("snow");
  });
  it("returns night for clear skies at night", () => {
    expect(wmoToWeather(0, false)).toBe("night");
    expect(wmoToWeather(1, false)).toBe("night");
  });
});

describe("parseOpenMeteo", () => {
  it("reads the current block", () => {
    const r = parseOpenMeteo({ current: { weather_code: 3, is_day: 1, temperature_2m: 14.2 } });
    expect(r.weather).toBe("overcast");
    expect(r.code).toBe(3);
    expect(r.temperatureC).toBe(14.2);
    expect(r.isDay).toBe(true);
  });
  it("defaults gracefully on empty input", () => {
    const r = parseOpenMeteo({});
    expect(r.code).toBe(0);
    expect(r.temperatureC).toBeUndefined();
  });
});

describe("parseReverseGeocode", () => {
  it("builds a place label", () => {
    expect(parseReverseGeocode({ city: "Hamburg", countryName: "Germany" })).toBe("Hamburg, Germany");
  });
  it("falls back to locality then subdivision", () => {
    expect(parseReverseGeocode({ locality: "Altona", countryName: "Germany" })).toBe("Altona, Germany");
    expect(parseReverseGeocode({})).toBeUndefined();
  });
});

describe("url builders", () => {
  it("include the coordinates", () => {
    expect(openMeteoUrl(53.5, 9.9)).toContain("latitude=53.5");
    expect(reverseGeocodeUrl(53.5, 9.9)).toContain("longitude=9.9");
  });
});
