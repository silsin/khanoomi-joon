export type JewelryPlacementType = "necklace" | "ring" | "bracelet" | "earring" | "default";

export interface TryonLayer {
  url: string;
  type: JewelryPlacementType;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}

/** Default overlay box per jewelry type (fractions of canvas size). */
function placementForType(type: JewelryPlacementType, cw: number, ch: number, index: number) {
  const offset = index * 0.04;
  switch (type) {
    case "necklace":
      return { x: cw * (0.22 + offset), y: ch * 0.2, w: cw * 0.56, h: ch * 0.18 };
    case "ring":
      return { x: cw * (0.52 + offset), y: ch * 0.58, w: cw * 0.2, h: cw * 0.2 };
    case "bracelet":
      return { x: cw * (0.06 + offset), y: ch * 0.52, w: cw * 0.24, h: cw * 0.24 };
    case "earring":
      return { x: cw * (0.66 + offset), y: ch * (0.06 + offset), w: cw * 0.14, h: cw * 0.14 };
    default:
      return { x: cw * (0.32 + offset), y: ch * 0.38, w: cw * 0.36, h: cw * 0.36 };
  }
}

/**
 * Combines the user photo with jewelry product images on a canvas.
 * Returns a JPEG data URL used as input for AI refinement.
 */
export async function buildTryonComposite(
  userPhotoDataUrl: string,
  layers: TryonLayer[],
  maxWidth = 768,
): Promise<string> {
  const userImg = await loadImage(userPhotoDataUrl);
  const scale = Math.min(1, maxWidth / userImg.naturalWidth);
  const w = Math.max(1, Math.round(userImg.naturalWidth * scale));
  const h = Math.max(1, Math.round(userImg.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.drawImage(userImg, 0, 0, w, h);

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    try {
      const jImg = await loadImage(layer.url);
      const box = placementForType(layer.type, w, h, i);
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.drawImage(jImg, box.x, box.y, box.w, box.h);
      ctx.restore();
    } catch {
      // Skip layers that fail to load (broken URL / CORS)
    }
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

export function detectJewelryTypeFromCategory(categoryName: string): JewelryPlacementType {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("گردنبند") || cat.includes("necklace") || cat.includes("chain")) return "necklace";
  if (cat.includes("انگشتر") || cat.includes("ring")) return "ring";
  if (cat.includes("دستبند") || cat.includes("bracelet") || cat.includes("bangle")) return "bracelet";
  if (cat.includes("گوشواره") || cat.includes("earring")) return "earring";
  return "default";
}
