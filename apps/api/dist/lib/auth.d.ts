export type MagicIdentity = {
    issuer: string;
    publicAddress: string;
    email: string | null;
};
/**
 * Verifies a Magic DID token server-side. Throws if the token is invalid,
 * expired, or tampered with — never trust the client's claimed address.
 */
export declare function verifyMagicToken(didToken: string): Promise<MagicIdentity>;
export type Session = {
    userId: string;
    accessToken: string;
    refreshToken: string;
    address: string;
};
/**
 * Mints a Supabase session for a wallet address.
 *
 * Supabase signs the token itself (createUser → generateLink → verifyOtp), so
 * this works regardless of whether the project uses legacy HS256 or the newer
 * asymmetric signing keys. Hand-minting a JWT with the shared secret would
 * break the moment that key is revoked. Proven by
 * `npm run verify:session -w @float/db`.
 */
export declare function mintSession(address: string, meta: {
    email?: string | null;
    magicIssuer?: string | null;
}): Promise<Session>;
