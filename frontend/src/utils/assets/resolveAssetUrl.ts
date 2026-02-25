/**
 * Resolves an asset path to a full URL using the application's base path.
 * This ensures assets work correctly in non-root deployments.
 * 
 * @param assetPath - Relative asset path (e.g., 'assets/characters/model.glb')
 * @returns Full asset URL with base path applied
 */
export function resolveAssetUrl(assetPath: string): string {
  const basePath = import.meta.env.BASE_URL || '/';
  
  // Remove leading slash from asset path if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  
  // Ensure base path ends with slash
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  
  return `${normalizedBase}${cleanPath}`;
}
