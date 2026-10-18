import { capaDogs } from '../data/capaDogs';

/** Dogs currently waiting for a home (at the shelter or in foster care), from the build-time snapshot. */
export const shelterDogCount = capaDogs.filter((dog) => !dog.is_adopted).length;

const API_BASE_URL = (import.meta.env.PUBLIC_CAPA_API_URL || '').replace(/\/$/, '');

/** Replace every [data-shelter-count] / [data-adopted-count] with live numbers of available / adopted dogs. Keeps the build-time number if the API is unreachable. */
export async function refreshShelterCount(): Promise<void> {
  const targets = document.querySelectorAll<HTMLElement>('[data-shelter-count]');
  const adoptedTargets = document.querySelectorAll<HTMLElement>('[data-adopted-count]');
  if ((!targets.length && !adoptedTargets.length) || !API_BASE_URL) return;
  try {
    const response = await fetch(`${API_BASE_URL}/dogs?includeAdopted=true`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const data = (await response.json()) as { dogs?: { is_adopted?: boolean }[] };
    if (!Array.isArray(data.dogs) || data.dogs.length === 0) return;
    const available = String(data.dogs.filter((d) => !d.is_adopted).length);
    const adopted = String(data.dogs.filter((d) => d.is_adopted).length);
    targets.forEach((el) => { el.textContent = available; el.dataset.target = available; });
    adoptedTargets.forEach((el) => { el.textContent = adopted; });
  } catch {
    // keep the build-time number
  }
}
