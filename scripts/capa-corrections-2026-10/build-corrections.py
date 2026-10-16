#!/usr/bin/env python3
"""Build CAPA's October 2026 dog-data corrections.

Inputs (committed next to this script):
  caes.json                       shelter records sent by CAPA on 2026-10-15
  live-dogs-2026-10-15.json       snapshot of https://api.capapvl.org/dogs?includeAdopted=true

Outputs:
  corrected-dogs.json             full corrected dataset (public dogs, with ids and traits)
  removed-dogs.json               records taken off the public site (archived, restorable)
  migration.sql                   schema + data migration for capapvl_db
  ../../src/data/capaDogs.ts      regenerated static fallback

Run: python3 scripts/capa-corrections-2026-10/build-corrections.py
"""
import json
import re
import unicodedata
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
NOW = '2026-10-15T12:00:00+00:00'

records = json.load(open(HERE / 'caes.json'))['caes']
live = json.load(open(HERE / 'live-dogs-2026-10-15.json'))['dogs']


def norm(s: str) -> str:
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower().strip()


def slug(s: str) -> str:
    return re.sub(r'\s+', '-', norm(s))


live_by = {norm(d['name']): d for d in live}

SIZE = {'pequeno': 'small', 'pequeno-medio': 'small-medium', 'medio': 'medium', 'medio-grande': 'medium-large', 'grande': 'large'}
SIZE_PT = {'small': 'Pequeno', 'small-medium': 'Pequeno/Médio', 'medium': 'Médio', 'medium-large': 'Médio/Grande', 'large': 'Grande'}

# CAPA confirmed: died, or left the shelter earlier and must be excluded.
REMOVE = {'nobita': 'deceased', 'patty': 'deceased', 'serena': 'deceased', 'mac': 'excluded'}
ADOPT = {'becas', 'esmerelda', 'nemo', 'kiki'}
RENAME = {'esmerelda': 'Esmeralda'}
# Generic placeholder texts that never came from the shelter records.
BLANK_STORY = {'bella', 'bolt', 'mouse'}
FOSTER_HOTEL = {'dorito'}

# Public copy must not use em/en dashes; these are the shelter's sentences rewritten.
NOTE_REWRITE = {
    'Capitão': 'Dá-se com crianças desde que não lhe tentem levantar as patas, e o mesmo vale para adultos. Não pode viver junto ou perto de gado: cabras, ovelhas e sobretudo vacas.',
    'Puma': 'Não aceita contacto humano. Está fora do processo de adoção comum: qualquer interesse passa obrigatoriamente pela equipa.',
    'Rocky': 'Raça abrangida pela legislação de cães potencialmente perigosos. A adoção tem requisitos legais próprios, a confirmar com a equipa.',
}
STORY_REWRITE = {
    'Kira': 'Encontrada com outra cadela perto de uma zona de caça. Mais dois abandonos provenientes de caçadores.',
    'Leila': 'Encontrada numa estrada muito movimentada, quase atropelada. Vinha com marca de coleira: certamente mais uma que vivia à corrente.',
}
FOSTER_SENTENCE = re.compile(r'\s*Está (em família de acolhimento temporário|num hotel de acolhimento), não nas boxes [—-] continua à espera de família definitiva\. A visita combina-se com a equipa\.')


def no_dashes(text: str, where: str) -> str:
    if '—' in text or '–' in text:
        raise SystemExit(f'dash left in {where}: {text}')
    return text


def soc(kind: str, value: str | None) -> str:
    if value == 'sim':
        return f'Sociável com {kind}'
    if value == 'nao':
        return f'Não sociável com {kind}'
    return f'Não sabemos se é sociável com {kind}'


def medical(saude: str) -> str:
    # "Chipada, vacinada e esterilizada" -> "Chipada, Vacinada, Esterilizada"
    parts = [p.strip() for p in re.split(r',| e ', saude) if p.strip()]
    return ', '.join(p[:1].upper() + p[1:] for p in parts)


