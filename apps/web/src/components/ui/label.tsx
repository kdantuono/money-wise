/**
 * Label Component
 *
 * Reusable label component for form fields.
 */

import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={`block text-sm font-medium text-gray-700 ${className || ''}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
);

Label.displayName = 'Label';

export { Label };
