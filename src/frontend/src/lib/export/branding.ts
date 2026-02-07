// Shared branding utilities for exports

export interface BrandingConfig {
  title: string;
  logoPath: string;
  watermarkPath: string;
}

export const CRYSTAL_ATLAS_BRANDING: BrandingConfig = {
  title: 'Crystal Atlas',
  logoPath: '/assets/CRYSTAL ATLAS LOGO.png',
  watermarkPath: '/assets/generated/pill-watermark-capsule-cutout.dim_1600x900.png',
};

/**
 * Load the Crystal Atlas logo as a base64 data URL for embedding in exports
 */
export async function loadLogoAsBase64(): Promise<string> {
  try {
    const response = await fetch(CRYSTAL_ATLAS_BRANDING.logoPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read logo as base64'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo as base64:', error);
    throw error;
  }
}

/**
 * Load the logo as an Image element for canvas/PDF rendering with robust error handling
 * Used for PDF exports only (no title text rendering)
 */
export async function loadLogoAsImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('Logo loading timed out'));
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error('Failed to load logo image'));
    };
    
    img.src = CRYSTAL_ATLAS_BRANDING.logoPath;
  });
}

/**
 * Load the capsule watermark as an Image element for PDF rendering
 */
export async function loadWatermarkAsImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('Watermark loading timed out'));
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error('Failed to load capsule watermark. Please ensure the asset is available.'));
    };
    
    img.src = CRYSTAL_ATLAS_BRANDING.watermarkPath;
  });
}
