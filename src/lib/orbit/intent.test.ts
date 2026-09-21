import { describe, expect, it } from 'vitest';
import { classifyOrbitIntent, parsePeriodFromAsk } from './intent';
import { ORBIT_PRESETS } from './character';

describe('classifyOrbitIntent', () => {
  it('maps the CEO presets', () => {
    expect(classifyOrbitIntent(ORBIT_PRESETS[0])).toEqual({
      kind: 'snapshot',
      snapshot: 'pnl',
      period: 'mtd',
      explain: true,
    });
    expect(classifyOrbitIntent(ORBIT_PRESETS[1])).toEqual({
      kind: 'snapshot',
      snapshot: 'billing_risk',
      explain: false,
    });
    expect(classifyOrbitIntent(ORBIT_PRESETS[2])).toEqual({
      kind: 'snapshot',
      snapshot: 'tickets',
      explain: true,
    });
    expect(classifyOrbitIntent(ORBIT_PRESETS[3])).toEqual({
      kind: 'snapshot',
      snapshot: 'explain_page',
      explain: true,
    });
    expect(classifyOrbitIntent(ORBIT_PRESETS[4])).toEqual({
      kind: 'snapshot',
      snapshot: 'desk',
      explain: true,
    });
  });

  it('parses period overrides from the ask', () => {
    expect(parsePeriodFromAsk('ytd collected')).toBe('ytd');
    expect(classifyOrbitIntent("What's YTD collected and NOI?")).toMatchObject({
      snapshot: 'pnl',
      period: 'ytd',
      explain: true,
    });
  });

  it('routes explain asks to snapshots, not the model', () => {
    expect(classifyOrbitIntent('Explain NOI')).toMatchObject({ snapshot: 'pnl', explain: true });
    expect(classifyOrbitIntent('Make sense of collected')).toMatchObject({ snapshot: 'pnl', explain: true });
    expect(classifyOrbitIntent('Walk me through billing risk')).toMatchObject({
      snapshot: 'billing_risk',
      explain: true,
    });
    expect(classifyOrbitIntent("What's going on?")).toMatchObject({ snapshot: 'desk', explain: true });
    expect(classifyOrbitIntent('Explain this')).toMatchObject({ snapshot: 'explain_page', explain: true });
  });

  it('routes operator writes and blocks ticket/mail writes', () => {
    expect(classifyOrbitIntent('Refresh sources')).toEqual({ kind: 'write', action: 'sync' });
    expect(classifyOrbitIntent('Save the 90-day forecast')).toEqual({
      kind: 'write',
      action: 'save_forecast',
    });
    expect(classifyOrbitIntent('Create a ticket for billing')).toEqual({
      kind: 'refuse',
      reason: 'blocked_write',
    });
    expect(classifyOrbitIntent('Send an email to the book')).toEqual({
      kind: 'refuse',
      reason: 'blocked_write',
    });
  });

  it('does not treat unknown asks as silent writes', () => {
    expect(classifyOrbitIntent('Tell me a story about the company')).toEqual({ kind: 'open' });
  });
});
