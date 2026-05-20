/* Entity detail page */
/* global React, Icon, EntityAvatar, StatusBadge, ThreatMeter, TypeBadge, JsonView, formatRelative, formatDateTime, formatTime */

function HourlyChart({ hourly }) {
  const [hover, setHover] = React.useState(null); // { idx, leftPx }
  const wrapRef = React.useRef(null);
  const lineRef = React.useRef(null);
  const areaRef = React.useRef(null);

  const peak = Math.max(1, ...hourly.map((b) => b.total));
  const totalLast24h = hourly.reduce((s, b) => s + b.total, 0);
  const infoLast24h = hourly.reduce((s, b) => s + b.info, 0);
  const warnLast24h = hourly.reduce((s, b) => s + b.warning, 0);
  const critLast24h = hourly.reduce((s, b) => s + b.critical, 0);

  const VBW = 600, VBH = 220;
  const padX = 8, padTop = 44, padBot = 14;
  const n = hourly.length;
  const xStep = (VBW - padX * 2) / (n - 1);
  const yScale = (v) => padTop + (1 - v / (peak * 1.4)) * (VBH - padTop - padBot);
  const pts = hourly.map((b, i) => ({ x: padX + i * xStep, y: yScale(b.total) }));

  let linePath = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    // Lower tension (/8 instead of /6) → less Bezier overshoot at peaks
    const cp1x = p1.x + (p2.x - p0.x) / 8;
    const cp1y = p1.y + (p2.y - p0.y) / 8;
    const cp2x = p2.x - (p3.x - p1.x) / 8;
    const cp2y = p2.y - (p3.y - p1.y) / 8;
    linePath += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${VBH - padBot} L ${pts[0].x},${VBH - padBot} Z`;

  // Mount-only animation: draw-on the line + fade-in the area.
  // Subsequent live updates to `hourly` will not restart this.
  React.useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    if (!line || !area) return;
    const len = line.getTotalLength();
    line.style.strokeDasharray = `${len}px`;
    line.style.strokeDashoffset = `${len}px`;
    area.style.opacity = "0";
    // force a reflow so the transition kicks in
    void line.getBoundingClientRect();
    line.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.22, 0.61, 0.36, 1)";
    area.style.transition = "opacity 1.3s ease-out 0.15s";
    line.style.strokeDashoffset = "0px";
    area.style.opacity = "1";
    const t = setTimeout(() => {
      // clean up so re-renders due to live data don't conflict
      if (line) {
        line.style.transition = "";
        line.style.strokeDasharray = "none";
        line.style.strokeDashoffset = "";
      }
      if (area) {
        area.style.transition = "";
      }
    }, 1600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMove(e) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const xRel = (e.clientX - rect.left) / rect.width;
    const xVB = xRel * VBW;
    const idx = Math.round((xVB - padX) / xStep);
    const clamped = Math.max(0, Math.min(n - 1, idx));
    const bucketX = padX + clamped * xStep; // viewBox x
    const leftPx = (bucketX / VBW) * rect.width;
    setHover({ idx: clamped, leftPx });
  }

  const hoverBucket = hover ? hourly[hover.idx] : null;
  const hoverPt = hover ? pts[hover.idx] : null;
  // Map viewBox y to pixel y for the dot
  const dotTopPct = hoverPt ? (hoverPt.y / VBH) * 100 : 0;

  const hoursAgo = hover ? (n - 1 - hover.idx) : 0;
  const hoverLabel = hover
    ? hoursAgo === 0
      ? "última hora"
      : `há ${hoursAgo}h`
    : "";

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Atividade (últimas 24h)</div>
          <div className="card-subtitle">Volume total de eventos por hora.</div>
        </div>
        <div className="chart-stats">
          <div>
            <div className="chart-stat-label">Total</div>
            <div className="chart-stat-value">{totalLast24h}</div>
          </div>
          <div>
            <div className="chart-stat-label">Pico/h</div>
            <div className="chart-stat-value">{peak}</div>
          </div>
          <div>
            <div className="chart-stat-label">Warning</div>
            <div className="chart-stat-value warn">{warnLast24h}</div>
          </div>
          <div>
            <div className="chart-stat-label">Critical</div>
            <div className="chart-stat-value crit">{critLast24h}</div>
          </div>
        </div>
      </div>
      <div
        className="chart-canvas"
        ref={wrapRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FAE231" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#FAE231" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FAE231" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* subtle horizontal grid */}
          <g className="chart-grid">
            {[0.25, 0.5, 0.75].map((p) => (
              <line key={p} x1={padX} x2={VBW - padX} y1={padTop + p * (VBH - padTop - padBot)} y2={padTop + p * (VBH - padTop - padBot)} />
            ))}
          </g>

          <path ref={areaRef} className="chart-area" d={areaPath} fill="url(#chart-fill)" />
          <path
            ref={lineRef}
            className="chart-line"
            d={linePath}
            fill="none"
            stroke="#FAE231"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {hover && (
            <g>
              <line
                className="chart-guide"
                x1={padX + hover.idx * xStep}
                x2={padX + hover.idx * xStep}
                y1={padTop}
                y2={VBH - padBot}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {hover && hoverBucket && (
          <div
            className="chart-tooltip"
            style={{
              left: hover.leftPx,
              top: `${dotTopPct}%`,
            }}
          >
            <div className="chart-tooltip-time">{hoverLabel}</div>
            <div className="chart-tooltip-row">
              <span className="lbl">Total</span>
              <b>{hoverBucket.total}</b>
            </div>
            <div className="chart-tooltip-row">
              <span className="lbl">Info</span>
              <b>{hoverBucket.info}</b>
            </div>
            <div className="chart-tooltip-row">
              <span className="lbl warn">Warning</span>
              <b>{hoverBucket.warning}</b>
            </div>
            <div className="chart-tooltip-row">
              <span className="lbl crit">Critical</span>
              <b>{hoverBucket.critical}</b>
            </div>
          </div>
        )}
      </div>
      <div className="chart-axis">
        <span>-24h</span>
        <span>-18h</span>
        <span>-12h</span>
        <span>-6h</span>
        <span>agora</span>
      </div>
    </div>
  );
}

const EntityDetailPage = ({ entity, events, criticalLimit, onBack, onToggleStatus, onGoForm }) => {
  const [expanded, setExpanded] = React.useState(null);

  if (!entity) {
    return (
      <div className="page">
        <div className="page-body">
          <EmptyState
            icon="alert"
            title="Entidade não encontrada"
            desc="O ID solicitado não existe ou foi removido do registro."
            action={<button className="btn btn-ghost btn-sm" onClick={onBack}>Voltar ao dashboard</button>}
          />
        </div>
      </div>
    );
  }

  const entityEvents = events.filter((ev) => ev.entity_id === entity.id);
  const last24h = entityEvents.filter((ev) => Date.now() - new Date(ev.created_at).getTime() < 24 * 3600 * 1000);
  const last24hCrit = last24h.filter((ev) => ev.type === "critical").length;
  const last24hWarn = last24h.filter((ev) => ev.type === "warning").length;

  // Hourly distribution for last 24h
  const hourly = React.useMemo(() => {
    const buckets = Array(24).fill(0).map(() => ({ info: 0, warning: 0, critical: 0, total: 0 }));
    const now = Date.now();
    entityEvents.forEach((ev) => {
      const t = new Date(ev.created_at).getTime();
      const hoursAgo = Math.floor((now - t) / 3600000);
      if (hoursAgo >= 0 && hoursAgo < 24) {
        const idx = 23 - hoursAgo;
        buckets[idx][ev.type]++;
        buckets[idx].total++;
      }
    });
    return buckets;
  }, [entityEvents]);

  const maxBucket = Math.max(1, ...hourly.map((b) => b.total));

  const isSuspended = entity.status === "suspended";
  const isNearLimit = !isSuspended && entity.critical_events_count >= criticalLimit * 0.7;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Dashboard</a>
          <span className="sep">/</span>
          <span>{entity.name}</span>
        </div>
        <div className="page-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onBack}
              title="Voltar"
            >
              <Icon name="back" size={14} />
            </button>
            <EntityAvatar name={entity.name} size={44} />
            <div>
              <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {entity.name}
                <StatusBadge status={entity.status} />
              </h1>
              <div className="page-subtitle">
                <span style={{ fontFamily: "var(--font-mono)" }}>{entity.id}</span>
                <span style={{ margin: "0 8px", color: "var(--text-faint)" }}>·</span>
                criada em {formatDateTime(entity.created_at)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={"btn " + (isSuspended ? "btn-primary" : "btn-danger")}
              onClick={() => onToggleStatus(entity.id)}
            >
              {isSuspended ? "Reativar entidade" : "Suspender"}
            </button>
            <button className="btn btn-solid" onClick={() => onGoForm(entity.id)} disabled={isSuspended}>
              <Icon name="form" size={14} />
              Registrar evento
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Alerts */}
        {isSuspended && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            <span className="alert-icon"><Icon name="x" size={12} /></span>
            <div>
              <div className="alert-title">Entidade suspensa</div>
              <div className="alert-desc">
                Limite de {criticalLimit} eventos críticos foi atingido em {formatDateTime(entity.updated_at)}. Novos eventos serão rejeitados até reativação manual.
              </div>
            </div>
          </div>
        )}
        {isNearLimit && (
          <div className="alert alert-warning" style={{ marginBottom: 18 }}>
            <span className="alert-icon"><Icon name="alert" size={12} /></span>
            <div>
              <div className="alert-title">Próxima do limite crítico</div>
              <div className="alert-desc">
                {entity.critical_events_count} de {criticalLimit} eventos críticos. A próxima ocorrência crítica pode acionar a suspensão automática.
              </div>
            </div>
          </div>
        )}

        <div className="detail-grid">
          <div>
            {/* Summary cards */}
            <div className="detail-summary">
              <div className="kpi">
                <div className="kpi-label">Eventos totais</div>
                <div className="kpi-value">{entity.total_events.toLocaleString("pt-BR")}</div>
                <div className="kpi-foot">desde {formatDateTime(entity.created_at).split(",")[0]}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Eventos críticos</div>
                <div className="kpi-value" style={{ color: isSuspended ? "var(--critical)" : isNearLimit ? "var(--warning)" : "var(--text)" }}>
                  {entity.critical_events_count}
                  <span style={{ fontSize: 18, opacity: 0.5 }}> / {criticalLimit}</span>
                </div>
                <div className="kpi-foot">
                  <span style={{ display: "inline-block", width: "100%", maxWidth: 120 }}>
                    <ThreatMeter count={entity.critical_events_count} limit={criticalLimit} />
                  </span>
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Últimas 24h</div>
                <div className="kpi-value">{last24h.length}</div>
                <div className="kpi-foot" style={{ display: "flex", gap: 12 }}>
                  <span><b style={{ color: "var(--critical)" }}>{last24hCrit}</b> crit</span>
                  <span><b style={{ color: "var(--warning)" }}>{last24hWarn}</b> warn</span>
                </div>
              </div>
            </div>

            {/* Hourly chart — light, primary color, animated, hoverable */}
            <HourlyChart hourly={hourly} />

            {/* Event history */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Histórico de eventos</div>
                  <div className="card-subtitle">{entityEvents.length} eventos registrados para esta entidade.</div>
                </div>
                <button className="btn btn-ghost btn-sm">
                  <Icon name="external" size={12} /> Exportar
                </button>
              </div>
              {entityEvents.length === 0 ? (
                <EmptyState
                  icon="pulse"
                  title="Nenhum evento registrado"
                  desc="Esta entidade ainda não recebeu nenhum evento desde sua criação."
                />
              ) : (
                <div className="event-list">
                  {entityEvents.slice(0, 12).map((ev) => (
                    <div key={ev.id}>
                      <div
                        className="feed-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                      >
                        <span className="feed-time">{formatTime(ev.created_at)}</span>
                        <span className={"feed-icon " + ev.type}>
                          <Icon name={ev.type === "critical" ? "alert" : ev.type === "warning" ? "alert" : "info"} size={12} />
                        </span>
                        <div className="feed-body">
                          <div className="feed-title">
                            Evento <span style={{ textTransform: "capitalize" }}>{ev.type}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-faint)", fontWeight: 400, marginLeft: 8 }}>
                              {ev.id}
                            </span>
                          </div>
                          <div className="feed-meta">
                            <TypeBadge type={ev.type} />
                            <code>{ev.external_id}</code>
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm btn-icon">
                          <Icon name={expanded === ev.id ? "chevron-down" : "chevron-right"} size={12} />
                        </button>
                      </div>
                      {expanded === ev.id && (
                        <div style={{ padding: "0 18px 16px 130px" }}>
                          <JsonView data={ev.payload} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {entityEvents.length > 12 && (
                <div className="scrim">Exibindo 12 de {entityEvents.length} eventos</div>
              )}
            </div>
          </div>

          {/* Sidebar info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 100 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Identificação</div>
              </div>
              <div className="card-body" style={{ padding: "8px 18px" }}>
                <ul className="info-list">
                  <li><span className="info-key">ID</span><span className="info-val">{entity.id}</span></li>
                  <li><span className="info-key">Status</span><span><StatusBadge status={entity.status} /></span></li>
                  <li><span className="info-key">Eventos críticos</span><span className="info-val">{entity.critical_events_count} / {criticalLimit}</span></li>
                  <li><span className="info-key">Criada em</span><span className="info-val">{formatDateTime(entity.created_at)}</span></li>
                  <li><span className="info-key">Atualizada em</span><span className="info-val">{formatDateTime(entity.updated_at)}</span></li>
                  <li><span className="info-key">Último evento</span><span className="info-val">{formatRelative(entity.last_event_at)}</span></li>
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Política de suspensão</div>
              </div>
              <div className="card-body">
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  Esta entidade será automaticamente suspensa ao atingir <b style={{ color: "var(--text)" }}>{criticalLimit} eventos críticos</b>. Eventos rejeitados retornarão <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>409 Conflict</code> ao cliente.
                </div>
                <div className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-muted)" }}>Progresso</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                    {entity.critical_events_count}/{criticalLimit}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ThreatMeter count={entity.critical_events_count} limit={criticalLimit} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.EntityDetailPage = EntityDetailPage;
