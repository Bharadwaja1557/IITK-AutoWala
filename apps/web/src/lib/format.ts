export function formatDistance(metres: number): string {
  if (metres < 950) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function formatMinutesAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

export function formatMinutesLeft(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (minutes <= 0) return 'expired';
  if (minutes === 1) return '1 more minute';
  return `${minutes} more minutes`;
}
