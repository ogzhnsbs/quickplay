export function createSpeedFeedbackElement(speed: number): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'vs-speed-feedback';
  el.setAttribute('data-speed', String(speed));
  el.textContent = `${speed}x`;
  return el;
}
