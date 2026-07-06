// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initVideoObserver, applySpeedToAll, applySpeed, getHoverTargets, skipFirstPlayingVideo, hasVideos } from './video-manager';
import { adjustSpeedForShortcut, getSpeedShortcutDirection, isEditableTarget, isShortcutEvent, resetSpeedForShortcut } from './shortcut-utils';

describe('video manager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('applies playback rate to videos discovered after initialization', () => {
    const video = document.createElement('video');
    document.body.appendChild(video);

    const callback = vi.fn();
    vi.useFakeTimers();
    initVideoObserver(callback, () => 1.5);

    const newVideo = document.createElement('video');
    document.body.appendChild(newVideo);

    vi.advanceTimersByTime(400);

    const observed = callback.mock.calls[callback.mock.calls.length - 1]?.[0] ?? [];
    expect(observed).toContain(newVideo);
    expect(newVideo.playbackRate).toBe(1.5);
    expect(newVideo.defaultPlaybackRate).toBe(1.5);
  });

  it('applies speed to all videos in the document', () => {
    const first = document.createElement('video');
    const second = document.createElement('video');
    document.body.appendChild(first);
    document.body.appendChild(second);

    applySpeedToAll(2);

    expect(first.playbackRate).toBe(2);
    expect(second.playbackRate).toBe(2);
  });

  it('applies speed directly to an individual video', () => {
    const video = document.createElement('video');
    document.body.appendChild(video);

    applySpeed(video, 0.75);

    expect(video.defaultPlaybackRate).toBe(0.75);
    expect(video.playbackRate).toBe(0.75);
  });

  it('returns the video and its covering parent as hover candidates', () => {
    const wrapper = document.createElement('div');
    const video = document.createElement('video');
    wrapper.appendChild(video);
    document.body.appendChild(wrapper);

    Object.defineProperty(video, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
      }),
    });

    Object.defineProperty(wrapper, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
      }),
    });

    const targets = getHoverTargets(video);

    expect(targets).toContain(video);
    expect(targets).toContain(wrapper);
  });

  it('skips the first playing video it finds', () => {
    const first = document.createElement('video');
    const second = document.createElement('video');
    first.currentTime = 10;
    second.currentTime = 20;
    Object.defineProperty(first, 'paused', { configurable: true, value: false });
    Object.defineProperty(second, 'paused', { configurable: true, value: false });
    Object.defineProperty(first, 'duration', { configurable: true, value: 100 });
    Object.defineProperty(second, 'duration', { configurable: true, value: 100 });

    document.body.appendChild(first);
    document.body.appendChild(second);

    skipFirstPlayingVideo();

    expect(first.currentTime).toBe(100);
  });

  it('skips a video even when it is reported as paused', () => {
    const video = document.createElement('video');
    video.currentTime = 10;
    Object.defineProperty(video, 'paused', { configurable: true, value: true });
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 });

    document.body.appendChild(video);

    skipFirstPlayingVideo();

    expect(video.currentTime).toBe(100);
  });

  it('adjusts speed according to the new keyboard shortcut rules', () => {
    expect(adjustSpeedForShortcut(1.5, 'increase')).toBe(1.75);
    expect(adjustSpeedForShortcut(1.5, 'decrease')).toBe(1.25);
    expect(adjustSpeedForShortcut(4, 'increase')).toBe(6);
    expect(adjustSpeedForShortcut(6, 'increase')).toBe(8);
    expect(adjustSpeedForShortcut(9, 'increase')).toBe(10);
    expect(adjustSpeedForShortcut(10, 'increase')).toBe(10);
    expect(adjustSpeedForShortcut(0.5, 'decrease')).toBe(0.5);
    expect(resetSpeedForShortcut()).toBe(1);
  });

  it('recognizes bracket shortcuts with or without shift', () => {
    expect(getSpeedShortcutDirection(']')).toBe('increase');
    expect(getSpeedShortcutDirection('}')).toBe('increase');
    expect(getSpeedShortcutDirection('[')).toBe('decrease');
    expect(getSpeedShortcutDirection('{')).toBe('decrease');
    expect(getSpeedShortcutDirection('k')).toBeNull();
  });

  it('recognizes shift-based shortcut combinations', () => {
    expect(isShortcutEvent({ key: 'k', code: 'KeyK', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false })).toBe(true);
    expect(isShortcutEvent({ key: ']', code: 'BracketRight', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false })).toBe(true);
    expect(isShortcutEvent({ key: '[', code: 'BracketLeft', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false })).toBe(true);
    expect(isShortcutEvent({ key: 'k', code: 'KeyK', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false })).toBe(false);
  });

  it('detects editable targets for shortcut suppression', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    expect(isEditableTarget({ target: input, composedPath: () => [input] })).toBe(true);

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    expect(isEditableTarget({ target: textarea, composedPath: () => [textarea] })).toBe(true);

    const div = document.createElement('div');
    document.body.appendChild(div);

    expect(isEditableTarget({ target: div, composedPath: () => [div] })).toBe(false);
  });

  it('detects whether the page contains videos', () => {
    expect(hasVideos()).toBe(false);

    const video = document.createElement('video');
    document.body.appendChild(video);

    expect(hasVideos()).toBe(true);
  });
});
