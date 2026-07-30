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
  { to: "/meter", icon: "📸", label: "Light meter" },
  { to: "/stats", icon: "📊", label: "Insights" },
  { to: "/print", icon: "🖨️", label: "Print booklet" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
] as const;

export function Layout() {
  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div className="logo">🎞️</div>
          <div>
            <b>Analog Metadata</b>
            <span>film log → digital scans</span>
          </div>
        </div>
        {NAV.map((item, i) =>
          "sep" in item ? (
            <div className="nav-sep" key={`sep${i}`} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
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
