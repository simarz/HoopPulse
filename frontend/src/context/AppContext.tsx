import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyTeamPalette, TEAM_PALETTES } from "../lib/teams";

export type Scope = "League" | "My Team";

const DEFAULT_TEAM = "NYK";

interface AppContextValue {
  query: string;
  setQuery: (q: string) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  myTeam: string;
  setMyTeam: (abbr: string) => void;
  dark: boolean;
  toggleDark: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readStoredTeam(): string {
  if (typeof window === "undefined") return DEFAULT_TEAM;
  const stored = localStorage.getItem("hp.myTeam");
  return stored && TEAM_PALETTES[stored] ? stored : DEFAULT_TEAM;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [scope, setScopeState] = useState<Scope>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("hp.scope") : null;
    return stored === "My Team" ? "My Team" : "League";
  });
  const [myTeam, setMyTeamState] = useState<string>(readStoredTeam);
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("hp.dark");
    return stored === "1";
  });

  const setScope = useCallback((s: Scope) => {
    setScopeState(s);
    try { localStorage.setItem("hp.scope", s); } catch { /* ignore */ }
  }, []);

  const setMyTeam = useCallback((abbr: string) => {
    if (!TEAM_PALETTES[abbr]) return;
    setMyTeamState(abbr);
    try { localStorage.setItem("hp.myTeam", abbr); } catch { /* ignore */ }
  }, []);

  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d;
      document.body.classList.toggle("dark", next);
      try { localStorage.setItem("hp.dark", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Re-skin the app whenever the favorite team changes.
  useEffect(() => {
    applyTeamPalette(myTeam);
  }, [myTeam]);

  // Restore dark mode class on mount.
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(".search input");
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ query, setQuery, scope, setScope, myTeam, setMyTeam, dark, toggleDark }),
    [query, scope, setScope, myTeam, setMyTeam, dark, toggleDark],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
