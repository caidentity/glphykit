import { IconMetadata, IconCategory, IconsMetadata } from '@/types/icon'
import { ICONS_CONFIG, METADATA_DEFAULTS } from '@/constants/icons'
import path from 'path'
import iconRegistry from '@/lib/iconRegistry.json';

interface MetadataCache {
  data: IconCategory[] | null
  timestamp: number
}

let metadataCache: MetadataCache = {
  data: null,
  timestamp: 0
}

function isCacheValid(cache: MetadataCache): boolean {
  const now = Date.now()
  return Boolean(
    cache.data && 
    now - cache.timestamp < ICONS_CONFIG.CACHE_DURATION
  )
}

export async function loadIconMetadata(): Promise<IconCategory[]> {
  try {
    // Convert registry categories format to IconCategory[]
    const categories = Object.entries(iconRegistry.categories).map(([name, data]) => ({
      name,
      icons: data.icons.map(iconName => ({
        name: iconName,
        category: name,
        size: iconName.endsWith('24') ? 24 : 16,
        path: `/icons/${name}/${iconName}.svg`
      }))
    }));
    
    return categories;
  } catch (error) {
    console.error('Error loading icon metadata:', error);
    return [];
  }
}

export async function loadSvgContent(path: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/icons${path.replace('/icons', '')}`)
    if (!response.ok) throw new Error('Failed to load SVG')
    return response.text()
  } catch (error) {
    console.error('Error loading SVG content:', error)
    return null
  }
}

export function generateIconPath(icon: IconMetadata): string {
  const sizeSuffix = icon.size === ICONS_CONFIG.SMALL_SIZE 
    ? ICONS_CONFIG.SMALL_SUFFIX 
    : ''
  return [
    ICONS_CONFIG.BASE_DIR,
    icon.category,
    `${icon.name}${sizeSuffix}.svg`,
  ].join('/')
}

export async function loadSvgBatch(paths: string[]): Promise<{ [key: string]: string }> {
  try {
    const searchParams = new URLSearchParams({
      batch: 'true',
      paths: JSON.stringify(paths),
    });

    const response = await fetch(`/api/icons?${searchParams.toString()}`);
    if (!response.ok) throw new Error('Failed to load SVGs');
    return response.json();
  } catch (error) {
    console.error('Error loading SVG batch:', error);
    return {};
  }
} 