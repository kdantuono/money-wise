import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            percentage >= 95 ? 'bg-rose-500' :
            percentage >= 80 ? 'bg-amber-500' :
            'bg-emerald-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
