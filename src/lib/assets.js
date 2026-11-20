// Finds artwork in public/assets. Drop a file with the right name in and the
// matching placeholder on the site is replaced at the next build.
import fs from 'node:fs'
import path from 'node:path'

const PUBLIC = path.join(process.cwd(), 'public')

export function asset(rel) {
  for (const ext of ['webp', 'jpg', 'jpeg', 'png', 'svg']) {
    if (fs.existsSync(path.join(PUBLIC, 'assets', `${rel}.${ext}`))) return `/assets/${rel}.${ext}`
  }
  return null
}

export function video(rel) {
  for (const ext of ['mp4', 'webm']) {
    if (fs.existsSync(path.join(PUBLIC, 'assets', `${rel}.${ext}`))) return `/assets/${rel}.${ext}`
  }
  return null
}

export const wa = (whatsapp, text) => `${whatsapp}?text=${encodeURIComponent(text)}`
