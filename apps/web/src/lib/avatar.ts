"use client";

import { createClient } from "@supabase/supabase-js";
import { readSession } from "@/lib/session";
import { api } from "@/lib/api";

/**
 * Avatar upload.
 *
 * The identity page previously made a local object URL from the chosen file
 * and nothing else — the photo was never uploaded and disappeared on reload.
 *
 * Uploads go to <user_id>/<filename> so storage RLS can enforce ownership by
 * path; one user cannot overwrite another's avatar.
 */
const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadAvatar(file: File): Promise<string> {
  const session = readSession();
  if (!session) throw new Error("Sign in to upload a photo.");

  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Images must be under 2MB.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Storage isn't configured.");

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } },
  });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${session.userId}/avatar.${extension}`;

  const { error } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = client.storage.from("avatars").getPublicUrl(path);
  await api.auth.setAvatar.mutate({ avatarUrl: data.publicUrl });

  // The top bar reads the profile once on mount, so without this the avatar
  // there stays an empty circle until a full reload.
  window.dispatchEvent(new CustomEvent("float:profile", { detail: data.publicUrl }));

  return data.publicUrl;
}
