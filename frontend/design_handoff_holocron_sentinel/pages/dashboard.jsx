/* Dashboard page */
/* global React, Icon, EntityAvatar, StatusBadge, ThreatMeter, formatRelative */

const DashboardPage = ({ entities, onOpenEntity, onToggleStatus, criticalLimit, onGoFeed, onGoForm }) => {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("threat");

  const kpis = React.useMemo(() => {
    const total = entities.length;
    const active = entities.filter((e) => e.status === "active").length;
    const suspended = total - active;
    const totalEvents = entities.reduce((s, e) => s + e.total_events, 0);
    const totalCritical = entities.reduce((s, e) => s + e.critical_events_count, 0);
    const nearLimit = entities.filter(
      (e) => e.status === "active" && e.critical_events_count >= criticalLimit * 0.7
    ).length;
    return { total, active, suspended, totalEvents, totalCritical, nearLimit };
  }, [entities, criticalLimit]);

  const filtered = React.useMemo(() => {
    let r = entities;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") r = r.filter((e) => e.status === statusFilter);

    const sorted = [...r];
    if (sortBy === "threat") sorted.sort((a, b) => b.critical_events_count - a.critical_events_count);
    if (sortBy === "events") sorted.sort((a, b) => b.total_events - a.total_events);
    if (sortBy === "recent") sorted.sort((a, b) => new Date(b.last_event_at) - new Date(a.last_event_at));
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [entities, search, statusFilter, sortBy]);

  const counts = React.useMemo(() => ({
    all: entities.length,
    active: entities.filter((e) => e.status === "active").length,
    suspended: entities.filter((e) => e.status === "suspended").length,
  }), [entities]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Entidades monitoradas</h1>
            <div className="page-subtitle">
              Visão geral das entidades sob vigilância contínua do Holocron Sentinel.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="live-pill">
              <span className="live-dot" />
              Sistema operacional
            </span>
            <button className="btn btn-ghost" onClick={onGoFeed}>
              <Icon name="feed" size={14} />
              Abrir feed
            </button>
            <button className="btn btn-primary" onClick={onGoForm}>
              <Icon name="form" size={14} />
              Registrar evento
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* KPI */}
        <div className="kpis">
          <div className="kpi hero">
            <div className="kpi-label">Entidades ativas</div>
            <div className="kpi-value">{kpis.active}<span style={{ fontSize: 18, opacity: 0.5 }}> / {kpis.total}</span></div>
            <div className="kpi-foot">
              <span className="delta">+2</span> nos últimos 7 dias
            </div>
            <svg className="kpi-spark" width="80" height="32" viewBox="0 0 80 32" fill="none">
              <path d="M2 24 L12 22 L22 25 L32 18 L42 20 L52 12 L62 15 L72 8" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7"/>
            </svg>
          </div>
          <div className="kpi">
            <div className="kpi-label">Suspensas</div>
            <div className="kpi-value">{kpis.suspended}</div>
            <div className="kpi-foot">
              <span style={{ color: "var(--critical)", fontWeight: 500 }}>● </span>
              limite crítico atingido
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Próximas do limite</div>
            <div className="kpi-value">{kpis.nearLimit}</div>
            <div className="kpi-foot">
              ≥ 70% do threshold ({criticalLimit})
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Eventos críticos (total)</div>
            <div className="kpi-value">{kpis.totalCritical}</div>
            <div className="kpi-foot">
              de {kpis.totalEvents.toLocaleString("pt-BR")} eventos registrados
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="card">
          <div className="filter-bar">
            <div className="search">
              <Icon name="search" size={14} />
              <input
                type="text"
                placeholder="Buscar por nome ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: "var(--text-muted)" }}>
                  <Icon name="x" size={12} />
                </button>
              )}
            </div>

            <div className="chip-group">
              {[
                ["all", "Todas", counts.all],
                ["active", "Ativas", counts.active],
                ["suspended", "Suspensas", counts.suspended],
              ].map(([id, label, n]) => (
                <button
                  key={id}
                  className={"chip" + (statusFilter === id ? " on" : "")}
                  onClick={() => setStatusFilter(id)}
                >
                  {label} <span className="chip-count">{n}</span>
                </button>
              ))}
            </div>

            <select className="select-mini" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ marginLeft: "auto" }}>
              <option value="threat">Ordenar: ameaça</option>
              <option value="events">Ordenar: total de eventos</option>
              <option value="recent">Ordenar: evento mais recente</option>
              <option value="name">Ordenar: nome</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="Nenhuma entidade encontrada"
              desc="Tente ajustar a busca ou os filtros aplicados acima."
              action={
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                  Limpar filtros
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Entidade</th>
                    <th>Status</th>
                    <th>Eventos críticos</th>
                    <th style={{ textAlign: "right" }}>Total eventos</th>
                    <th>Último evento</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="clickable" onClick={() => onOpenEntity(e.id)}>
                      <td>
                        <div className="cell-entity">
                          <EntityAvatar name={e.name} />
                          <div>
                            <div className="entity-name">{e.name}</div>
                            <div className="entity-id">{e.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><StatusBadge status={e.status} /></td>
                      <td><ThreatMeter count={e.critical_events_count} limit={criticalLimit} /></td>
                      <td className="num" style={{ textAlign: "right" }}>{e.total_events.toLocaleString("pt-BR")}</td>
                      <td className="muted" style={{ fontSize: 12.5 }}>{formatRelative(e.last_event_at)}</td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onToggleStatus(e.id)}
                          title={e.status === "active" ? "Suspender entidade" : "Reativar entidade"}
                        >
                          {e.status === "active" ? "Suspender" : "Reativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="scrim">
            {filtered.length} de {entities.length} entidades · limite crítico: {criticalLimit} eventos
          </div>
        </div>
      </div>
    </div>
  );
};

window.DashboardPage = DashboardPage;
