export const COLORS = {
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

export const formatRupiah = (amount) =>
  'Rp ' + Number(amount || 0).toLocaleString('id-ID');
