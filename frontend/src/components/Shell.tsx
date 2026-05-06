import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import HeroStrip from "./HeroStrip";

export default function Shell() {
  const location = useLocation();
  const showHero = location.pathname === "/players" || location.pathname === "/";

  return (
    <div className="app">
      <Header />
      {showHero && <HeroStrip />}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
