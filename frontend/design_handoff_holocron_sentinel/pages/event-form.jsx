/* Event registration form */
/* global React, Icon, EntityAvatar, TypeBadge, JsonView, formatTime */

const SAMPLE_PAYLOAD = `{
  "signal_strength": 87,
  "source": "sensor_grid_4",
  "priority": "P2",
  "notes": "Leitura confirmada por operador."
}`;

const EventFormPage = ({ entities, presetEntityId, onSubmit, recentSubmissions, pushToast }) => {
  const [entityId, setEntityId] = React.useState(presetEntityId || "");
  const [externalId, setExternalId] = React.useState("");
  const [type, setType] = React.useState("info");
  const [payload, setPayload] = React.useState(SAMPLE_PAYLOAD);
  const [errors, setErrors] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState(null); // { kind: 'success'|'duplicate'|'error', ... }

  React.useEffect(() => {
    if (presetEntityId) setEntityId(presetEntityId);
  }, [presetEntityId]);

  const selectedEntity = entities.find((e) => e.id === entityId);
  const entitySuspended = selectedEntity && selectedEntity.status === "suspended";

  function genExternalId() {
    setExternalId("ext_" + Math.random().toString(36).slice(2, 10));
  }

  function validate() {
    const errs = {};
    if (!entityId) errs.entity = "Selecione uma entidade.";
    if (!externalId.trim()) errs.external = "external_id é obrigatório.";
    else if (!/^[a-zA-Z0-9_\-:.]+$/.test(externalId)) errs.external = "Use apenas letras, números, _ - : .";
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        errs.payload = "Payload deve ser um objeto JSON.";
      }
    } catch (e) {
      errs.payload = "JSON inválido: " + e.message;
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (entitySuspended) {
      setLastResult({
        kind: "error",
        message: "Entidade suspensa não pode receber novos eventos.",
        code: "ENTITY_SUSPENDED",
      });
      pushToast({ kind: "error", title: "Evento rejeitado", desc: "Entidade está suspensa." });
      return;
    }

    setSubmitting(true);
    setLastResult(null);
    setTimeout(() => {
      const result = onSubmit({
        entityId,
        externalId: externalId.trim(),
        type,
        payload: JSON.parse(payload),
      });
      setSubmitting(false);
      setLastResult(result);

      if (result.kind === "success") {
        pushToast({ kind: "success", title: "Evento registrado", desc: result.event_id });
        // Reset external id only — keep entity/type to allow batch submissions
        setExternalId("");
      } else if (result.kind === "duplicate") {
        pushToast({ kind: "warning", title: "Idempotência aplicada", desc: "external_id já foi processado." });
      } else if (result.kind === "suspended") {
        pushToast({ kind: "error", title: "Entidade suspensa", desc: "Evento rejeitado." });
      }
    }, 500);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Registrar evento</h1>
            <div className="page-subtitle">
              Inserção manual para operadores. Submissões respeitam idempotência por <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4 }}>external_id</code>.
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "flex-start" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Novo evento</div>
                <div className="card-subtitle">Preencha os campos e revise antes de enviar.</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEntityId("");
                    setExternalId("");
                    setType("info");
                    setPayload(SAMPLE_PAYLOAD);
                    setErrors({});
                    setLastResult(null);
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>
            <form className="card-body" onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Result banner */}
                {lastResult && lastResult.kind === "success" && (
                  <div className="alert alert-success">
                    <span className="alert-icon"><Icon name="check" size={12} /></span>
                    <div style={{ flex: 1 }}>
                      <div className="alert-title">Evento registrado com sucesso</div>
                      <div className="alert-desc">
                        ID interno <code style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{lastResult.event_id}</code>
                        {" "}— resposta {`<`}120ms{`>`}.
                      </div>
                    </div>
                  </div>
                )}
                {lastResult && lastResult.kind === "duplicate" && (
                  <div className="alert alert-warning">
                    <span className="alert-icon"><Icon name="alert" size={12} /></span>
                    <div style={{ flex: 1 }}>
                      <div className="alert-title">Evento duplicado — idempotência aplicada</div>
                      <div className="alert-desc">
                        Um evento com <code style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>external_id={lastResult.external_id}</code> já foi processado em {formatTime(lastResult.first_seen_at)}. Retornando o registro existente <code style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{lastResult.event_id}</code> sem efeitos colaterais.
                      </div>
                    </div>
                  </div>
                )}
                {lastResult && (lastResult.kind === "error" || lastResult.kind === "suspended") && (
                  <div className="alert alert-error">
                    <span className="alert-icon"><Icon name="x" size={12} /></span>
                    <div style={{ flex: 1 }}>
                      <div className="alert-title">Evento rejeitado</div>
                      <div className="alert-desc">
                        {lastResult.kind === "suspended"
                          ? `A entidade está suspensa e não aceita novos eventos. O endpoint retornará 409 Conflict.`
                          : lastResult.message || "Falha na submissão."}
                      </div>
                    </div>
                  </div>
                )}

                {/* Entity */}
                <div className="field">
                  <label className="label">Entidade <span className="req">*</span></label>
                  <select
                    className={"select" + (errors.entity ? " has-err" : "")}
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  >
                    <option value="">— Selecione uma entidade —</option>
                    <optgroup label="Ativas">
                      {entities.filter((e) => e.status === "active").map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Suspensas (somente leitura)">
                      {entities.filter((e) => e.status === "suspended").map((e) => (
                        <option key={e.id} value={e.id}>⊘ {e.name} ({e.id})</option>
                      ))}
                    </optgroup>
                  </select>
                  {errors.entity && <div className="field-error"><Icon name="alert" size={12} /> {errors.entity}</div>}
                  {entitySuspended && !errors.entity && (
                    <div className="field-error"><Icon name="alert" size={12} /> Esta entidade está suspensa — eventos serão rejeitados.</div>
                  )}
                  {selectedEntity && !entitySuspended && (
                    <div className="hint" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <EntityAvatar name={selectedEntity.name} size={20} />
                      {selectedEntity.critical_events_count}/10 eventos críticos
                    </div>
                  )}
                </div>

                {/* External ID */}
                <div className="field">
                  <label className="label">
                    external_id <span className="req">*</span>
                    <span className="tooltip-trigger" data-tip="Chave de idempotência. Não pode ser reprocessada." style={{ marginLeft: 4, color: "var(--text-faint)" }}>
                      <Icon name="info" size={12} />
                    </span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className={"input" + (errors.external ? " has-err" : "")}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
                      placeholder="ext_ab9f3..."
                      value={externalId}
                      onChange={(e) => setExternalId(e.target.value)}
                    />
                    <button type="button" className="btn btn-ghost" onClick={genExternalId} title="Gerar ID aleatório">
                      <Icon name="refresh" size={13} />
                    </button>
                  </div>
                  {errors.external ? (
                    <div className="field-error"><Icon name="alert" size={12} /> {errors.external}</div>
                  ) : (
                    <div className="hint">Use o mesmo external_id apenas se quiser deduplicar uma re-submissão.</div>
                  )}
                </div>

                {/* Type */}
                <div className="field">
                  <label className="label">Tipo do evento <span className="req">*</span></label>
                  <div className="radio-row">
                    {[
                      { v: "info", label: "Info", desc: "Atividade rotineira" },
                      { v: "warning", label: "Warning", desc: "Anomalia leve" },
                      { v: "critical", label: "Critical", desc: "Incrementa o contador" },
                    ].map((opt) => (
                      <label key={opt.v} className={"radio-card" + (type === opt.v ? " on" : "")}>
                        <input type="radio" name="type" value={opt.v} checked={type === opt.v} onChange={() => setType(opt.v)} />
                        <TypeBadge type={opt.v} />
                        <div>
                          <div className="radio-label">{opt.label}</div>
                          <div className="radio-desc">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payload */}
                <div className="field">
                  <label className="label">
                    Payload (JSON)
                    <span className="hint" style={{ fontWeight: 400, marginLeft: 6 }}>opcional, mas recomendado</span>
                  </label>
                  <textarea
                    className={"textarea" + (errors.payload ? " has-err" : "")}
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    rows={9}
                    spellCheck={false}
                  />
                  {errors.payload && <div className="field-error"><Icon name="alert" size={12} /> {errors.payload}</div>}
                </div>

                <div className="divider" />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="hint">
                    O endpoint <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>POST /events</code> aceita esta carga.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        // simulate duplicate scenario
                        if (recentSubmissions.length > 0) {
                          const last = recentSubmissions[0];
                          setEntityId(last.entityId);
                          setExternalId(last.externalId);
                          setType(last.type);
                        }
                      }}
                      disabled={recentSubmissions.length === 0}
                      title="Reusar dados da última submissão (para testar idempotência)"
                    >
                      <Icon name="copy" size={13} />
                      Reusar último
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || entitySuspended}
                    >
                      {submitting ? <span className="spinner" /> : <Icon name="send" size={13} />}
                      {submitting ? "Enviando..." : "Enviar evento"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Side: recent submissions + tips */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Submissões recentes</div>
              </div>
              {recentSubmissions.length === 0 ? (
                <EmptyState
                  icon="send"
                  title="Nenhuma submissão"
                  desc="Os eventos enviados nesta sessão aparecerão aqui."
                />
              ) : (
                <div>
                  {recentSubmissions.slice(0, 6).map((s, i) => (
                    <div key={i} style={{ padding: "10px 18px", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 12.5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <TypeBadge type={s.type} />
                          {s.result === "duplicate" && <span className="badge badge-warning"><span className="badge-dot" />dup</span>}
                          {s.result === "suspended" && <span className="badge badge-suspended"><span className="badge-dot" />rejeitado</span>}
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
                          {formatTime(s.at)}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        <code style={{ fontFamily: "var(--font-mono)" }}>{s.externalId}</code> → {s.entityName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Como funciona a idempotência</div>
              </div>
              <div className="card-body" style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 10px" }}>
                  Cada <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4, color: "var(--text)" }}>external_id</code> é único por entidade. Re-submissões retornam o registro original sem efeitos colaterais.
                </p>
                <p style={{ margin: "0 0 10px" }}>
                  Eventos do tipo <b style={{ color: "var(--critical)" }}>critical</b> incrementam o contador atomicamente. Ao atingir o limite (10), a entidade é suspensa na mesma transação.
                </p>
                <p style={{ margin: 0 }}>
                  Tente reenviar o mesmo external_id para ver a resposta de deduplicação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.EventFormPage = EventFormPage;
