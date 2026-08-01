import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { de } from "../i18n/strings";

export type ThemeChoice = "system" | "light" | "dark";
export type Lang = "en" | "de";

export interface Prefs {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate an English source string; interpolates {name} placeholders. */
  t: (en: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<Prefs | null>(null);

function systemPrefersDark(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(choice: ThemeChoice): void {
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function detectLang(): Lang {
  const stored = localStorage.getItem("lang");
  if (stored === "de" || stored === "en") return stored;
  return (navigator.language || "").toLowerCase().startsWith("de") ? "de" : "en";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(
    () => (localStorage.getItem("theme") as ThemeChoice) || "system",
  );
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => applyTheme(theme), [theme]);

  // Follow the OS when set to "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setTheme = useCallback((t: ThemeChoice) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
  }, []);
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (en: string, vars?: Record<string, string | number>) => {
      let s = lang === "de" ? de[en] ?? en : en;
      if (vars) {
        for (const key of Object.keys(vars)) {
          s = s.replace(new RegExp(`\\{${key}\\}`, "g"), String(vars[key]));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo<Prefs>(
    () => ({ theme, setTheme, lang, setLang, t }),
    [theme, lang, setTheme, setLang, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}

export function useT(): Prefs["t"] {
  return usePrefs().t;
}
