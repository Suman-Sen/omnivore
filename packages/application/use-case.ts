import type { ProfileContext } from '../domain/profile';
export interface UseCase<Input, Output> {
  execute(context: ProfileContext, input: Input): Promise<Output>;
}
