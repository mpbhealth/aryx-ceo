import { describe, expect, it } from 'vitest';
import { selectColumns, toCsv, type ExportPayload } from './exportFacts';

// These guard a feature that shipped dead: Projects, TechStack, Deployments and
// SaaSSpend each built an export payload and passed it to an ExportDropdown whose
// props did not include `data`, so the component rendered nothing at all.

describe('selectColumns', () => {
  const payload: ExportPayload = {
    title: 'Active Projects',
    filename: 'projects',
    headers: ['Name', 'Status'],
    data: [
      { Name: 'Orbit', Status: 'Live', Progress: '80%', Internal: 'drop me' },
      { Name: 'Atlas', Status: 'Planning', Progress: '10%', Internal: 'drop me' },
    ],
  };

  it('keeps only the declared columns', () => {
    const rows = selectColumns(payload);
    expect(Object.keys(rows[0])).toEqual(['Name', 'Status']);
    expect(rows[0]).not.toHaveProperty('Internal');
  });

  it('honours the declared column order rather than the row order', () => {
    const rows = selectColumns({ ...payload, headers: ['Status', 'Name'] });
    expect(Object.keys(rows[0])).toEqual(['Status', 'Name']);
  });

  it('falls back to every key of the first row when no headers are declared', () => {
    const rows = selectColumns({ ...payload, headers: undefined });
    expect(Object.keys(rows[0])).toEqual(['Name', 'Status', 'Progress', 'Internal']);
  });

  it('writes an empty cell rather than null or undefined', () => {
    const rows = selectColumns({
      ...payload,
      headers: ['Name', 'Missing'],
      data: [{ Name: 'Orbit', Missing: null }],
    });
    expect(rows[0]).toEqual({ Name: 'Orbit', Missing: '' });
  });

  it('survives an empty dataset', () => {
    expect(selectColumns({ ...payload, data: [] })).toEqual([]);
  });
});

describe('toCsv', () => {
  it('writes a header row followed by one row per record', () => {
    const csv = toCsv([
      { Name: 'Orbit', Status: 'Live' },
      { Name: 'Atlas', Status: 'Planning' },
    ]);
    expect(csv.split('\n')).toEqual(['Name,Status', '"Orbit","Live"', '"Atlas","Planning"']);
  });

  it('escapes embedded quotes by doubling them', () => {
    expect(toCsv([{ Note: 'she said "hello"' }])).toContain('"she said ""hello"""');
  });

  it('does not break on a comma inside a value', () => {
    const csv = toCsv([{ Team: 'Ana, Ben' }]);
    expect(csv.split('\n')[1]).toBe('"Ana, Ben"');
  });

  it('returns nothing for an empty dataset', () => {
    expect(toCsv([])).toBe('');
  });
});
