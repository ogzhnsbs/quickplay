/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { createSpeedFeedbackElement } from './speed-feedback';

describe('createSpeedFeedbackElement', () => {
  it('creates a feedback element with the selected speed label', () => {
    const element = createSpeedFeedbackElement(2.5);

    expect(element.classList.contains('vs-speed-feedback')).toBe(true);
    expect(element.textContent).toBe('2.5x');
    expect(element.getAttribute('data-speed')).toBe('2.5');
  });
});
