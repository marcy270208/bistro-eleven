export const LIGHT_COLORS = {
  paper: '#fff8f0',
  surface: '#ffffff',
  soft: '#f4ece4',
  ink: '#3a2216',
  muted: '#8c7365',
  line: '#e8dbce',
  accent: '#cf733e',
  accentDark: '#b56232',
  success: '#287548',
  successBg: '#dcfce7',
  warning: '#a56021',
  warningBg: '#fef3c7',
  danger: '#c83c28',
  dangerBg: '#fee2e2',
};

export const DARK_COLORS = {
  paper: '#17110d',
  surface: '#231a14',
  soft: '#2e221b',
  ink: '#fff8f0',
  muted: '#baa596',
  line: '#3d2e24',
  accent: '#d97e48',
  accentDark: '#b56232',
  success: '#4ade80',
  successBg: '#143322',
  warning: '#fbbf24',
  warningBg: '#362712',
  danger: '#f87171',
  dangerBg: '#3a1818',
};

export const COLORS = LIGHT_COLORS;

export function getColors(isDark) {
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}

export function formatRupiah(amount) {
  const value = Number(amount || 0);
  return `Rp ${value.toLocaleString('id-ID')}`;
}
