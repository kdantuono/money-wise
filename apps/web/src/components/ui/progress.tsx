import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  /**
   * Color variant for the progress indicator.
   * Use 'primary' for neutral progress, 'success' for positive completion,
   * 'warning' for cautious progress, 'danger' for critical/negative progress.
   * @default 'primary'
   */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'primary', ...props }, ref) => {
    // Guard against invalid max values (non-finite or <= 0)
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;

    // Guard against invalid value
    const safeValue = Number.isFinite(value) ? value : 0;

    // Clamp value to valid range [0, safeMax]
    const clampedValue = Math.min(Math.max(safeValue, 0), safeMax);

    // Calculate percentage
    const percentage = (clampedValue / safeMax) * 100;

    // Determine indicator color based on variant
    const variantClasses = {
      primary: 'bg-primary',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      danger: 'bg-rose-500',
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
