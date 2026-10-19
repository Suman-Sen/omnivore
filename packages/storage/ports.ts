import type { ProfileContext } from '../domain/profile';

export interface OwnedRecord { id: string; profileId: string; }
export interface Repository<T extends OwnedRecord> {
  get(context: ProfileContext, id: string): Promise<T | null>;
  save(context: ProfileContext, record: T): Promise<void>;
  delete(context: ProfileContext, id: string): Promise<void>;
}
export interface SecureCredentialStore {
  get(context: ProfileContext, reference: string): Promise<string | null>;
  set(context: ProfileContext, reference: string, secret: string): Promise<void>;
  remove(context: ProfileContext, reference: string): Promise<void>;
}
