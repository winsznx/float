/**
 * Pledge failure destinations.
 *
 * The contract itself is address-agnostic — `failureDestination` is a
 * per-pledge parameter guarded only by `!= address(0)`. This list is the
 * picker's options, not contract state.
 *
 * Burn is locked and safe. Gitcoin and the DAO treasury route real value to
 * real organizations, so their addresses come from env and are deliberately
 * NOT hardcoded from memory — an address typo here silently sends someone's
 * stake into the void. Until they are configured, those options are marked
 * unavailable rather than shipped with a plausible-looking guess.
 */
export type FailureDestination = {
    id: string;
    label: string;
    address: string | null;
    available: boolean;
};
export declare function listDestinations(): FailureDestination[];
export declare const FAILURE_DESTINATIONS: FailureDestination[];
export declare function resolveDestination(id: string, customAddress?: string): {
    id: string;
    label: string;
    address: string;
};
