// ============================================================================
// SHOREBREAK AI - UTILITAIRES
// ============================================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ----------------------------------------------------------------------------
// Classnames helper (pour Tailwind)
// ----------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------------
// Formatage des dates
// ----------------------------------------------------------------------------

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}

// ----------------------------------------------------------------------------
// Formatage des nombres
// ----------------------------------------------------------------------------

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

export function formatPercentage(num: number, decimals: number = 0): string {
  return num.toFixed(decimals) + '%';
}

// ----------------------------------------------------------------------------
// Validation
// ----------------------------------------------------------------------------

export function isValidGoogleMapsUrl(url: string): boolean {
  if (!url) return false;
  const patterns = [
    /^https?:\/\/(www\.)?google\.[a-z.]+\/maps/i,
    /^https?:\/\/maps\.google\.[a-z.]+/i,
    /^https?:\/\/goo\.gl\/maps/i,
  ];
  return patterns.some(pattern => pattern.test(url));
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ----------------------------------------------------------------------------
// Extraction des initiales
// ----------------------------------------------------------------------------

export function getInitials(name: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ----------------------------------------------------------------------------
// Génération d'ID
// ----------------------------------------------------------------------------

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// ----------------------------------------------------------------------------
// Calcul des métriques d'évolution
// ----------------------------------------------------------------------------

export function calculateChange(current: number | null, previous: number | null): {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
} | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  const value = current - previous;
  const percentage = ((current - previous) / previous) * 100;
  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';

  return { value, percentage, trend };
}

// ----------------------------------------------------------------------------
// Formatage des mois pour les graphiques
// ----------------------------------------------------------------------------

export function getMonthLabel(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

// ----------------------------------------------------------------------------
// Téléchargement de fichier JSON (pour export RGPD)
// ----------------------------------------------------------------------------

export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
