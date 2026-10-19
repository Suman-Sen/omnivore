/** Issued by the local session layer after unlock; never trust a UI-selected ID alone. */
export interface ProfileContext {
  readonly profileId: string;
  readonly sessionId: string;
  readonly timezone: string;
}
