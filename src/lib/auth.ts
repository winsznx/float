// TODO: replace mock with Magic Labs SDK (email link + embedded wallet provisioning).
export async function sendMagicLink(email: string): Promise<void> {
  console.log(`Mock magic link sent to ${email}`);
  await new Promise((resolve) => setTimeout(resolve, 800));
}
