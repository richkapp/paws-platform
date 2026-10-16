#!/usr/bin/env python3
"""Delta after the 2026-10-16 release: remove Abby (caes.json saidos), refresh every public dog row.
Run build-corrections.py first. Updates only; no inserts or schema changes, so it runs as the app role."""
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
dogs = json.load(open(HERE / 'corrected-dogs.json'))
removed = json.load(open(HERE / 'removed-dogs.json'))
q = lambda v: 'null' if v is None else ("'" + str(v).replace("'", "''") + "'")
out = ['begin;']
for d in removed:
    out.append(f"delete from dogs where id = {q(d['id'])}; -- {d['name']}")
for d in dogs:
    out.append(f"update dogs set name = {q(d['name'])}, size = {q(d['size'])}, sex = {q(d['sex'])}, age = {q(d['age'])}, description = {q(d['description'])}, traits = {q(json.dumps(d['traits'], ensure_ascii=False))}::jsonb, is_adopted = {'true' if d['is_adopted'] else 'false'}, updated_at = now() where id = {q(d['id'])};")
out.append('commit;')
(HERE / 'delta-2026-10-16.sql').write_text('\n'.join(out) + '\n')
print(len(removed), 'deletes', len(dogs), 'updates')
