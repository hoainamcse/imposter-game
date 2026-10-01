interface HandoffProps {
  name: string
  step: number
  total: number
  action: string
  onReady: () => void
}

export function Handoff({ name, step, total, action, onReady }: HandoffProps) {
  return (
    <div className="screen center handoff">
      <p className="step">
        {step}/{total}
      </p>
      <div className="handoff-icon" aria-hidden="true">
        📱
      </div>
      <h2>
        Đưa máy cho <span className="accent">{name}</span>
      </h2>
      <p className="muted">Những người khác vui lòng nhìn đi chỗ khác.</p>
      <button type="button" className="btn btn-primary btn-lg" onClick={onReady}>
        Tôi là {name} — {action}
      </button>
    </div>
  )
}
