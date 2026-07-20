export declare function issueNonce(address: string): {
    nonce: string;
    message: string;
};
/** Verifies and consumes. A nonce is never valid twice. */
export declare function consumeNonce(address: string, nonce: string): string | null;
