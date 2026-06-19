import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  correlationId: string;
  method?: string;
  path?: string;
  userId?: string | null;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
  run<T>(store: RequestContextStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  get(): RequestContextStore | undefined {
    return storage.getStore();
  },

  getCorrelationId(): string | undefined {
    return storage.getStore()?.correlationId;
  },
};
