import Link from 'next/link'

import { Main } from '@/components/main'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Code of Conduct',
  description:
    'Community expectations for Grimify — a welcoming space for miniature painters of every skill level to share recipes, palettes, and ideas.',
  path: '/code-of-conduct',
})

const lastUpdated = 'May 11, 2026'

export default function CodeOfConductPage() {
  return (
    <Main width="3xl" className="px-6">
      <article className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Code of Conduct</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>

        <p className="text-muted-foreground">
          Grimify is a community for miniature painters of every skill level, background, and style.
          This Code of Conduct sets the ground rules so everyone can share recipes, palettes, and
          ideas without fear of harassment or bad-faith behavior. It applies to all Grimify surfaces
          and to anyone who uses the app.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">1. Our Pledge</h2>
          <p>
            We pledge to make Grimify a welcoming, harassment-free experience for everyone,
            regardless of skill level, age, body size, disability, ethnicity, gender identity and
            expression, level of experience, nationality, personal appearance, race, religion, or
            sexual identity and orientation. Beginners are as welcome here as veterans.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">2. Expected Behavior</h2>
          <p>
            Be respectful and constructive. Give credit when sharing or adapting another painter&rsquo;s
            recipe, palette, or technique. Assume good faith — most disagreements over color theory
            or technique come from different goals, not bad intent. Welcome beginners and answer
            questions patiently; everyone started somewhere.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">3. Unacceptable Behavior</h2>
          <p>The following are not welcome on Grimify:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Harassment, hate speech, slurs, or personal attacks.</li>
            <li>Doxxing or sharing another user&rsquo;s private information without consent.</li>
            <li>Spam, excessive self-promotion, or off-topic advertising.</li>
            <li>Plagiarism — passing off another painter&rsquo;s recipes, guides, or images as your own.</li>
            <li>
              Deliberate misinformation about paint products, techniques, or safety (e.g.,
              recommending a thinner that damages a paint type).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">4. Content Guidelines</h2>
          <p>
            Recipes, palettes, and collections you share should be original or properly attributed.
            Do not upload copyrighted images you do not have rights to. Keep critique focused on the
            work, not the person behind it — &ldquo;the highlight transition feels harsh&rdquo; is
            useful; &ldquo;you have no talent&rdquo; is not.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">5. Reporting</h2>
          <p>
            To report a violation, open an issue on the{' '}
            <a
              href="https://github.com/NathanHealea/grimify.app/issues"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Grimify GitHub repository
            </a>
            , or — once available — use the in-app report button. Please include enough detail
            (links, usernames, screenshots) so we can investigate. Reports are handled as
            confidentially as the platform allows.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">6. Enforcement</h2>
          <p>
            Grimify maintainers may take any action they deem appropriate in response to behavior
            that violates this Code of Conduct, ranging from a private warning, to content removal,
            to temporary or permanent account suspension. Decisions are final, but you may appeal
            by contacting the maintainers through the same reporting channel.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">7. Scope</h2>
          <p>
            This Code of Conduct applies to all Grimify community surfaces — recipes, palettes,
            profiles, comments, and any future community features. It also applies to off-platform
            behavior (e.g., harassment of other Grimify users on social media or in private
            messages) when that behavior affects the safety of the community.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">8. Attribution</h2>
          <p>
            This Code of Conduct is adapted from the{' '}
            <a
              href="https://www.contributor-covenant.org/"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Contributor Covenant
            </a>
            , version 2.1, modified for a user community rather than open-source contributors. See
            also our{' '}
            <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
              Terms of Use
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">9. Contact</h2>
          <p>
            For general questions about this Code of Conduct, please open an issue on our{' '}
            <a
              href="https://github.com/NathanHealea/grimify.app/issues"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              GitHub repository
            </a>
            . Sensitive reports may be sent to a dedicated maintainer email if and when one is
            published.
          </p>
        </section>
      </article>
    </Main>
  )
}
