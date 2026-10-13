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

export const periodOptions = (monthsBack = 24, monthsAhead = 12) => {
  const now = new Date();
  return Array.from({ length: monthsBack + monthsAhead + 1 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + monthsAhead - index, 1);
    return { value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: formatter.format(date) };
  });
};
