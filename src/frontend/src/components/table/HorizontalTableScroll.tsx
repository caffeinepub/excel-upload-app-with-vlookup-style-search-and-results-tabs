import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HorizontalTableScrollProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that enables horizontal scrolling for wide tables.
 * Constrains table width to parent and adds overflow-x-auto for left-right scrolling.
 */
export function HorizontalTableScroll({ children, className }: HorizontalTableScrollProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div className="min-w-max">
        {children}
      </div>
    </div>
  );
}
