// Revised 11 Apr 2024 - 00h36

// Function: Exports the cn() helper for safely combining and merging conditional Tailwind CSS class names.

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
