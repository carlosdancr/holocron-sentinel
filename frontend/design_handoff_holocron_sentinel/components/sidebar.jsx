/* Sidebar */
/* global React, Icon */

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "feed", label: "Feed em tempo real", icon: "feed", liveBadge: true },
  { id: "ranking", label: "Ranking crítico", icon: "ranking" },
  { id: "form", label: "Registrar evento", icon: "form" },
];

const Sidebar = ({ current, onNav, suspendedCount, liveCount }) => {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">HS</div>
        <div className="sb-name">
          Holocron Sentinel
          <small>monitoramento</small>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-nav-section">Operação</div>
        {NAV.map((n) => {
          const active = current === n.id || (n.id === "dashboard" && current === "entity");
          return (
            <a
              key={n.id}
              className={"sb-link" + (active ? " active" : "")}
              href={"#/" + n.id}
              onClick={(e) => { e.preventDefault(); onNav(n.id); }}
            >
              <span className="sb-icon"><Icon name={n.icon} size={14} /></span>
              {n.label}
              {n.id === "feed" && (
                <span className="sb-badge">
                  <span style={{
                    display: "inline-block",
                    width: 5, height: 5, borderRadius: "50%",
                    background: "var(--success)",
                    marginRight: 4,
                    verticalAlign: "middle",
                  }} />
                  live
                </span>
              )}
              {n.id === "dashboard" && suspendedCount > 0 && (
                <span className="sb-badge">{suspendedCount}</span>
              )}
            </a>
          );
        })}

        <div className="sb-nav-section">Sistema</div>
        <a className="sb-link" href="#" onClick={(e) => e.preventDefault()} style={{ opacity: 0.6, pointerEvents: "none" }}>
          <span className="sb-icon"><Icon name="shield" size={14} /></span>
          Operadores
        </a>
        <a className="sb-link" href="#" onClick={(e) => e.preventDefault()} style={{ opacity: 0.6, pointerEvents: "none" }}>
          <span className="sb-icon"><Icon name="pulse" size={14} /></span>
          Auditoria
        </a>
      </nav>

      <div className="sb-footer">
        <div className="sb-foot-user">
          <div className="sb-foot-avatar">JK</div>
          <div className="sb-foot-text">
            J. Kael
            <small>Operador L2</small>
          </div>
        </div>
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
