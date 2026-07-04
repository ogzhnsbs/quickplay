import { SPEED_OPTIONS } from '@/types';

export function populateSpeedSelect(select: HTMLSelectElement, value: number): void {
  const normalizedValue = Number(value);
  const options = [...SPEED_OPTIONS, normalizedValue].filter((speed, index, speeds) => speeds.indexOf(speed) === index);

  select.innerHTML = '';
  options
    .sort((left, right) => left - right)
    .forEach((speed) => {
      const option = document.createElement('option');
      option.value = String(speed);
      option.textContent = `${speed}x${speed === 1 ? ' (Normal)' : ''}`;
      select.appendChild(option);
    });

  select.value = String(normalizedValue);
}
