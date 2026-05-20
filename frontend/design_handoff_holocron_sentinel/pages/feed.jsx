/* Live feed page */
/* global React, Icon, TypeBadge, JsonView, formatTime, formatRelative */

const FeedPage = ({ liveEvents, paused, onTogglePause, onClear, streamStatus, onOpenEntity }) => {
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [showPayload, setShowPayload] = React.useState(null)

  const filtered = liveEvents.filter((e) => typeFilter === 'all' || e.type === typeFilter)

  const stats = React.useMemo(
    () => ({
      total: liveEvents.length,
      info: liveEvents.filter((e) => e.type === 'info').length,
      warning: liveEvents.filter((e) => e.type === 'warning').length,
      critical: liveEvents.filter((e) => e.type === 'critical').length,
    }),
    [liveEvents],
  )

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Feed em tempo real</h1>
            <div className="page-subtitle">
              Stream contínuo via Server-Sent Events. Novos eventos são exibidos sem refresh.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="live-pill">
              <span className={'live-dot' + (paused ? ' warn' : '')} />
              {streamStatus === 'connected' && !paused && 'Stream conectado'}
              {paused && 'Pausado'}
              {streamStatus === 'reconnecting' && 'Reconectando...'}
              {streamStatus === 'disconnected' && 'Desconectado'}
            </span>
            <button className="btn btn-ghost" onClick={onTogglePause}>
              <Icon name={paused ? 'play' : 'pause'} size={13} />
              {paused ? 'Retomar' : 'Pausar'}
            </button>
            <button className="btn btn-ghost" onClick={onClear} disabled={liveEvents.length === 0}>
              <Icon name="trash" size={13} />
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="feed-controls">
            <div className="chip-group">
              {[
                ['all', 'Tudo', stats.total],
                ['info', 'Info', stats.info],
                ['warning', 'Warning', stats.warning],
                ['critical', 'Critical', stats.critical],
              ].map(([id, label, n]) => (
                <button
                  key={id}
                  className={'chip' + (typeFilter === id ? ' on' : '')}
                  onClick={() => setTypeFilter(id)}
                >
                  {label} <span className="chip-count">{n}</span>
                </button>
              ))}
            </div>

            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-muted)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>GET /events/stream</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{liveEvents.length} eventos buffered</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="pulse"
              title={typeFilter === 'all' ? 'Aguardando eventos...' : 'Nenhum evento neste filtro'}
              desc={
                typeFilter === 'all'
                  ? 'O stream está conectado. Novos eventos aparecerão aqui assim que forem registrados.'
                  : "Tente trocar para 'Tudo' ou esperar por novos eventos do tipo selecionado."
              }
              action={
                paused && (
                  <button className="btn btn-ghost btn-sm" onClick={onTogglePause}>
                    <Icon name="play" size={12} /> Retomar stream
                  </button>
                )
              }
            />
          ) : (
            <div className="feed-list">
              {filtered.map((ev, i) => (
                <div key={ev.id}>
                  <div className={'feed-row' + (ev.__new ? ' new' : '')}>
                    <span className="feed-time">{formatTime(ev.created_at)}</span>
                    <span className={'feed-icon ' + ev.type}>
                      <Icon
                        name={
                          ev.type === 'critical'
                            ? 'alert'
                            : ev.type === 'warning'
                              ? 'alert'
                              : 'info'
                        }
                        size={12}
                      />
                    </span>
                    <div className="feed-body">
                      <div className="feed-title">
                        Evento <span style={{ textTransform: 'capitalize' }}>{ev.type}</span>
                        <span
                          style={{
                            color: 'var(--text-faint)',
                            fontWeight: 400,
                            marginLeft: 8,
                            fontSize: 12,
                          }}
                        >
                          em{' '}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              onOpenEntity(ev.entity_id)
                            }}
                            style={{
                              color: 'var(--text-muted)',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            {ev.entity_name}
                          </a>
                        </span>
                      </div>
                      <div className="feed-meta">
                        <TypeBadge type={ev.type} />
                        <code>{ev.external_id}</code>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--text-faint)',
                          }}
                        >
                          {ev.id}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowPayload(showPayload === ev.id ? null : ev.id)}
                    >
                      {showPayload === ev.id ? 'Ocultar' : 'Payload'}
                    </button>
                  </div>
                  {showPayload === ev.id && (
                    <div style={{ padding: '0 18px 16px 130px' }}>
                      <JsonView data={ev.payload} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="scrim">
            Buffer limitado a 100 eventos · auto-scroll {paused ? 'pausado' : 'ativo'} · reconexão
            automática habilitada
          </div>
        </div>
      </div>
    </div>
  )
}

window.FeedPage = FeedPage
