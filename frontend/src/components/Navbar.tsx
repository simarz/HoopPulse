import { NavLink } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">NBA Stats</span>
      <div className="navbar-links">
        <NavLink to="/players" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Players
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Teams
        </NavLink>
        <NavLink to="/live" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Live
        </NavLink>
        <NavLink to="/props" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Props
        </NavLink>
      </div>
    </nav>
  );
}
