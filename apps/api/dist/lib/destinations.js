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
// Nonzero, so it satisfies the contract's guard, and universally recognized.
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
export function listDestinations() {
    const gitcoin = process.env.PLEDGE_DESTINATION_GITCOIN_ADDRESS || null;
    const dao = process.env.PLEDGE_DESTINATION_DAO_ADDRESS || null;
    return [
        {
            id: "gitcoin",
            label: "Gitcoin Grants treasury",
            address: gitcoin,
            available: !!gitcoin,
        },
        {
            id: "dao",
            label: "Recognized DAO multisig",
            address: dao,
            available: !!dao,
        },
        {
            id: "burn",
            label: "Burn address",
            address: BURN_ADDRESS,
            available: true,
        },
    ];
}
export const FAILURE_DESTINATIONS = listDestinations();
export function resolveDestination(id, customAddress) {
    if (id === "custom") {
        if (!customAddress || !/^0x[a-fA-F0-9]{40}$/.test(customAddress)) {
            throw new Error("Enter a valid destination address.");
        }
        if (/^0x0{40}$/i.test(customAddress)) {
            throw new Error("The zero address can't receive a slashed stake.");
        }
        return { id: "custom", label: "Custom address", address: customAddress };
    }
    const match = listDestinations().find((d) => d.id === id);
    if (!match)
        throw new Error(`Unknown destination: ${id}`);
    if (!match.address) {
        throw new Error(`${match.label} isn't configured yet. Pick another destination or use a custom address.`);
    }
    return { id: match.id, label: match.label, address: match.address };
}
//# sourceMappingURL=destinations.js.map