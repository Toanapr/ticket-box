export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const bangkokTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const month = MONTHS[bangkokTime.getUTCMonth()];
  const day = bangkokTime.getUTCDate();
  const year = bangkokTime.getUTCFullYear();
  const hours24 = bangkokTime.getUTCHours();
  const minutes = String(bangkokTime.getUTCMinutes()).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${month} ${day}, ${year}, ${hours12}:${minutes} ${period}`;
}

export function formatCurrency(value: number | string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return String(numericValue).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
