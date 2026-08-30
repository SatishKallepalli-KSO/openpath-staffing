type Props = {
  onBack: () => void
  label?: string
}

export function PortalBack({ onBack, label = 'Back' }: Props) {
  return (
    <div className="portal-back">
      <button type="button" className="portal-back-btn" onClick={onBack}>
        {label}
      </button>
    </div>
  )
}
