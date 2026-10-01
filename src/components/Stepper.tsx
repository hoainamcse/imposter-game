interface StepperProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  hint?: string
}

export function Stepper({ label, value, min, max, onChange, hint }: StepperProps) {
  return (
    <div className="stepper">
      <span className="stepper-label">
        <span>{label}</span>
        {hint && <span className="muted small">{hint}</span>}
      </span>
      <div className="stepper-controls">
        <button
          type="button"
          className="icon-btn"
          aria-label={`Giảm ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-live="polite" aria-label={label}>
          {value}
        </output>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Tăng ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}
