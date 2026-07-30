import type {
  DevelopmentProcess,
  FilmFormat,
  FilmType,
  Weather,
} from "./types";

/** Full-stop f-numbers plus common half/third markings found on lenses. */
export const APERTURE_SCALE = [
  "1.0", "1.2", "1.4", "1.7", "2", "2.4", "2.8", "3.5",
  "4", "4.8", "5.6", "6.7", "8", "9.5", "11", "13",
  "16", "19", "22", "27", "32", "45", "64",
];

/** Common shutter speeds as written on dials. "B" = bulb, "T" = time. */
export const SHUTTER_SPEEDS = [
  "B", "T", "30", "15", "8", "4", "2", "1",
  "1/2", "1/4", "1/8", "1/15", "1/30", "1/60", "1/125",
  "1/250", "1/500", "1/1000", "1/2000", "1/4000", "1/8000",
];

export const FILM_FORMATS: { value: FilmFormat; label: string }[] = [
  { value: "135", label: "135 (35 mm)" },
  { value: "120", label: "120 (medium format)" },
  { value: "220", label: "220 (medium format)" },
  { value: "110", label: "110" },
  { value: "4x5", label: "4×5 sheet" },
  { value: "8x10", label: "8×10 sheet" },
  { value: "other", label: "Other" },
];

export const FILM_TYPES: { value: FilmType; label: string }[] = [
  { value: "color-negative", label: "Colour negative" },
  { value: "color-slide", label: "Colour slide (E-6)" },
  { value: "black-and-white", label: "Black & white" },
  { value: "other", label: "Other" },
];

export const DEV_PROCESSES: { value: DevelopmentProcess; label: string }[] = [
  { value: "C-41", label: "C-41" },
  { value: "E-6", label: "E-6" },
  { value: "BW", label: "Black & white" },
  { value: "ECN-2", label: "ECN-2" },
  { value: "other", label: "Other" },
];

export const WEATHER_OPTIONS: { value: Weather; label: string; icon: string }[] = [
  { value: "sunny", label: "Sunny", icon: "☀️" },
  { value: "partly-cloudy", label: "Partly cloudy", icon: "⛅" },
  { value: "overcast", label: "Overcast", icon: "☁️" },
  { value: "rain", label: "Rain", icon: "🌧️" },
  { value: "snow", label: "Snow", icon: "❄️" },
  { value: "fog", label: "Fog", icon: "🌫️" },
  { value: "golden-hour", label: "Golden hour", icon: "🌅" },
  { value: "blue-hour", label: "Blue hour", icon: "🌆" },
  { value: "night", label: "Night", icon: "🌙" },
  { value: "indoor", label: "Indoor", icon: "🏠" },
  { value: "flash", label: "Flash", icon: "⚡" },
];

/** A curated library of popular film stocks, offered as one-tap presets. */
export const FILM_STOCK_PRESETS: {
  brand: string;
  name: string;
  iso: number;
  type: FilmType;
  process: DevelopmentProcess;
}[] = [
  // Kodak — colour negative
  { brand: "Kodak", name: "Portra 400", iso: 400, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "Portra 160", iso: 160, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "Portra 800", iso: 800, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "Gold 200", iso: 200, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "ColorPlus 200", iso: 200, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "UltraMax 400", iso: 400, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "Ektar 100", iso: 100, type: "color-negative", process: "C-41" },
  { brand: "Kodak", name: "Pro Image 100", iso: 100, type: "color-negative", process: "C-41" },
  // Kodak — B&W
  { brand: "Kodak", name: "Tri-X 400", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Kodak", name: "T-Max 100", iso: 100, type: "black-and-white", process: "BW" },
  { brand: "Kodak", name: "T-Max 400", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Kodak", name: "T-Max P3200", iso: 3200, type: "black-and-white", process: "BW" },
  // Kodak — slide
  { brand: "Kodak", name: "Ektachrome E100", iso: 100, type: "color-slide", process: "E-6" },
  // Ilford — B&W
  { brand: "Ilford", name: "HP5 Plus", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Ilford", name: "FP4 Plus", iso: 125, type: "black-and-white", process: "BW" },
  { brand: "Ilford", name: "Delta 100", iso: 100, type: "black-and-white", process: "BW" },
  { brand: "Ilford", name: "Delta 400", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Ilford", name: "Delta 3200", iso: 3200, type: "black-and-white", process: "BW" },
  { brand: "Ilford", name: "XP2 Super 400", iso: 400, type: "black-and-white", process: "C-41" },
  { brand: "Ilford", name: "Pan F Plus 50", iso: 50, type: "black-and-white", process: "BW" },
  { brand: "Ilford", name: "SFX 200", iso: 200, type: "black-and-white", process: "BW" },
  // Fujifilm
  { brand: "Fujifilm", name: "Superia X-TRA 400", iso: 400, type: "color-negative", process: "C-41" },
  { brand: "Fujifilm", name: "Superia 200", iso: 200, type: "color-negative", process: "C-41" },
  { brand: "Fujifilm", name: "C200", iso: 200, type: "color-negative", process: "C-41" },
  { brand: "Fujifilm", name: "Pro 400H", iso: 400, type: "color-negative", process: "C-41" },
  { brand: "Fujifilm", name: "Velvia 50", iso: 50, type: "color-slide", process: "E-6" },
  { brand: "Fujifilm", name: "Velvia 100", iso: 100, type: "color-slide", process: "E-6" },
  { brand: "Fujifilm", name: "Provia 100F", iso: 100, type: "color-slide", process: "E-6" },
  { brand: "Fujifilm", name: "Acros II 100", iso: 100, type: "black-and-white", process: "BW" },
  // Cinestill
  { brand: "Cinestill", name: "800T", iso: 800, type: "color-negative", process: "C-41" },
  { brand: "Cinestill", name: "400D", iso: 400, type: "color-negative", process: "C-41" },
  { brand: "Cinestill", name: "50D", iso: 50, type: "color-negative", process: "C-41" },
  { brand: "Cinestill", name: "BwXX", iso: 250, type: "black-and-white", process: "BW" },
  // Lomography
  { brand: "Lomography", name: "Color Negative 400", iso: 400, type: "color-negative", process: "C-41" },
  { brand: "Lomography", name: "Color Negative 800", iso: 800, type: "color-negative", process: "C-41" },
  { brand: "Lomography", name: "Lady Grey 400", iso: 400, type: "black-and-white", process: "BW" },
  // Others
  { brand: "Kentmere", name: "Pan 100", iso: 100, type: "black-and-white", process: "BW" },
  { brand: "Kentmere", name: "Pan 400", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Rollei", name: "Retro 400S", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Rollei", name: "Infrared 400", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Foma", name: "Fomapan 100", iso: 100, type: "black-and-white", process: "BW" },
  { brand: "Foma", name: "Fomapan 400", iso: 400, type: "black-and-white", process: "BW" },
  { brand: "Adox", name: "CHS 100 II", iso: 100, type: "black-and-white", process: "BW" },
  { brand: "Agfa", name: "APX 100", iso: 100, type: "black-and-white", process: "BW" },
  { brand: "Agfa", name: "Vista Plus 200", iso: 200, type: "color-negative", process: "C-41" },
];
