/**
 * Utils Tests
 *
 * Tests the utility functions for className merging
 */
import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn utility function', () => {
  describe('Basic class merging', () => {
    it('should merge single class string', () => {
      const result = cn('text-red-500');
      expect(result).toBe('text-red-500');
    });

    it('should merge multiple class strings', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle empty strings', () => {
      const result = cn('', 'text-red-500', '');
      expect(result).toBe('text-red-500');
    });

    it('should handle undefined values', () => {
      const result = cn(undefined, 'text-red-500', undefined);
      expect(result).toBe('text-red-500');
    });

    it('should handle null values', () => {
      const result = cn(null, 'text-red-500', null);
      expect(result).toBe('text-red-500');
    });

    it('should handle false values', () => {
      const result = cn(false, 'text-red-500', false);
      expect(result).toBe('text-red-500');
    });

    it('should handle zero values', () => {
      const result = cn(0, 'text-red-500');
      expect(result).toBe('text-red-500');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle only falsy values', () => {
      const result = cn(false, null, undefined, '', 0);
      expect(result).toBe('');
    });
  });

  describe('Conditional classes', () => {
    it('should handle conditional classes with logical operators', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled'
      );
      expect(result).toBe('base-class active');
    });

    it('should handle ternary operators', () => {
      const isLarge = true;
      const result = cn(
        'button',
        isLarge ? 'text-lg' : 'text-sm'
      );
      expect(result).toBe('button text-lg');
    });

    it('should handle complex conditionals', () => {
      const size = 'large';
      const variant = 'primary';
      const result = cn(
        'btn',
        size === 'large' && 'btn-lg',
        size === 'small' && 'btn-sm',
        variant === 'primary' && 'btn-primary'
      );
      expect(result).toBe('btn btn-lg btn-primary');
    });
  });

  describe('Object notation', () => {
    it('should handle object with boolean values', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': false,
        'font-bold': true,
      });
      expect(result).toBe('text-red-500 font-bold');
    });

    it('should handle mixed arrays and objects', () => {
      const result = cn(
        'base',
        ['array-class-1', 'array-class-2'],
        {
          'object-class-1': true,
          'object-class-2': false,
        }
      );
      expect(result).toBe('base array-class-1 array-class-2 object-class-1');
    });

    it('should handle nested arrays', () => {
      const result = cn(['outer', ['inner', ['deep']]]);
      expect(result).toBe('outer inner deep');
    });
  });

  describe('Tailwind class conflicts', () => {
    it('should resolve padding conflicts', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should resolve text color conflicts', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should resolve background color conflicts', () => {
      const result = cn('bg-white', 'bg-black');
      expect(result).toBe('bg-black');
    });

    it('should handle mixed utility conflicts', () => {
      const result = cn(
        'p-4 text-red-500 bg-white',
        'p-8 text-blue-500'
      );
      expect(result).toBe('bg-white p-8 text-blue-500');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn(
        'p-4 text-red-500 font-bold',
        'p-8 underline'
      );
      expect(result).toBe('text-red-500 font-bold p-8 underline');
    });

    it('should handle responsive variants', () => {
      const result = cn('md:p-4', 'md:p-8');
      expect(result).toBe('md:p-8');
    });

    it('should handle different responsive breakpoints', () => {
      const result = cn('sm:p-4', 'md:p-8', 'lg:p-12');
      expect(result).toBe('sm:p-4 md:p-8 lg:p-12');
    });

    it('should resolve hover state conflicts', () => {
      const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
      expect(result).toBe('hover:bg-blue-500');
    });

    it('should handle focus states', () => {
      const result = cn('focus:outline-none', 'focus:ring-2');
      expect(result).toBe('focus:outline-none focus:ring-2');
    });

    it('should handle arbitrary values', () => {
      const result = cn('p-[10px]', 'p-[20px]');
      expect(result).toBe('p-[20px]');
    });
  });

  describe('Real-world examples', () => {
    it('should handle button component classes', () => {
      const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors';
      const variantClasses = 'bg-blue-500 text-white hover:bg-blue-600';
      const sizeClasses = 'h-10 px-4 py-2';
      const customClasses = 'mt-4 w-full';

      const result = cn(baseClasses, variantClasses, sizeClasses, customClasses);
      expect(result).toContain('inline-flex');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('h-10');
      expect(result).toContain('mt-4');
    });

    it('should handle card component classes', () => {
      const isElevated = true;
      const isPadded = true;
      const hasError = false;

      const result = cn(
        'rounded-lg border bg-white',
        isElevated && 'shadow-lg',
        isPadded && 'p-6',
        hasError && 'border-red-500',
        'hover:shadow-xl transition-shadow'
      );

      expect(result).toBe('rounded-lg border bg-white shadow-lg p-6 hover:shadow-xl transition-shadow');
    });

    it('should handle input field classes', () => {
      const isInvalid = false;
      const isDisabled = false;
      const size = 'medium';

      const result = cn(
        'w-full rounded-md border border-gray-300 px-3 py-2',
        'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
        isInvalid && 'border-red-500 focus:border-red-500 focus:ring-red-500',
        isDisabled && 'cursor-not-allowed opacity-50',
        {
          'text-sm': size === 'small',
          'text-base': size === 'medium',
          'text-lg': size === 'large',
        }
      );

      expect(result).toContain('border-gray-300');
      expect(result).toContain('focus:border-blue-500');
      expect(result).toContain('text-base');
      expect(result).not.toContain('border-red-500');
      expect(result).not.toContain('cursor-not-allowed');
    });

    it('should handle navigation link classes', () => {
      const isActive = true;
      const isExternal = false;

      const result = cn(
        'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium',
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
        isExternal && 'after:content-["↗"] after:ml-1'
      );

      expect(result).toContain('flex items-center');
      expect(result).toContain('bg-gray-900 text-white');
      expect(result).not.toContain('hover:bg-gray-700');
      expect(result).not.toContain('after:content');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long class strings', () => {
      const longClass = Array(100).fill('class').join(' ');
      const result = cn(longClass);
      expect(result).toBe('class');
    });

    it('should handle special characters in class names', () => {
      const result = cn('before:content-[""]', 'after:content-["→"]');
      expect(result).toBe('before:content-[""] after:content-["→"]');
    });

    it('should handle numeric class values', () => {
      const result = cn('w-1/2', 'w-1/3');
      expect(result).toBe('w-1/3');
    });

    it('should handle negative values', () => {
      const result = cn('-mt-4', '-mt-8');
      expect(result).toBe('-mt-8');
    });

    it('should handle important modifiers', () => {
      const result = cn('!p-4', '!p-8');
      expect(result).toBe('!p-8');
    });

    it('should handle CSS variables', () => {
      const result = cn('[--custom-var:10px]', '[--custom-var:20px]');
      expect(result).toBe('[--custom-var:20px]');
    });

    it('should handle data attributes', () => {
      const result = cn('data-[state=open]:bg-red-500', 'data-[state=closed]:bg-blue-500');
      expect(result).toBe('data-[state=open]:bg-red-500 data-[state=closed]:bg-blue-500');
    });

    it('should handle group modifiers', () => {
      const result = cn('group-hover:text-red-500', 'group-hover:text-blue-500');
      expect(result).toBe('group-hover:text-blue-500');
    });

    it('should handle peer modifiers', () => {
      const result = cn('peer-checked:bg-red-500', 'peer-checked:bg-blue-500');
      expect(result).toBe('peer-checked:bg-blue-500');
    });
  });

  describe('Type safety', () => {
    it('should accept string type', () => {
      const className: string = 'text-red-500';
      const result = cn(className);
      expect(result).toBe('text-red-500');
    });

    it('should accept string array type', () => {
      const classNames: string[] = ['text-red-500', 'bg-blue-500'];
      const result = cn(classNames);
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should accept record type', () => {
      const classMap: Record<string, boolean> = {
        'text-red-500': true,
        'bg-blue-500': false,
      };
      const result = cn(classMap);
      expect(result).toBe('text-red-500');
    });

    it('should handle mixed types', () => {
      const result = cn(
        'string',
        ['array'],
        { object: true },
        undefined,
        null,
        false,
        true && 'conditional'
      );
      expect(result).toBe('string array object conditional');
    });
  });
});