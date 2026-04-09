import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-'
  try {
    // Handle DD/MM/YYYY format (French format)
    if (dateString.includes('/')) {
      const parts = dateString.split('/')
      if (parts.length === 3) {
        const day = parts[0]
        const month = parts[1]
        const year = parts[2]
        // Validate the parts
        if (day && month && year && !isNaN(parseInt(day)) && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
          const date = new Date(`${year}-${month}-${day}`)
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          }
        }
      }
    }
    // Try standard date parsing
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
    return dateString
  } catch {
    return dateString
  }
}
// Add to your utils file

export function isValidDateRange(startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true;
  if (startDate && !endDate) return true;
  if (!startDate && endDate) return true;
  
  const start = new Date(startDate!);
  const end = new Date(endDate!);
  
  return start <= end;
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}