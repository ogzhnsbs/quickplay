export function adjustSpeedForShortcut(currentSpeed: number, direction: 'increase' | 'decrease'): number {
  const minSpeed = 0.5;
  const maxSpeed = 10;

  if (direction === 'increase') {
    if (currentSpeed < 4) {
      return Math.min(maxSpeed, Number((currentSpeed + 0.25).toFixed(2)));
    }

    return Math.min(maxSpeed, Number((currentSpeed + 2).toFixed(2)));
  }

  if (currentSpeed <= 4) {
    return Math.max(minSpeed, Number((currentSpeed - 0.25).toFixed(2)));
  }

  return Math.max(minSpeed, Number((currentSpeed - 2).toFixed(2)));
}

export function resetSpeedForShortcut(): number {
  return 1;
}

export function getSpeedShortcutDirection(key: string | undefined): 'increase' | 'decrease' | null {
  const normalizedKey = (key ?? '').toLowerCase();

  if (normalizedKey === ']' || normalizedKey === '}') {
    return 'increase';
  }

  if (normalizedKey === '[' || normalizedKey === '{') {
    return 'decrease';
  }

  return null;
}

export function isShortcutEvent(event: Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
  const key = (event.key ?? '').toLowerCase();
  const hasCommandModifier = event.ctrlKey || event.metaKey;

  if (key === 'e' && hasCommandModifier && event.shiftKey && !event.altKey) {
    return true;
  }

  if ((key === 'k' || event.code === 'KeyK') && event.shiftKey && !event.altKey) {
    return true;
  }

  if ((key === '[' || key === ']' || key === '{' || key === '}') && event.shiftKey && !event.altKey) {
    return true;
  }

  if ((key === '0' || event.code === 'Digit0') && event.shiftKey && !event.altKey) {
    return true;
  }

  return false;
}
