export const getTimeRemaining = (expiresAt, frozenRemainingMs = null) => {
  // If frozen, use the stored remaining time
  if (frozenRemainingMs !== null && frozenRemainingMs !== undefined) {
    return formatMilliseconds(frozenRemainingMs);
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  return formatMilliseconds(diff);
};

// Format milliseconds to time string
export const formatMilliseconds = (ms) => {
  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  // Pad with zeros
  const pad = (num) => String(num).padStart(2, '0');

  // If hours > 0, show hh:mm:ss, otherwise show mm:ss
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    return `${pad(minutes)}:${pad(seconds)}`;
  }
};

export const getReservationExpiration = () => {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
};

export const isExpired = (expiresAt) => {
  return new Date(expiresAt) < new Date();
};