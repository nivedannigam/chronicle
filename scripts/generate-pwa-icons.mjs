import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const svgPath = path.join(root, 'public/icons/chronicle-icon.svg')
const outDir = path.join(root, 'public/icons')

const sizes = [180, 192, 512]

const svg = await readFile(svgPath)
await mkdir(outDir, { recursive: true })

for (const size of sizes) {
	const outPath = path.join(outDir, `icon-${size}.png`)
	await sharp(svg).resize(size, size).png().toFile(outPath)
	console.log(`Wrote ${outPath}`)
}
