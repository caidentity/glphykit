import { IconMetadata, IconCategory } from '@/types/icon'
import { ICONS_CONFIG } from '@/constants/icons'

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

let memoizedCategories: IconCategory[] | null = null;

export async function loadIconMetadata(): Promise<IconCategory[]> {
  try {
    if (memoizedCategories) {
      return memoizedCategories;
    }

    // Load from public registry
    const response = await fetch('/registry/iconRegistry.json');
    if (!response.ok) {
      console.error('Failed to load registry:', await response.text());
      throw new Error('Failed to load icon registry');
    }
    
    const data = await response.json();
    
    if (!data.categories) {
      console.error('Invalid registry data:', data);
      throw new Error('Invalid registry format');
    }

    memoizedCategories = Object.entries(data.categories).map(([name, data]) => ({
      name,
      icons: (data as { icons: string[] }).icons.map((iconName: string) => {
        const size = iconName.endsWith('24') ? 24 : 16;
        return {
          name: iconName,
          category: name,
          size,
          path: `/api/icons/${name}/${iconName}`
        };
      })
    }));
    
    return memoizedCategories;
  } catch (error) {
    console.error('Error loading icon metadata:', error);
    return [];
  }
}

export async function loadSvgContent(path: string): Promise<string | null> {
  try {
    // Remove any double slashes and ensure proper path format
    const cleanPath = path.replace(/\/+/g, '/');
    const response = await fetch(cleanPath);
    if (!response.ok) {
      console.error(`Failed to load SVG: ${cleanPath}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading SVG content:', error);
    return null;
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
    // Fix: Properly encode each path individually before creating URLSearchParams
    const encodedPaths = JSON.stringify(paths.map(path => path.replace(/\/+/g, '/')));
    
    const searchParams = new URLSearchParams({
      batch: 'true',
      paths: encodedPaths,
    });

    const response = await fetch(`/api/icons?${searchParams.toString()}`);
    if (!response.ok) throw new Error('Failed to load SVGs');
    return response.json();
  } catch (error) {
    console.error('Error loading SVG batch:', error);
    return {};
  }
} 