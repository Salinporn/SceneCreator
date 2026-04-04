function toDataUrl(image: string): string {
  if (image.startsWith("data:")) return image;
  return `data:image/png;base64,${image}`;
}

async function compressImageDataUrl(
  input: string,
  maxDimension: number,
  quality: number,
): Promise<string> {
  const src = toDataUrl(input);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = Math.max(img.width, img.height);
      const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(input);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      let out: string;
      try {
        out = canvas.toDataURL("image/webp", quality);
        if (!out.startsWith("data:image/webp")) {
          out = canvas.toDataURL("image/jpeg", quality);
        }
      } catch {
        out = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(out.length < input.length ? out : input);
    };
    img.onerror = () => resolve(input);
    img.src = src;
  });
}

function isWallpaperEntry(item: Record<string, unknown>): boolean {
  return (
    typeof item.wall_width === "number" &&
    typeof item.wall_height === "number" &&
    typeof item.image === "string"
  );
}

function hasWhiteboardImage(item: Record<string, unknown>): boolean {
  return typeof item.whiteboard_image === "string";
}

export async function compressWallpaperEntriesInDeployedItems(
  deployedItems: Record<string, unknown>,
  options?: { maxDimension?: number; quality?: number },
): Promise<Record<string, unknown>> {
  const maxDimension = options?.maxDimension ?? 1536;
  const quality = options?.quality ?? 0.78;

  const out: Record<string, unknown> = { ...deployedItems };

  await Promise.all(
    Object.keys(out).map(async (key) => {
      const raw = out[key];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const item = raw as Record<string, unknown>;

      if (isWallpaperEntry(item)) {
        const image = item.image;
        if (typeof image !== "string" || image.length < 500) return;

        const compressed = await compressImageDataUrl(image, maxDimension, quality);
        out[key] = { ...item, image: compressed };
        return;
      }

      if (hasWhiteboardImage(item)) {
        const wb = item.whiteboard_image;
        if (typeof wb !== "string" || wb.length < 500) return;

        const compressed = await compressImageDataUrl(wb, maxDimension, quality);
        out[key] = { ...item, whiteboard_image: compressed };
      }
    }),
  );

  return out;
}
