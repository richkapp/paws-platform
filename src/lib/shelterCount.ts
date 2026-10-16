import { capaDogs } from '../data/capaDogs';

/** Dogs currently waiting for a home (at the shelter or in foster care), from the build-time snapshot. */
export const shelterDogCount = capaDogs.filter((dog) => !dog.is_adopted).length;

const API_BASE_URL = (import.meta.env.PUBLIC_CAPA_API_URL || '').replace(/\/$/, '');

/** Replace every [data-shelter-count] with the live number of available dogs. Keeps the build-time number if the API is unreachable. */
export async function refreshShelterCount(): Promise<void> {
  const targets = document.querySelectorAll<HTMLElement>('[data-shelter-count]');
  if (!targets.length || !API_BASE_URL) return;
  try {
    const response = await fetch(`${API_BASE_URL}/dogs`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const data = (await response.json()) as { dogs?: unknown[] };
    if (!Array.isArray(data.dogs) || data.dogs.length === 0) return;
    const count = String(data.dogs.length);
    targets.forEach((el) => { el.textContent = count; el.dataset.target = count; });
  } catch {
    // keep the build-time number
  }
}
