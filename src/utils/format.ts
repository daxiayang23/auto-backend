const pad = (value: number): string => String(value).padStart(2, '0');

export const formatDate = (value: unknown): string => {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatDateTime = (value: unknown): string => {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return `${formatDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? '');
  return num.toLocaleString('zh-CN');
};
