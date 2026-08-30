type Props = {
  className?: string
  title?: string
}

export function BrandMark({ className, title = 'SAVENTRA Technologies' }: Props) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title}>
      <rect width="64" height="64" rx="6" fill="#0b1324" />
      <path
        d="M45 19.5c0-4.8-5.2-8-13.2-8-9.2 0-15.2 4.2-15.2 11 0 5.6 4.2 8.4 14.2 10.6 7.2 1.6 9.6 3.4 9.6 7.2 0 4.4-4 7-10.6 7-8.4 0-13.6-3.4-14.8-9"
        fill="none"
        stroke="#f4f1ea"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path d="M14 50h36" stroke="#c6a572" strokeWidth="1.6" />
    </svg>
  )
}