def build_description(r: dict, size: str, foster: str | None, note: str | None, story: str) -> str:
    lines = []
    lines.append(f"Sexo: {'Feminino' if r['sexo'] == 'F' else 'Masculino'}")
    if r.get('nasc'):
        lines.append(f"Idade: Nasceu em {r['nasc']}")
    if r.get('desde'):
        lines.append(f"Data de entrada: {r['desde']}")
    if r.get('raca'):
        lines.append(f"Raça: {r['raca']}")
    lines.append(f'Porte: {SIZE_PT[size]}')
    if r.get('personalidade'):
        lines.append(f"Personalidade: {r['personalidade']}")
    lines.append(soc('humanos', r.get('humanos')))
    lines.append(soc('machos', r.get('machos')))
    lines.append(soc('fêmeas', r.get('femeas')))
    lines.append(soc('gatos', r.get('gatos')))
    if r.get('saude'):
        lines.append(medical(r['saude']))
    if foster:
        lines.append(f'Acolhimento: {foster}')
    if note:
        lines.append(f'Nota: {note}')
    lines.append(f'História: {story}')
    return '\n'.join(lines)


def trim_to_sentence(story: str) -> str:
    story = story.strip()
    if not story or story[-1] in '.!?…':
        return story
    cut = max(story.rfind('. '), story.rfind('! '), story.rfind('? '))
    return story[: cut + 1] if cut > 0 else ''


def replace_story(description: str, story: str) -> str:
    desc = description.replace('\\n', '\n')
    head = re.split(r'\n?História:', desc)[0] if 'História:' in desc else desc
    if not re.search(r'^Sexo:', head, re.M):
        head = ''
    head = head.rstrip('\n')
    if not story:
        return head
    return f'{head}\nHistória: {story}' if head else f'História: {story}'


public, removed, report = [], [], []
seen = set()

for r in records:
    key = norm(r['nome'])
    size = SIZE[r['porte']]
    foster = None
    note = r.get('nota')
    if note and FOSTER_SENTENCE.search(note):
        foster = 'Hotel de acolhimento' if key in FOSTER_HOTEL else 'Família de acolhimento temporário'
        note = FOSTER_SENTENCE.sub('', note).strip() or None
    note = NOTE_REWRITE.get(r['nome'], note)
    story = STORY_REWRITE.get(r['nome'], r.get('historia', ''))
    if note:
        no_dashes(note, f"{r['nome']} nota")
    no_dashes(story, f"{r['nome']} historia")
    no_dashes(r.get('personalidade', ''), f"{r['nome']} personalidade")

    traits = {'energia': r['energia'], 'receio': r['receio'], 'carente': bool(r.get('carente'))}
    for k in ('aves', 'criancas'):
        if r.get(k):
            traits[k] = r[k]
    if r.get('fuga'):
        traits['fuga'] = True
    if r.get('padrinho'):
        traits['padrinho'] = True

    existing = live_by.get(key)
    name = existing['name'] if existing and slug(existing['name']) == slug(r['nome']) else r['nome']
    if existing and existing['name'] != r['nome']:
        report.append(f"name kept as live spelling: {existing['name']} (records: {r['nome']})")
    dog = {
        'id': existing['id'] if existing else str(uuid.uuid5(uuid.NAMESPACE_URL, f'capapvl.org/dog/{slug(r["nome"])}')),
        'name': name,
        'size': size,
        'sex': 'female' if r['sexo'] == 'F' else 'male',
        'age': f"Nasceu em {r['nasc']}" if r.get('nasc') else '',
        'description': build_description(r, size, foster, note, story),
        'photo_url': '',
        'photos': [],
        'is_adopted': False,
        'traits': traits,
        'created_at': existing['created_at'] if existing else NOW,
        'updated_at': NOW,
        '_new': existing is None,
    }
    if existing:
        dog['photos'] = [f"/images/dogs/{slug(name)}/{p.rsplit('/', 1)[1]}" for p in existing.get('photos') or []]
        dog['photo_url'] = dog['photos'][0] if dog['photos'] else ''
    else:
        # New dogs: photos committed under public/images/dogs/<slug>/ (from CAPA's Canva photo sheet).
        folder = ROOT / 'public/images/dogs' / slug(name)
        dog['photos'] = [f'/images/dogs/{slug(name)}/{f.name}' for f in sorted(folder.glob('photo-*.jpg'))] if folder.exists() else []
        dog['photo_url'] = dog['photos'][0] if dog['photos'] else ''
    public.append(dog)
    seen.add(key)

