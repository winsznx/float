// TODO: replace mock with real handle registry / ENS availability lookup.
export async function checkHandleAvailability(handle: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return !handle.toLowerCase().includes("taken");
}
