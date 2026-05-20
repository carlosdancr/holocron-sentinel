/* Critical ranking page */
/* global React, Icon, EntityAvatar, StatusBadge */

const RankingPage = ({ entities, onOpenEntity, criticalLimit }) => {
  const [window, setWindow] = React.useState("7d");

  // Use crit_7d for 7d window, otherwise use full critical_events_count
  const ranked = React.useMemo(() => {
    const key = window === "7d" ? "crit_7d" : "critical_events_count";
    return entities
      .filter((e) => e[key] > 0)
      .sort((a, b) => b[key] - a[key])
      .slice(0, 12);
  }, [entities, window]);

  const max = ranked[0] ? (window === "7d" ? ranked[0].crit_7d : ranked[0].critical_events_count) : 1;
  const totalCrit = ranked.reduce((s, e) => s + (window === "7d" ? e.crit_7d : e.critical_events_count), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Ranking de entidades críticas</h1>
            <div className="page-subtitle">
              Entidades com maior incidência de eventos críticos. Atualizado por agregação periódica.
            </div>
          </div>
          <div className="chip-group">
            <button className={"chip" + (window === "24h" ? " on" : "")} onClick={() => setWindow("24h")}>24h</button>
            <button className={"chip" + (window === "7d" ? " on" : "")} onClick={() => setWindow("7d")}>7 dias</button>
            <button className={"chip" + (window === "30d" ? " on" : "")} onClick={() => setWindow("30d")}>30 dias</button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="kpi hero">
            <div className="kpi-label">Entidade mais crítica</div>
            <div className="kpi-value" style={{ fontSize: 22, lineHeight: 1.2 }}>
              {ranked[0]?.name || "—"}
            </div>
            <div className="kpi-foot">
              {ranked[0] ? `${window === "7d" ? ranked[0].crit_7d : ranked[0].critical_events_count} eventos críticos` : "sem dados"}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Total no período</div>
            <div className="kpi-value">{totalCrit}</div>
            <div className="kpi-foot">eventos críticos agregados</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Entidades no ranking</div>
            <div className="kpi-value">{ranked.length}</div>
            <div className="kpi-foot">com ≥ 1 evento crítico no período</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top 12 — janela {window === "7d" ? "7 dias" : window === "24h" ? "24 horas" : "30 dias"}</div>
              <div className="card-subtitle">
                Endpoint: <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4 }}>GET /entities/ranking?window={window}</code>
              </div>
            </div>
            <div className="live-pill">
              <span className="live-dot" />
              atualizado há 38s
            </div>
          </div>

          {ranked.length === 0 ? (
            <EmptyState
              icon="shield"
              title="Sem eventos críticos no período"
              desc="Nenhuma entidade registrou eventos críticos na janela selecionada. Boa notícia."
            />
          ) : (
            <div>
              {ranked.map((e, i) => {
                const val = window === "7d" ? e.crit_7d : e.critical_events_count;
                const pct = (val / max) * 100;
                return (
                  <div
                    key={e.id}
                    className={"rank-row " + (i === 0 ? "top-1" : i === 1 ? "top-2" : i === 2 ? "top-3" : "")}
                    style={{ cursor: "pointer" }}
                    onClick={() => onOpenEntity(e.id)}
                  >
                    <div className="rank-pos">{i + 1}</div>
                    <div>
                      <div className="cell-entity">
                        <EntityAvatar name={e.name} />
                        <div>
                          <div className="entity-name">{e.name}</div>
                          <div className="entity-id">{e.id}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="rank-bar">
                      <span style={{ width: pct + "%" }} />
                    </div>
                    <div className="rank-stats">
                      <b>{val}</b>
                      <span style={{ opacity: 0.5 }}> evt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="scrim">
            Janela: {window === "7d" ? "últimos 7 dias" : window === "24h" ? "últimas 24h" : "últimos 30 dias"} · ordem decrescente por eventos críticos · agregação cacheada (TTL 30s)
          </div>
        </div>
      </div>
    </div>
  );
};

window.RankingPage = RankingPage;
