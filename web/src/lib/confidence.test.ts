import { describe, expect, it } from 'vitest';
import { confidence, edge, modelSide } from '@/lib/confidence';
import { game, prediction } from '@/lib/fixture';

// --- Test setup ---

const GRID_SIZE = 99;

// --- Tests ---

describe('confidence', () => {
  it('is 1 when the market sits outside the whole distribution', () => {
    // The grid runs 1..99, so a line at 100 leaves every draw below it.
    expect(confidence(prediction({ spreadClose: 100 }))).toBe(1);
    expect(confidence(prediction({ spreadClose: 0 }))).toBe(1);
  });

  it('is near 0 when the market sits on the model centre', () => {
    // 49 of 99 draws fall below 50, which is as close to even as the grid gets.
    expect(confidence(prediction({ spreadClose: 50 }))).toBeCloseTo(1 / GRID_SIZE, 10);
  });

  it('is null without a closing line', () => {
    expect(confidence(prediction({ spreadClose: null }))).toBeNull();
  });
});

describe('edge and side', () => {
  it('reads a model above the line as backing the home team', () => {
    expect(edge(game({ predMean: 5, spreadClose: 3.5 }))).toBeCloseTo(1.5, 10);
    expect(modelSide(game({ predMean: 5, spreadClose: 3.5 }))).toBe('home');
    expect(modelSide(game({ predMean: 1, spreadClose: 3.5 }))).toBe('away');
  });

  it('has no side without a closing line', () => {
    expect(modelSide(game({ spreadClose: null }))).toBeNull();
  });
});
