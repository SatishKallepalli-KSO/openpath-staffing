type Props = {
  className?: string
  title?: string
}

export function BrandMark({ className, title = 'OpenPath Staffing' }: Props) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title}>
      <rect width="64" height="64" rx="4" fill="#0b1324" />
      <path d="M12 44h40" stroke="#c6a572" strokeWidth="1.4" />
      <path
        d="M18 42c7.5-18 20.5-18 28 0"
        fill="none"
        stroke="#f4f1ea"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="18" r="3.2" fill="#c6a572" />
    </svg>
  )
}
