export interface KVNamespace {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(
    key: string, 
    value: string | ArrayBuffer | ReadableStream, 
    options?: { expiration?: number; expirationTtl?: number; metadata?: any }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; expiration?: number; metadata?: any }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export interface PagesContext<Env = Record<string, any>> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  data: Record<string, any>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
}

export type PagesFunction<Env = Record<string, any>> = (
  context: PagesContext<Env>
) => Response | Promise<Response>;
