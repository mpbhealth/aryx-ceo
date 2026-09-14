import { useMemo, useState } from 'react';
import { useEmployeeProfiles, useDepartments } from '../../hooks/useOrganizationalData';
import { CosPage, CosPageHero } from '../cos/CosPage';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';

export function CosStaff() {
  const { data: people, loading, error } = useEmployeeProfiles();
  const { data: departments } = useDepartments();
  const [search, setSearch] = useState('');

  const deptName = useMemo(() => {
    const map = new Map(departments.map((row) => [row.id, row.name]));
    return (id?: string) => (id ? map.get(id) || '—' : '—');
  }, [departments]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((person) => {
      if (!q) return true;
      const hay = `${person.first_name} ${person.last_name} ${person.title || ''} ${person.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [people, search]);

  const active = people.filter((row) => row.employment_status === 'active').length;

  if (loading) {
    return (
      <CosPage>
        <p className="text-aryx-muted">Loading staff…</p>
      </CosPage>
    );
  }

  if (error) {
    return (
      <CosPage>
        <p className="text-red-600">{error}</p>
      </CosPage>
    );
  }

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Company"
        title="Staff."
        lede="People stored on this organization. Reviews, KPIs, and career plans are not on COS, so this page does not invent them."
      />
      <CommandStrip title="Directory">
        <CommandStat label="People" value={String(people.length)} />
        <CommandStat label="Active" value={String(active)} />
        <CommandStat label="Departments" value={String(departments.length)} />
      </CommandStrip>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search name, title, or email"
        className="mt-8 w-full rounded-2xl bg-aryx-elevated px-4 py-3 ring-1 ring-aryx-line"
      />
      <div className="mt-6 space-y-2">
        {rows.length === 0 ? (
          <p className="text-aryx-muted">No people match this search.</p>
        ) : (
          rows.map((person) => (
            <div key={person.id} className="flex flex-col justify-between gap-1 rounded-2xl bg-aryx-elevated px-5 py-3 ring-1 ring-aryx-line sm:flex-row sm:items-center">
              <div>
                <p className="font-medium">{person.first_name} {person.last_name}</p>
                <p className="text-sm text-aryx-muted">{person.title || '—'}</p>
              </div>
              <div className="text-sm text-aryx-muted sm:text-right">
                <p>{deptName(person.primary_department_id)}</p>
                <p>{person.email || '—'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </CosPage>
  );
}

export default CosStaff;
