const TOKEN_KEY = 'token';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  body?: unknown;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse(response: Response): Promise<unknown> {
  if (response.ok) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }

  if (response.status >= 400 && response.status < 500) {
    let message = 'Request failed';
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch {
      // use default message
    }
    throw new ApiError(message, response.status);
  }

  // 5xx
  throw new ApiError('Something went wrong', response.status);
}

async function request(
  url: string,
  method: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = {
    method,
    headers,
    ...rest,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const isMutation = MUTATION_METHODS.includes(method);

  try {
    const response = await fetch(url, init);
    return await handleResponse(response);
  } catch (error) {
    if (!isMutation) throw error;

    // Single automatic retry for mutation methods
    const retryResponse = await fetch(url, init);
    return await handleResponse(retryResponse);
  }
}

export const apiClient = {
  get: (url: string, options?: RequestOptions) => request(url, 'GET', options),
  post: (url: string, options?: RequestOptions) => request(url, 'POST', options),
  put: (url: string, options?: RequestOptions) => request(url, 'PUT', options),
  patch: (url: string, options?: RequestOptions) => request(url, 'PATCH', options),
  delete: (url: string, options?: RequestOptions) => request(url, 'DELETE', options),
};

export { ApiError };
export type { RequestOptions };
