/* Icons + small UI helpers */
/* global React */

const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...props}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
      );
    case "feed":
      return (
        <svg {...props}><path d="M4 11a16 16 0 0 1 16 16"/><path d="M4 4a23 23 0 0 1 23 23"/><circle cx="5" cy="26" r="1.5" fill="currentColor"/></svg>
      );
    case "form":
      return (
        <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
      );
    case "ranking":
      return (
        <svg {...props}><path d="M4 21v-7"/><path d="M12 21V9"/><path d="M20 21V3"/></svg>
      );
    case "search":
      return (
        <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      );
    case "x":
      return <svg {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
    case "check":
      return <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>;
    case "alert":
      return <svg {...props}><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m10.29 3.86-8.18 14a2 2 0 0 0 1.71 3h16.36a2 2 0 0 0 1.71-3l-8.18-14a2 2 0 0 0-3.42 0Z"/></svg>;
    case "info":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>;
    case "pause":
      return <svg {...props}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>;
    case "play":
      return <svg {...props}><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg>;
    case "sun":
      return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/></svg>;
    case "moon":
      return <svg {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case "chevron-right":
      return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-down":
      return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "filter":
      return <svg {...props}><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>;
    case "send":
      return <svg {...props}><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>;
    case "lightning":
      return <svg {...props}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case "shield":
      return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "planet":
      return <svg {...props}><circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-25 12 12)"/></svg>;
    case "base":
      return <svg {...props}><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M10 21v-6h4v6"/></svg>;
    case "ship":
      return <svg {...props}><path d="M12 2 4 14l8 4 8-4-8-12z"/><path d="m4 14 8 8 8-8"/></svg>;
    case "outpost":
      return <svg {...props}><path d="M12 3 4 9l8 5 8-5-8-6z"/><path d="M4 15l8 5 8-5"/></svg>;
    case "external":
      return <svg {...props}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>;
    case "more":
      return <svg {...props}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>;
    case "refresh":
      return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "pulse":
      return <svg {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
    case "user":
      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "back":
      return <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
    case "pause-stream":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>;
    case "trash":
      return <svg {...props}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m6 6 1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>;
    case "copy":
      return <svg {...props}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "circle-dot":
      return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>;
    default:
      return null;
  }
};

const KindIcon = ({ size = 14 }) => <Icon name="circle-dot" size={size} />;

// Generic avatar — initials from entity name (frontend-only display helper)
const EntityAvatar = ({ name, size = 28 }) => {
  const parts = (name || "?").trim().split(/\s+/);
  const initials = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  return (
    <div
      className="entity-avatar"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.25),
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        letterSpacing: "-0.02em",
        textTransform: "uppercase",
      }}
    >
      {initials.slice(0, 2)}
    </div>
  );
};

// Badges
const StatusBadge = ({ status }) => {
  if (status === "active") {
    return (
      <span className="badge badge-active">
        <span className="badge-dot" /> Ativa
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="badge badge-suspended">
        <span className="badge-dot" /> Suspensa
      </span>
    );
  }
  return null;
};

const TypeBadge = ({ type }) => {
  const map = {
    info: { label: "info", cls: "badge-info" },
    warning: { label: "warning", cls: "badge-warning" },
    critical: { label: "critical", cls: "badge-suspended" },
  };
  const m = map[type] || map.info;
  return (
    <span className={`badge ${m.cls}`}>
      <span className="badge-dot" /> {m.label}
    </span>
  );
};

// Threat meter
const ThreatMeter = ({ count, limit = 10 }) => {
  const pct = Math.min(100, (count / limit) * 100);
  let cls = "";
  if (count >= limit) cls = "crit";
  else if (count >= limit * 0.7) cls = "warn";
  else if (count >= limit * 0.5) cls = "warn";
  return (
    <span className="meter">
      <span className={`meter-bar ${cls}`}>
        <span style={{ width: pct + "%" }} />
      </span>
      <span className="meter-val">{count}<span style={{ opacity: 0.4 }}>/{limit}</span></span>
    </span>
  );
};

// Time formatting
function formatRelative(iso) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "agora";
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// JSON syntax highlight
function highlightJson(obj) {
  const json = JSON.stringify(obj, null, 2);
  return json
    .replace(/("[\w_]+")(\s*:)/g, '<span class="k">$1</span>$2')
    .replace(/: (".*?")/g, ': <span class="s">$1</span>')
    .replace(/: (\d+(\.\d+)?)/g, ': <span class="n">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="b">$1</span>');
}

const JsonView = ({ data }) => (
  <pre
    className="json-block"
    dangerouslySetInnerHTML={{ __html: highlightJson(data) }}
  />
);

// Toasts (very simple context-free implementation)
function useToasts() {
  const [items, setItems] = React.useState([]);
  const push = React.useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((cur) => [...cur, { ...t, id }]);
    setTimeout(() => {
      setItems((cur) => cur.filter((x) => x.id !== id));
    }, 4200);
  }, []);
  const node = (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind || "info"}`}>
          <span className="toast-icon">
            <Icon
              name={
                t.kind === "success" ? "check" :
                t.kind === "error" ? "x" :
                t.kind === "warning" ? "alert" :
                "info"
              }
              size={13}
            />
          </span>
          <div>
            <div className="toast-title">{t.title}</div>
            {t.desc && <div className="toast-desc">{t.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
  return [node, push];
}

// Empty state
const EmptyState = ({ icon = "info", title, desc, action }) => (
  <div className="empty">
    <div className="empty-icon"><Icon name={icon} size={24} /></div>
    <div className="empty-title">{title}</div>
    <div className="empty-desc">{desc}</div>
    {action}
  </div>
);

Object.assign(window, {
  Icon, KindIcon, EntityAvatar, StatusBadge, TypeBadge, ThreatMeter,
  formatRelative, formatTime, formatDateTime,
  JsonView, useToasts, EmptyState,
});
