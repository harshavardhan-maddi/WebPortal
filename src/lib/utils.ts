import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function isNameConfirmed(name: string | null | undefined, rollNumber: string | null | undefined): boolean {
  if (!name || !rollNumber) return false;
  const n = name.trim().toLowerCase();
  const r = rollNumber.trim().toLowerCase();
  
  // If it matches "student <roll>" or just "student", it is not confirmed.
  if (n === `student ${r}` || n === 'student' || n === `student ${r}`.replace(/\s+/g, '')) {
    return false;
  }
  
  // If it starts with "student " and ends with/contains the roll number, it is not confirmed.
  if (n.startsWith('student ') && n.includes(r)) {
    return false;
  }
  
  return true;
}

