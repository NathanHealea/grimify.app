/**
 * Renders a JSON-LD `<script>` block for structured data.
 *
 * @param data - A schema.org-compatible object to serialize as JSON-LD.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
