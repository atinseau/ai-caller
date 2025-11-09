

export class Api {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = `${import.meta.env.VITE_API_URL ?? ''}${baseUrl ?? ''}`;
  }

  get(path: string, options?: Omit<RequestInit, 'method'>) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
    });
  }

  patch(path: string, options?: Omit<RequestInit, 'method'>) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      ...options,
    });
  }
}
