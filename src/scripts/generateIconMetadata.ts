import { promises as fs } from 'fs'
import * as path from 'path'
import type { IconMetadata, IconCategory, IconsMetadata, IconSize } from '@/types/icon'
import { ICONS_CONFIG } from '@/constants/icons'

async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

function getIconSize(filename: string): IconSize {
  return filename.includes(ICONS_CONFIG.SMALL_SUFFIX) 
    ? ICONS_CONFIG.SMALL_SIZE 
    : ICONS_CONFIG.DEFAULT_SIZE
}

function createIconMetadata(
  filename: string, 
  category: string, 
  filepath: string
): IconMetadata {
  const name = path.basename(filename, '.svg')
    .replace(ICONS_CONFIG.SMALL_SUFFIX, '')
  
  return {
    name,
    category,
    path: `/icons/${category}/${name}${ICONS_CONFIG.FILE_EXTENSION}`,
    size: getIconSize(filename)
  }
}

async function scanDirectory(dir: string, category: string): Promise<IconMetadata[]> {
  const files = await fs.readdir(dir)
  const icons: IconMetadata[] = []

  await Promise.all(files.map(async file => {
    const filepath = path.join(dir, file)
    const stat = await fs.stat(filepath)

    if (stat.isDirectory()) {
      const subIcons = await scanDirectory(filepath, file)
      icons.push(...subIcons)
    } else if (file.endsWith('.svg')) {
      const relativePath = path.relative('public', filepath)
      icons.push(createIconMetadata(file, category, relativePath))
    }
  }))

  return icons
}

async function writeMetadata(metadata: IconsMetadata): Promise<void> {
  await fs.writeFile(
    path.join(process.cwd(), ICONS_CONFIG.METADATA_FILE),
    JSON.stringify(metadata, null, 2)
  )
}

async function generateMetadata(): Promise<void> {
  try {
    const iconsDir = path.join(process.cwd(), ICONS_CONFIG.BASE_DIR)
    await ensureDirectory(iconsDir)

    const items = await fs.readdir(iconsDir)
    const categories = await Promise.all(
      items.map(async item => {
        const itemPath = path.join(iconsDir, item)
        return (await fs.stat(itemPath)).isDirectory() ? item : null
      })
    ).then(dirs => dirs.filter((dir): dir is string => dir !== null))

    if (categories.length === 0) {
      const emptyMetadata: IconsMetadata = { categories: [] }
      await writeMetadata(emptyMetadata)
      console.log('✓ Created empty metadata file - no icon directories found')
      return
    }

    const categoriesData = await Promise.all(
      categories.map(async category => ({
        name: category,
        icons: await scanDirectory(path.join(iconsDir, category), category)
      }))
    )

    // Sort categories and icons
    categoriesData.sort((a, b) => a.name.localeCompare(b.name))
    categoriesData.forEach(cat => {
      cat.icons.sort((a, b) => a.name.localeCompare(b.name))
    })

    const metadata: IconsMetadata = { categories: categoriesData }
    await writeMetadata(metadata)

    const totalIcons = categoriesData.reduce((sum, cat) => sum + cat.icons.length, 0)
    console.log(`✓ Generated metadata for ${totalIcons} icons in ${categories.length} categories`)
  } catch (error) {
    console.error('Error generating metadata:', error)
    await writeMetadata({ categories: [] })
    console.log('⚠️ Created empty metadata file due to error')
  }
}

// Only run in development or during build
if (process.env.NODE_ENV !== 'production') {
  generateMetadata().catch(console.error)
} 