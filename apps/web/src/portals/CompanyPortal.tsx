import { BRAND, BRAND_PRACTICES } from '../brand'
import { BrandMark } from '../components/BrandMark'

type Props = {
  onGo: (portal: string) => void
}

export function CompanyPortal({ onGo }: Props) {
  return (
    <article className="sheet">
      <header className="sheet-head">
        <div className="sheet-brand">
          <BrandMark className="mark-lg" />
          <div>
            <p className="sheet-name">{BRAND.short}</p>
            <p className="sheet-unit">{BRAND.unit}</p>
          </div>
        </div>
        <div className="sheet-meta">
          <p className="eyebrow">{BRAND.practice}</p>
          <p className="sheet-tagline">{BRAND.tagline}</p>
          <button type="button" className="btn btn-ghost sheet-print" onClick={() => window.print()}>
            Print or save PDF
          </button>
        </div>
      </header>

      <p className="lede sheet-lede">{BRAND.about}</p>

      <div className="sheet-split">
        <section>
          <p className="eyebrow">Staffing</p>
          <h2>A private book, not a board.</h2>
          <p>
            We read the resume, score roles on our desk, and return a ranked shortlist. Candidates
            own the pipeline: saved, applied, interviewing, offered. Small keyword edits are optional.
            Dates and employers stay exactly as they happened.
          </p>
        </section>
        <section>
          <p className="eyebrow">Consulting</p>
          <h2>We stay on the search.</h2>
          <p>
            Hiring teams send the role, the must-haves, and the location. We work the brief like a
            retained desk: one partner across engineering, data, product, GTM, finance, and
            operations. You stay on the offer. We stay on the matching.
          </p>
        </section>
      </div>

      <section className="sheet-practices">
        <p className="eyebrow">Practices</p>
        <ul>
          {BRAND_PRACTICES.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>
              <span>{p.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="eyebrow">How we work</p>
        <ol className="steps-rich">
          <li>
            <span>01</span>
            <div>
              <strong>Brief or resume</strong>
              <p>Talent uploads a document. Hiring teams send a role, location, and must-haves.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Score the desk</strong>
              <p>Owned catalog plus public job APIs (Remotive, Arbeitnow, The Muse). No scraped career sites.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Shortlist or tailor</strong>
              <p>Companies see people whose work already fits. Candidates see honest, small edits.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Track the conversation</strong>
              <p>We open the real apply link and keep status on a desk the candidate owns.</p>
            </div>
          </li>
        </ol>
      </section>

      <footer className="sheet-foot">
        <div>
          <p className="eyebrow">Contact</p>
          <p>
            {BRAND.contactEmail}
            <br />
            {BRAND.region}
            <br />
            {BRAND.websiteDomain}
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={() => onGo('signup')}>
            Join as talent
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onGo('employers')}>
            Request a shortlist
          </button>
        </div>
      </footer>
    </article>
  )
}
