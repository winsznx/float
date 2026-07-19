import { api, linkFetch } from "@/lib/api";
import type { IdentityResolution } from "@/lib/identity";

export type MemberStatus = {
  id: string;
  input: string;
  amount: number;
  settled: boolean;
};

/** Creates the split, its members, and the share link — all persisted. */
export async function createSplit(params: {
  name?: string;
  totalAmount: number;
  method: "equal" | "custom" | "percentage";
  members: Array<{ ref: string; shareAmount: number }>;
}): Promise<{ id: string; shareUrl: string; members: MemberStatus[] }> {
  const split = await api.split.create.mutate(params);
  return {
    id: split.id,
    shareUrl: split.shareUrl,
    members: split.members.map((m) => ({
      id: m.id,
      input: m.member_ref,
      amount: m.share_amount,
      settled: m.settled,
    })),
  };
}

export async function getSplitStatus(splitId: string): Promise<MemberStatus[]> {
  const split = await api.split.get.query({ id: splitId });
  return (split.split_members ?? []).map((m) => ({
    id: m.id,
    input: m.member_ref,
    amount: m.share_amount,
    settled: m.settled,
  }));
}

/** Settles one member through the capability-token link. */
export async function settleMember(
  shareToken: string,
  memberId: string,
  txHash: string
): Promise<void> {
  await linkFetch(`/settle/${shareToken}`, {
    method: "POST",
    body: { memberId, txHash },
  });
}

export type { IdentityResolution };
