import type { DogSize, DogTraits } from './dogFacts';

export type Dog = {
  id: string;
  name: string;
  size: DogSize;
  sex: 'male' | 'female' | null;
  age: string;
  description: string;
  photo_url: string;
  photos?: string[];
  is_adopted: boolean;
  traits?: DogTraits;
  created_at: string;
  updated_at: string;
};

type LoginResponse = {
  token: string;
};

type DogResponse = {
  dog: Dog;
};

type DogsResponse = {
  dogs: Dog[];
};

const API_BASE_URL = (import.meta.env.PUBLIC_CAPA_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'capa-admin-api-token';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error('CAPA API URL is not configured');

  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `CAPA API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) ?? '';
}

function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export const capaApi = API_BASE_URL
  ? {
      baseUrl: API_BASE_URL,
      hasToken: () => Boolean(getToken()),
      clearToken,
      async login(email: string, password: string): Promise<void> {
        const data = await request<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
      },
      async getDogs(includeAdopted = false): Promise<Dog[]> {
        const data = await request<DogsResponse>(`/dogs?includeAdopted=${includeAdopted ? 'true' : 'false'}`);
        return data.dogs;
      },
      async getDog(id: string): Promise<Dog | null> {
        try {
          const data = await request<DogResponse>(`/dogs/${encodeURIComponent(id)}`);
          return data.dog;
        } catch {
          return null;
        }
      },
      async createDog(payload: Partial<Dog>): Promise<Dog> {
        const data = await request<DogResponse>('/dogs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return data.dog;
      },
      async updateDog(id: string, payload: Partial<Dog>): Promise<Dog> {
        const data = await request<DogResponse>(`/dogs/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return data.dog;
      },
      async deleteDog(id: string): Promise<void> {
        await request(`/dogs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
      async uploadPhotos(id: string, files: File[]): Promise<Dog> {
        const form = new FormData();
        files.forEach((file) => form.append('photos', file));
        const data = await request<DogResponse>(`/dogs/${encodeURIComponent(id)}/photos`, {
          method: 'POST',
          body: form,
        });
        return data.dog;
      },
      async deletePhoto(id: string, filename: string): Promise<Dog> {
        const data = await request<DogResponse>(`/dogs/${encodeURIComponent(id)}/photos/${encodeURIComponent(filename)}`, {
          method: 'DELETE',
        });
        return data.dog;
      },
    }
  : null;
