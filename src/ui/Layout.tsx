import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", icon: "🎞️", label: "Overview", end: true },
  { to: "/search", icon: "🔍", label: "Search" },
  { sep: true },
  { to: "/rolls", icon: "🎬", label: "Film rolls" },
  { to: "/cameras", icon: "📷", label: "Cameras" },
  { to: "/lenses", icon: "🔭", label: "Lenses" },
  { to: "/films", icon: "🎞", label: "Film stocks" },
  { sep: true },
  { to: "/stats", icon: "📊", label: "Insights" },
  { to: "/pair", icon: "🔗", label: "Pair devices" },
  { to: "/print", icon: "🖨️", label: "Print booklet" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
] as const;

export function Layout() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const brand = (
    <div className="brand">
      <div className="logo">🎞️</div>
      <div>
        <b>Analog Metadata</b>
        <span>film log → digital scans</span>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* Mobile top bar */}
      <header className="topbar">
        <button className="menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
          ☰
        </button>
        <div className="topbar-brand">
          <span className="logo sm">🎞️</span>
          <b>Analog Metadata</b>
        </div>
      </header>

      {open && <div className="drawer-backdrop" onClick={close} />}

      <nav className={`sidebar${open ? " open" : ""}`}>
        {brand}
        {NAV.map((item, i) =>
          "sep" in item ? (
            <div className="nav-sep" key={`sep${i}`} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              onClick={close}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="ico">{item.icon}</span>
              <span className="lbl">{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
