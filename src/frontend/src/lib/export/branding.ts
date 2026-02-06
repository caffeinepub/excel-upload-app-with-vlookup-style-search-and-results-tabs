// Shared branding utilities for exports

export interface BrandingConfig {
  title: string;
  logoPath: string;
}

export const CRYSTAL_ATLAS_BRANDING: BrandingConfig = {
  title: 'Crystal Atlas',
  logoPath: '/assets/CRYSTAL ATLAS LOGO.png',
};

/**
 * Load the Crystal Atlas logo as a base64 data URL for embedding in exports
 */
export async function loadLogoAsBase64(): Promise<string> {
  try {
    const response = await fetch(CRYSTAL_ATLAS_BRANDING.logoPath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    return '';
  }
}

/**
 * Load the logo as an Image element for canvas/PDF rendering
 */
export async function loadLogoAsImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = CRYSTAL_ATLAS_BRANDING.logoPath;
  });
}
