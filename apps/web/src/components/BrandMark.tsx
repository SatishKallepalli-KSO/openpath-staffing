type Props = {
  className?: string
  title?: string
}

export function BrandMark({ className, title = 'OpenPath Staffing' }: Props) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title}>
      <rect width="64" height="64" rx="14" fill="#102820" />
      <path
        d="M16 40c8-16 24-16 32 0"
        fill="none"
        stroke="#c8f0d8"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M20 40h24" stroke="#3d9a7a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="24" r="5" fill="#e8c36a" />
    </svg>
  )
}
