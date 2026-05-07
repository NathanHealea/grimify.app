import Link from 'next/link'

import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Terms of Use',
  description:
    'Terms of Use for Grimify — a hobbyist paint research tool provided as-is, not affiliated with any paint manufacturer.',
  path: '/terms',
})

const lastUpdated = 'May 6, 2026'

export default function TermsOfUsePage() {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
      </header>

      <p className="text-muted-foreground">
        Grimify is a hobbyist project for miniature painters. These terms are written in plain
        language; they are not legal advice. By using Grimify you agree to the terms below.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">1. Acceptance of Terms</h2>
        <p>
          Using Grimify means you agree to these Terms of Use and our{' '}
          <Link href="/code-of-conduct" className="text-primary underline-offset-4 hover:underline">
            Code of Conduct
          </Link>
          . If you do not agree, please do not use the app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">2. The Service is Provided &ldquo;As-Is&rdquo;</h2>
        <p>
          Grimify is a hobbyist project offered free of charge. The service, paint data, color
          comparisons, and recommendations are provided <strong>&ldquo;as-is&rdquo; and &ldquo;as
          available&rdquo;</strong>, without warranties of any kind, express or implied, including
          but not limited to warranties of merchantability, fitness for a particular purpose,
          accuracy, or non-infringement. Use at your own risk.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">3. No Affiliation with Paint Manufacturers</h2>
        <p>
          Grimify is <strong>not affiliated with, endorsed by, or sponsored by</strong> any paint
          manufacturer, including but not limited to Citadel / Games Workshop, Vallejo, The Army
          Painter, Scale75, AK Interactive, Reaper, Pro Acryl / Monument Hobbies, P3 / Privateer
          Press, or any other brand referenced in the app.
        </p>
        <p>
          All paint names, color names, product images, brand names, logos, and trademarks are the
          property of their respective owners. Grimify references these marks{' '}
          <strong>for identification and comparison purposes only</strong> under nominative / fair
          use. If you are a rights holder and have concerns, please see the Contact section below.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">4. Paint Data Accuracy</h2>
        <p>
          Paint and color data is sourced from publicly available manufacturer information and
          community contributions. Grimify does not guarantee accuracy, and color rendering on
          screen will differ from physical paint due to monitor calibration, lighting, and finish.
          Always verify critical purchases against the manufacturer&rsquo;s official source.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">5. Account Responsibilities</h2>
        <p>
          You are responsible for keeping your account credentials secure and for any activity that
          occurs under your account. Notify us promptly if you believe your account has been
          compromised.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">6. User-Generated Content</h2>
        <p>
          You retain ownership of recipes, palettes, collections, and other content you submit. By
          submitting, you grant Grimify a non-exclusive, worldwide, royalty-free license to host,
          display, and share that content within the app. You are responsible for ensuring you have
          the right to share what you submit.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">7. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Harass, abuse, or threaten other users.</li>
          <li>Scrape or use automated tools to access the service without permission.</li>
          <li>Attempt to disrupt, overload, or compromise the service.</li>
          <li>Upload unlawful, infringing, or malicious content.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Grimify and its maintainers are not liable for
          any indirect, incidental, special, consequential, or punitive damages, or any loss of
          profits, data, or goodwill, arising from your use of the service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">9. Termination</h2>
        <p>
          Grimify may suspend or terminate accounts that violate these terms. You may delete your
          account at any time from your profile settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">10. Changes to These Terms</h2>
        <p>
          These terms may be updated from time to time. Material changes will be communicated
          in-app or by email. Continued use of Grimify after changes take effect means you accept
          the updated terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">11. Contact</h2>
        <p>
          For questions, takedown requests, or rights-holder concerns, please open an issue on our{' '}
          <a
            href="https://github.com/NathanHealea/grimify.app/issues"
            className="text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub repository
          </a>
          .
        </p>
      </section>
    </article>
  )
}
