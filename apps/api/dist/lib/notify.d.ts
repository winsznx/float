export declare function notifyClaim(params: {
    email: string;
    amount: number;
    claimToken: string;
}): Promise<void>;
export declare function notifySettleRequest(params: {
    email: string;
    splitName: string | null;
    share: number;
    token: string;
}): Promise<void>;
export declare function notifyLeashGranted(params: {
    email: string;
    limit: number;
    token: string;
}): Promise<void>;
export declare function notifyWitness(params: {
    email: string;
    goal: string;
    stake: number;
    token: string;
    userId?: string | null;
}): Promise<void>;
