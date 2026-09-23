import type { Database } from '../types/database';

type RoadmapRow = Database['public']['Tables']['roadmap_items']['Row'];

export type RoadmapStatus = 'Backlog' | 'In Progress' | 'Complete';
export type RoadmapPriority = 'Low' | 'Medium' | 'High';

/**
 * roadmap_items carries two legacy lowercase values alongside the Title Case set the
 * UI is built around: status 'planned' and priority 'medium'.
 *
 * They are not cosmetic. Every status and priority in this app is used to index a
 * lookup — icon maps, colour maps, column groupings — all keyed by the Title Case
 * values. A row carrying a legacy value indexes to `undefined`, so the badge renders
 * with no colour class rather than failing visibly.
 *
 * Normalise at the edge: read a row, get a canonical facet.
 */
export function canonicalStatus(status: RoadmapRow['status']): RoadmapStatus {
  return status === 'planned' ? 'Backlog' : status;
}

export function canonicalPriority(priority: RoadmapRow['priority']): RoadmapPriority {
  return priority === 'medium' ? 'Medium' : priority;
}

/** The canonical facets, in display order. Use these to build lookups and filters. */
export const ROADMAP_STATUSES: readonly RoadmapStatus[] = ['Backlog', 'In Progress', 'Complete'];
export const ROADMAP_PRIORITIES: readonly RoadmapPriority[] = ['Low', 'Medium', 'High'];
