import { Magic } from "@magic-sdk/admin";
import { serviceDb } from "./supabase.js";
import { env } from "./env.js";
// Verified against @magic-sdk/admin@2.8.2 installed types:
//   Magic.init(secretKey) → MagicAdminSDK
//   sdk.token.validate(DIDToken)        (throws on invalid; returns void)
//   sdk.token.getIssuer(DIDToken)       → did:ethr:0x…
//   sdk.token.getPublicAddress(DIDToken)→ 0x…
//   sdk.users.getMetadataByToken(token) → {issuer, email, publicAddress, …}
let magicSdk = null;
async function magic() {
    if (!magicSdk)
        magicSdk = await Magic.init(env.magicSecretKey);
    return magicSdk;
}
/**
 * Verifies a Magic DID token server-side. Throws if the token is invalid,
 * expired, or tampered with — never trust the client's claimed address.
 */
export async function verifyMagicToken(didToken) {
    const sdk = await magic();
    sdk.token.validate(didToken);
    const metadata = await sdk.users.getMetadataByToken(didToken);
    const publicAddress = metadata.publicAddress ?? sdk.token.getPublicAddress(didToken);
    if (!publicAddress) {
        throw new Error("Magic returned no public address for this token");
    }
    return {
        issuer: metadata.issuer ?? sdk.token.getIssuer(didToken),
        publicAddress: publicAddress.toLowerCase(),
        email: metadata.email ?? null,
    };
}
/**
 * Wallet-derived email used as the Supabase auth identifier. Magic logins
 * always carry a real email, but wallet-connect users do not, so keying on the
 * address keeps one subject shape for both paths.
 */
function authEmailForAddress(address) {
    return `${address.toLowerCase()}@wallet.float.local`;
}
/**
 * Mints a Supabase session for a wallet address.
 *
 * Supabase signs the token itself (createUser → generateLink → verifyOtp), so
 * this works regardless of whether the project uses legacy HS256 or the newer
 * asymmetric signing keys. Hand-minting a JWT with the shared secret would
 * break the moment that key is revoked. Proven by
 * `npm run verify:session -w @float/db`.
 */
export async function mintSession(address, meta) {
    const db = serviceDb();
    const normalized = address.toLowerCase();
    const authEmail = authEmailForAddress(normalized);
    // Find or create the auth subject. createUser is the only call that tells us
    // "already exists", so we branch on that rather than listing every user.
    let userId = null;
    const { data: created, error: createError } = await db.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        user_metadata: {
            wallet_address: normalized,
            magic_issuer: meta.magicIssuer ?? null,
            contact_email: meta.email ?? null,
        },
    });
    if (created?.user) {
        userId = created.user.id;
    }
    else if (createError) {
        // Already registered — look them up and refresh their metadata.
        const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users.find((u) => u.email === authEmail);
        if (!existing)
            throw createError;
        userId = existing.id;
        await db.auth.admin.updateUserById(userId, {
            user_metadata: {
                wallet_address: normalized,
                magic_issuer: meta.magicIssuer ?? null,
                contact_email: meta.email ?? null,
            },
        });
    }
    if (!userId)
        throw new Error("could not resolve an auth user for this address");
    const { data: link, error: linkError } = await db.auth.admin.generateLink({
        type: "magiclink",
        email: authEmail,
    });
    if (linkError || !link.properties?.hashed_token) {
        throw linkError ?? new Error("Supabase returned no token hash");
    }
    const anon = (await import("@supabase/supabase-js")).createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
        type: "magiclink",
        token_hash: link.properties.hashed_token,
    });
    if (verifyError || !verified.session) {
        throw verifyError ?? new Error("Supabase issued no session");
    }
    // Ensure the public profile row exists. Written service-side because the
    // user's own session cannot insert until the row's id matches auth.uid(),
    // which is exactly what we are creating here.
    await db
        .from("users")
        .upsert({ id: userId, address: normalized, email: meta.email ?? null, magic_id: meta.magicIssuer ?? null }, { onConflict: "id" });
    return {
        userId,
        accessToken: verified.session.access_token,
        refreshToken: verified.session.refresh_token,
        address: normalized,
    };
}
//# sourceMappingURL=auth.js.map