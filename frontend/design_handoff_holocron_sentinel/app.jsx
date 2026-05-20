/* Main app — router + state */
/* global React, ReactDOM, HolocronData, Sidebar, DashboardPage, EntityDetailPage, EventFormPage, FeedPage, RankingPage, useToasts */

const {
  entities: SEED_ENTITIES,
  events: SEED_EVENTS,
  CRITICAL_LIMIT,
  generateLiveEvent,
} = window.HolocronData

function App() {
  // ----- Routing -----
  const [route, setRoute] = React.useState(() => {
    const h = window.location.hash.replace(/^#\/?/, '') || 'dashboard'
    return parseRoute(h)
  })
  React.useEffect(() => {
    const onHash = () =>
      setRoute(parseRoute(window.location.hash.replace(/^#\/?/, '') || 'dashboard'))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function parseRoute(h) {
    const parts = h.split('/').filter(Boolean)
    if (parts[0] === 'entity' && parts[1]) return { page: 'entity', id: parts[1] }
    if (['dashboard', 'feed', 'form', 'ranking'].includes(parts[0])) {
      return { page: parts[0], id: parts[1] || null }
    }
    return { page: 'dashboard' }
  }

  function navigate(page, id) {
    const hash = id ? `#/${page}/${id}` : `#/${page}`
    window.location.hash = hash
  }

  // ----- State -----
  const [entities, setEntities] = React.useState(SEED_ENTITIES)
  const [events, setEvents] = React.useState(SEED_EVENTS)
  const [liveEvents, setLiveEvents] = React.useState(
    SEED_EVENTS.slice(0, 18).map((e) => ({ ...e })),
  )
  const [paused, setPaused] = React.useState(false)
  const [streamStatus, setStreamStatus] = React.useState('connected')
  const [recentSubmissions, setRecentSubmissions] = React.useState([])
  const [presetEntityId, setPresetEntityId] = React.useState(null)
  const [highlightedEntity, setHighlightedEntity] = React.useState(null)

  const [toastNode, pushToast] = useToasts()

  // ----- Live event simulation -----
  React.useEffect(() => {
    if (paused) return
    const tick = () => {
      const ev = generateLiveEvent()
      ev.__new = true
      setLiveEvents((cur) => {
        const next = [{ ...ev }, ...cur].slice(0, 100)
        // clear __new flag after a tick
        setTimeout(() => {
          setLiveEvents((c) => c.map((e) => (e.id === ev.id ? { ...e, __new: false } : e)))
        }, 1700)
        return next
      })
      // also append to global events for entity history coherence
      setEvents((cur) => [{ ...ev, __new: false }, ...cur].slice(0, 800))
      // update entity counters
      setEntities((cur) =>
        cur.map((e) => {
          if (e.id !== ev.entity_id) return e
          const isCrit = ev.type === 'critical'
          const newCrit = e.critical_events_count + (isCrit ? 1 : 0)
          const newStatus = newCrit >= CRITICAL_LIMIT ? 'suspended' : e.status
          if (isCrit && newStatus === 'suspended' && e.status !== 'suspended') {
            pushToast({
              kind: 'error',
              title: 'Entidade suspensa automaticamente',
              desc: `${e.name} atingiu o limite de ${CRITICAL_LIMIT} eventos críticos.`,
            })
          }
          return {
            ...e,
            critical_events_count: newCrit,
            total_events: e.total_events + 1,
            last_event_at: ev.created_at,
            updated_at: ev.created_at,
            status: newStatus,
            crit_7d: e.crit_7d + (isCrit ? 1 : 0),
          }
        }),
      )
    }
    // Variable interval (1.5s — 4.5s) — feels organic
    let timer
    const schedule = () => {
      const ms = 1500 + Math.random() * 3000
      timer = setTimeout(() => {
        tick()
        schedule()
      }, ms)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [paused, pushToast])

  // ----- Actions -----
  function handleToggleStatus(id) {
    setEntities((cur) =>
      cur.map((e) => {
        if (e.id !== id) return e
        const newStatus = e.status === 'active' ? 'suspended' : 'active'
        // when reactivating, reset critical counter for fresh window (common pattern)
        const newCount = newStatus === 'active' ? 0 : e.critical_events_count
        pushToast({
          kind: newStatus === 'active' ? 'success' : 'warning',
          title: newStatus === 'active' ? 'Entidade reativada' : 'Entidade suspensa',
          desc: `${e.name} — ${newStatus === 'active' ? 'contador zerado' : 'novos eventos serão rejeitados'}.`,
        })
        return {
          ...e,
          status: newStatus,
          critical_events_count: newCount,
          updated_at: new Date().toISOString(),
        }
      }),
    )
  }

  function handleSubmitEvent({ entityId, externalId, type, payload }) {
    const ent = entities.find((e) => e.id === entityId)
    if (!ent) return { kind: 'error', message: 'Entidade não encontrada.' }
    if (ent.status === 'suspended') {
      addSubmission({ entityId, externalId, type, result: 'suspended', entityName: ent.name })
      return { kind: 'suspended', message: 'Entidade suspensa.' }
    }

    // Idempotency: same external_id for same entity already exists?
    const dup = events.find((e) => e.external_id === externalId && e.entity_id === entityId)
    if (dup) {
      addSubmission({ entityId, externalId, type, result: 'duplicate', entityName: ent.name })
      return {
        kind: 'duplicate',
        event_id: dup.id,
        external_id: externalId,
        first_seen_at: dup.created_at,
      }
    }

    const newEvent = {
      // schema fields
      id: 'EVT-' + String(900000 + Math.floor(Math.random() * 99999)).padStart(7, '0'),
      entity_id: entityId,
      external_id: externalId,
      type,
      payload,
      created_at: new Date().toISOString(),
      // frontend-only join for display
      entity_name: ent.name,
    }

    setEvents((cur) => [newEvent, ...cur])
    setLiveEvents((cur) => [{ ...newEvent, __new: true }, ...cur].slice(0, 100))
    setTimeout(() => {
      setLiveEvents((c) => c.map((e) => (e.id === newEvent.id ? { ...e, __new: false } : e)))
    }, 1700)

    let suspendedNow = false
    setEntities((cur) =>
      cur.map((e) => {
        if (e.id !== entityId) return e
        const isCrit = type === 'critical'
        const newCrit = e.critical_events_count + (isCrit ? 1 : 0)
        const newStatus = newCrit >= CRITICAL_LIMIT ? 'suspended' : e.status
        if (newStatus === 'suspended' && e.status !== 'suspended') suspendedNow = true
        return {
          ...e,
          critical_events_count: newCrit,
          total_events: e.total_events + 1,
          last_event_at: newEvent.created_at,
          updated_at: newEvent.created_at,
          status: newStatus,
          crit_7d: e.crit_7d + (isCrit ? 1 : 0),
        }
      }),
    )

    addSubmission({ entityId, externalId, type, result: 'success', entityName: ent.name })

    if (suspendedNow) {
      setTimeout(() => {
        pushToast({
          kind: 'error',
          title: `${ent.name} foi suspensa`,
          desc: `Limite de ${CRITICAL_LIMIT} eventos críticos atingido.`,
        })
      }, 100)
    }

    return { kind: 'success', event_id: newEvent.id }
  }

  function addSubmission(s) {
    setRecentSubmissions((cur) => [{ ...s, at: new Date().toISOString() }, ...cur].slice(0, 20))
  }

  function openEntity(id) {
    navigate('entity', id)
  }

  function openForm(entityId) {
    setPresetEntityId(entityId || null)
    navigate('form')
  }

  const suspendedCount = entities.filter((e) => e.status === 'suspended').length

  // ----- Render -----
  let pageNode
  switch (route.page) {
    case 'entity': {
      const ent = entities.find((e) => e.id === route.id)
      pageNode = (
        <EntityDetailPage
          entity={ent}
          events={events}
          criticalLimit={CRITICAL_LIMIT}
          onBack={() => navigate('dashboard')}
          onToggleStatus={handleToggleStatus}
          onGoForm={(id) => openForm(id)}
        />
      )
      break
    }
    case 'feed':
      pageNode = (
        <FeedPage
          liveEvents={liveEvents}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onClear={() => setLiveEvents([])}
          streamStatus={streamStatus}
          onOpenEntity={openEntity}
        />
      )
      break
    case 'form':
      pageNode = (
        <EventFormPage
          entities={entities}
          presetEntityId={presetEntityId}
          onSubmit={handleSubmitEvent}
          recentSubmissions={recentSubmissions}
          pushToast={pushToast}
        />
      )
      break
    case 'ranking':
      pageNode = (
        <RankingPage entities={entities} onOpenEntity={openEntity} criticalLimit={CRITICAL_LIMIT} />
      )
      break
    default:
      pageNode = (
        <DashboardPage
          entities={entities}
          onOpenEntity={openEntity}
          onToggleStatus={handleToggleStatus}
          criticalLimit={CRITICAL_LIMIT}
          onGoFeed={() => navigate('feed')}
          onGoForm={() => openForm()}
        />
      )
  }

  return (
    <div className="app">
      <Sidebar current={route.page} onNav={(p) => navigate(p)} suspendedCount={suspendedCount} />
      {pageNode}
      {toastNode}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
