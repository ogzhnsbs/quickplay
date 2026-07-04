/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { populateSpeedSelect } from './speed-options';

describe('populateSpeedSelect', () => {
  it('includes the current speed when it is not in the default list', () => {
    const select = document.createElement('select');

    populateSpeedSelect(select, 5.5);

    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toContain('5.5');
    expect(select.value).toBe('5.5');
  });

  it('renders the shared speed labels', () => {
    const select = document.createElement('select');

    populateSpeedSelect(select, 1);

    const labels = Array.from(select.options).map((option) => option.textContent);
    expect(labels).toContain('1x (Normal)');
    expect(labels).toContain('10x');
  });
});
