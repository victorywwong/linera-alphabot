/**
 * Fixed-point conversion utilities
 * Matches bot-service/src/clients/linera.ts conversion logic
 */

const MICRO_MULTIPLIER = 1_000_000;
const BASIS_POINTS_MULTIPLIER = 10_000;

/**
 * Convert micro-USD string to USD number
 * @param microUsd - String representation of micro-USD (e.g., "3550500000")
 * @returns USD as a number (e.g., 3550.50)
 */
export function fromMicroUSD(microUsd: string): number {
  return Number(microUsd) / MICRO_MULTIPLIER;
}

/**
 * Convert USD number to micro-USD string
 * @param usd - USD as a number (e.g., 3550.50)
 * @returns String representation of micro-USD (e.g., "3550500000")
 */
export function toMicroUSD(usd: number): string {
  return Math.round(usd * MICRO_MULTIPLIER).toString();
}

/**
 * Convert basis points to decimal
 * @param bps - Basis points (e.g., 8700 for 87%)
 * @returns Decimal representation (e.g., 0.87)
 */
export function fromBasisPoints(bps: number): number {
  return bps / BASIS_POINTS_MULTIPLIER;
}

/**
 * Convert decimal to basis points
 * @param decimal - Decimal representation (e.g., 0.87 for 87%)
 * @returns Basis points (e.g., 8700)
 */
export function toBasisPoints(decimal: number): number {
  return Math.round(decimal * BASIS_POINTS_MULTIPLIER);
}

/**
 * Format USD price with proper precision
 * @param usd - USD value
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "$3,550.50")
 */
export function formatUSD(usd: number, precision: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(usd);
}

/**
 * Format percentage with proper precision
 * @param decimal - Decimal representation (e.g., 0.87)
 * @param precision - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "87.0%")
 */
export function formatPercentage(decimal: number, precision: number = 1): string {
  return `${(decimal * 100).toFixed(precision)}%`;
}

/**
 * Format basis points as percentage
 * @param bps - Basis points
 * @param precision - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "87.0%")
 */
export function formatBasisPointsAsPercentage(bps: number, precision: number = 1): string {
  return formatPercentage(fromBasisPoints(bps), precision);
}
