import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple class names or conditional class expressions together
 * using clsx and tailwind-merge, which handles Tailwind CSS class conflicts properly
 * * @param inputs - Any number of class names, objects, or arrays to be merged
 * @returns Merged class string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default {
  cn
};