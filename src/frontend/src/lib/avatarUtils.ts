/**
 * Converts a Uint8Array profile picture to a blob URL.
 * Returns null if no picture data is provided.
 * Caller is responsible for revoking the URL when done.
 */
export function profilePictureToBlobUrl(
  picture: Uint8Array | null | undefined,
): string | null {
  if (!picture || picture.length === 0) return null;
  const safeBytes =
    picture instanceof Uint8Array ? picture : new Uint8Array(picture);
  const blob = new Blob([safeBytes as unknown as BlobPart], {
    type: "image/jpeg",
  });
  return URL.createObjectURL(blob);
}

/**
 * Derives initials from a display name (up to 2 characters).
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
