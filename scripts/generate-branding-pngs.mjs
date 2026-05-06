/**
 * Generates the static OG image fallback (1200×630) and a 192/512 raster of the
 * Grimify logo from the source PNG in `public/branding/grimify-logo.png`.
 *
 * Usage: `node scripts/generate-branding-pngs.mjs`
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const source = resolve(root, 'public/branding/grimify-logo.png')

const ogWidth = 1200
const ogHeight = 630
const logoSize = 360
const background = { r: 10, g: 10, b: 10, alpha: 1 }

const logo = await sharp(source)
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

const og = await sharp({
  create: { width: ogWidth, height: ogHeight, channels: 4, background },
})
  .composite([
    {
      input: logo,
      top: Math.round((ogHeight - logoSize) / 2),
      left: 96,
    },
    {
      input: Buffer.from(
        `<svg width="640" height="${ogHeight}" xmlns="http://www.w3.org/2000/svg">
           <text x="0" y="280" font-family="sans-serif" font-size="96" font-weight="700" fill="#fafafa">Grimify</text>
           <text x="0" y="340" font-family="sans-serif" font-size="32" fill="#c9a73d">Color research for miniature painters</text>
           <text x="0" y="392" font-family="sans-serif" font-size="26" fill="#a3a3a3">Paints · Brands · Palettes · Recipes</text>
         </svg>`,
      ),
      top: 0,
      left: 96 + logoSize + 48,
    },
  ])
  .png()
  .toBuffer()

await writeFile(resolve(root, 'public/og-image.png'), og)
console.log(`wrote public/og-image.png (${ogWidth}x${ogHeight})`)
