export const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const nextPeriod = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

const formatter = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });

export const formatPeriod = (period: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  return formatter.format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
};

export const periodOptions = (monthsBack = 3, monthsAhead = 3) => {
  const now = new Date();
  const actual = currentPeriod();
  return Array.from({ length: monthsBack + monthsAhead + 1 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + monthsAhead - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: `${formatter.format(date)}${value === actual ? ' — Actual' : ''}` };
  });
};
