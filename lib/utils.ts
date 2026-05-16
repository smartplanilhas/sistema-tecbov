import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Deterministic DD/MM/YYYY — não usa Intl para evitar mismatch de hidratação
export function formatDate(date: string | Date): string {
  const iso = typeof date === 'string' ? date : date.toISOString()
  const [year, month, day] = iso.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}

const MONTHS = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
]

// "maio de 2026" — determinístico, sem Intl
export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} de ${date.getFullYear()}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
