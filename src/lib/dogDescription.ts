/** Descriptions are stored in Portuguese; buildDescription writes História last. */
export function parseDescription(raw: string) {
  const lines = raw.replace(/\\n/g, '\n').replace(/\r\n?/g, '\n').split('\n');
  const fields: { label: string; value: string }[] = [];
  const story: string[] = [];
  let inStory = false;
  let personality = '';
  let foster = '';
  let note = '';

  for (const rawLine of lines) {
    if (inStory) {
      // Every remaining line is narrative, even if it looks like metadata or a tag.
      story.push(rawLine);
      continue;
    }

    const line = rawLine.trim();
    const match = rawLine.match(/^\s*([^:]+):[ \t]*(.*)$/);
    if (match) {
      const [, label, value] = match;
      const key = label.trim().toLowerCase();
      if (key === 'história') {
        inStory = true;
        story.push(value);
      } else if (key === 'acolhimento') {
        foster = value.trim();
      } else if (key === 'nota') {
        note = value.trim();
      } else if (key === 'personalidade') {
        personality = value.trim();
      } else {
        fields.push({ label: label.trim(), value: value.trim() });
      }
    } else if (/^(Sociável|Não sociável|Não sabemos)/.test(line)) {
      fields.push({ label: '✓', value: line });
    } else if (/^(Chipad|Vacinad|Esterilizad|Castrad)/.test(line)) {
      fields.push({ label: '🏥', value: line });
    } else {
      // Legacy unstructured descriptions also retain their line/paragraph breaks.
      story.push(rawLine);
    }
  }

  return { fields, story: story.join('\n').trim(), personality, foster, note };
}
