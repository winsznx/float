export type MemberStatus = {
  input: string;
  amount: number;
  settled: boolean;
};

const MOCK_STATUS: MemberStatus[] = [
  { input: "jess.eth", amount: 42.5, settled: true },
  { input: "sam@example.com", amount: 42.5, settled: false },
  { input: "alex.eth", amount: 42.5, settled: false },
];

// TODO: replace mock with real split-link generation service.
export async function generateSplitLink(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const suffix = Math.random().toString(36).slice(2, 8);
  return `float.app/settle/${suffix}`;
}

// TODO: replace mock with real split status lookup (see PRD Split Flow, organizer dashboard).
export async function getSplitStatus(splitId: string): Promise<MemberStatus[]> {
  void splitId;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_STATUS;
}
