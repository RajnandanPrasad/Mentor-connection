import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and ensures they're merged properly with tailwind-merge
 * @param {...string} inputs - The class names to combine
 * @returns {string} - The combined class name string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
} 