for d in live:
    key = norm(d['name'])
    if key in seen:
        continue
    if key in REMOVE:
        removed.append({**d, '_reason': REMOVE[key]})
        continue
    name = RENAME.get(key, d['name'])
    if key in BLANK_STORY:
        story = ''
    else:
        m = re.search(r'História:\s*([\s\S]*)', d['description'].replace('\\n', '\n'))
        story = trim_to_sentence(' '.join((m.group(1) if m else '').split()))
    # Sex from the old site placeholder texts ("A Bella é uma cadela", "O Bolt é um cão") and CAPA's doc.
    sex = d['sex'] or {'mouse': 'female', 'bella': 'female', 'bolt': 'male'}.get(key)
    photos = [f"/images/dogs/{slug(name)}/{p.rsplit('/', 1)[1]}" for p in d.get('photos') or []]
    public.append({
        'id': d['id'],
        'name': name,
        'size': d['size'],
        'sex': sex,
        'age': d['age'] or '',
        'description': replace_story(d['description'], story),
        'photo_url': photos[0] if photos else '',
        'photos': photos,
        'is_adopted': True if key in ADOPT else d['is_adopted'],
        'traits': {},
        'created_at': d['created_at'],
        'updated_at': NOW,
        '_new': False,
    })
    report.append(f"kept from site, not in records: {name} (adopted={key in ADOPT or d['is_adopted']})")

public.sort(key=lambda d: norm(d['name']))

for d in public:
    no_dashes(d['description'], d['name'])

clean = [{k: v for k, v in d.items() if not k.startswith('_')} for d in public]
(HERE / 'corrected-dogs.json').write_text(json.dumps(clean, ensure_ascii=False, indent=2) + '\n')
(HERE / 'removed-dogs.json').write_text(json.dumps(removed, ensure_ascii=False, indent=2) + '\n')


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    return "'" + str(v).replace("'", "''") + "'"


sql = [
    '-- CAPA corrections, October 2026. Generated by build-corrections.py; do not edit by hand.',
    '-- Take a backup first: pg_dump -Fc capapvl_db > capapvl_db-pre-2026-10.dump',
    'begin;',
    'alter table dogs drop constraint if exists dogs_size_check;',
    "alter table dogs add constraint dogs_size_check check (size = any (array['small','small-medium','medium','medium-large','large']));",
    "alter table dogs add column if not exists traits jsonb not null default '{}'::jsonb;",
]
for d in removed:
    sql.append(f"delete from dogs where id = {q(d['id'])}; -- {d['name']} ({d['_reason']})")
for d in public:
    cols = (q(d['name']), q(d['size']), q(d['sex']), q(d['age']), q(d['description']), q(json.dumps(d['traits'], ensure_ascii=False)) + '::jsonb', q(d['is_adopted']))
    if d['_new']:
        sql.append(
            'insert into dogs (id, name, size, sex, age, description, traits, is_adopted, photo_url, updated_at) values '
            f"({q(d['id'])}, {', '.join(cols)}, '', now());"
        )
    else:
        sql.append(
            f'update dogs set name = {cols[0]}, size = {cols[1]}, sex = {cols[2]}, age = {cols[3]}, description = {cols[4]}, '
            f"traits = {cols[5]}, is_adopted = {cols[6]}, updated_at = now() where id = {q(d['id'])};"
        )
sql.append('commit;')
(HERE / 'migration.sql').write_text('\n'.join(sql) + '\n')

ts = [
    "import type { Dog } from '../lib/capaApi';",
    '',
    '// Generated by scripts/capa-corrections-2026-10/build-corrections.py from CAPA\'s October 2026 records.',
    '// Public pages use this as the offline fallback if the Hetzner API is unavailable.',
    'export const capaDogs = ' + json.dumps(clean, ensure_ascii=False, indent=2) + ' satisfies Dog[];',
    '',
]
(ROOT / 'src/data/capaDogs.ts').write_text('\n'.join(ts))

print(f'public: {len(public)} ({sum(not d["is_adopted"] for d in public)} available, {sum(d["is_adopted"] for d in public)} adopted, {sum(d["_new"] for d in public)} new)')
print(f'removed: {[(d["name"], d["_reason"]) for d in removed]}')
print('\n'.join(report))
