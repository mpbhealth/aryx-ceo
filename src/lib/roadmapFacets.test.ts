import { describe, expect, it } from 'vitest';
import {
  canonicalPriority,
  canonicalStatus,
  ROADMAP_PRIORITIES,
  ROADMAP_STATUSES,
} from './roadmapFacets';

// roadmap_items allows two legacy lowercase values. Every status/priority in the UI
// indexes a lookup keyed by the Title Case set, so an un-normalised legacy value
// resolves to undefined and the badge renders with no colour class.

describe('canonicalStatus', () => {
  it('maps the legacy lowercase value onto the canonical set', () => {
    expect(canonicalStatus('planned')).toBe('Backlog');
  });

  it('leaves the canonical values untouched', () => {
    expect(canonicalStatus('Backlog')).toBe('Backlog');
    expect(canonicalStatus('In Progress')).toBe('In Progress');
    expect(canonicalStatus('Complete')).toBe('Complete');
  });

  it('only ever returns a value the lookups are keyed by', () => {
    for (const input of ['planned', 'Backlog', 'In Progress', 'Complete'] as const) {
      expect(ROADMAP_STATUSES).toContain(canonicalStatus(input));
    }
  });
});

describe('canonicalPriority', () => {
  it('maps the legacy lowercase value onto the canonical set', () => {
    expect(canonicalPriority('medium')).toBe('Medium');
  });

  it('leaves the canonical values untouched', () => {
    expect(canonicalPriority('Low')).toBe('Low');
    expect(canonicalPriority('Medium')).toBe('Medium');
    expect(canonicalPriority('High')).toBe('High');
  });

  it('only ever returns a value the lookups are keyed by', () => {
    for (const input of ['medium', 'Low', 'Medium', 'High'] as const) {
      expect(ROADMAP_PRIORITIES).toContain(canonicalPriority(input));
    }
  });
});
