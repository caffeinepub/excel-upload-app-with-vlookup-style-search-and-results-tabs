import { useState } from 'react';

export function TechHeroRadioCharacter() {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex-shrink-0">
      <img
        src={imageError ? '/assets/generated/tech-hero-static.dim_512x512.png' : '/assets/generated/tech-hero-dance.dim_512x512.gif'}
        alt="Tech Hero with Radio"
        className="w-20 h-20 object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
