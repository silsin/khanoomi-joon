import { NextRequest } from "next/server";
import { InferenceClient, InferenceClientHubApiError, InferenceClientProviderApiError } from "@huggingface/inference";
import { error } from "@/lib/response";
import { NextResponse } from "next/server";
import { getHuggingfaceToken } from "@/lib/settings";

const stylePrompts: Record<string, string> = {
  realistic:
    "photorealistic, natural lighting, realistic shadows on skin, professional jewelry photo",
  elegant: "elegant luxury jewelry photography, soft studio lighting, high-end magazine",
  artistic: "artistic portrait with beautiful gold jewelry, editorial fashion photo",
};

/** Image editing — refines a pre-composited user+jewelry photo. */
const EDIT_MODEL = "timbrooks/instruct-pix2pix";
/** Fallback img2img with low strength to preserve the composite. */
const IMG2IMG_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

function getHfErrorStatus(err: unknown): number {
  if (err instanceof InferenceClientHubApiError || err instanceof InferenceClientProviderApiError) {
    return err.httpResponse.status;
  }
  return 500;
}

function publicAiError(status: number, reason?: "not_configured"): string {
  if (reason === "not_configured") {
    return "قابلیت پرو مجازی هوشمند در حال حاضر غیرفعال است. لطفاً با پشتیبانی تماس بگیرید.";
  }
  if (status === 429) {
    return "درخواست‌های زیادی ارسال شده. لطفاً چند دقیقه صبر کنید و دوباره امتحان کنید.";
  }
  if (status === 402) {
    return "سرویس شلوغ است. لطفاً چند دقیقه بعد دوباره امتحان کنید.";
  }
  if (status === 503) {
    return "سیستم در حال آماده‌سازی است. حدود ۳۰ ثانیه صبر کنید و دوباره امتحان کنید.";
  }
  return "خطا در تولید تصویر. لطفاً دوباره امتحان کنید.";
}

function stripBase64(dataUrl: string): string {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = blob.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

function buildEditPrompt(jewelryName: string, style: string, extra?: string): string {
  const stylePrompt = stylePrompts[style] || stylePrompts.realistic;
  const extraBit = extra?.trim() ? ` ${extra.trim()}.` : "";
  return (
    `Make the gold jewelry "${jewelryName}" look naturally worn on this exact person. ` +
    `Keep the same face, pose, skin tone, and background. ` +
    `Blend the jewelry with realistic lighting and shadows. ${stylePrompt}.${extraBit}`
  );
}

async function refineWithAi(
  client: InferenceClient,
  compositeBlob: Blob,
  prompt: string,
): Promise<Blob | null> {
  try {
    return await client.imageToImage({
      model: EDIT_MODEL,
      inputs: compositeBlob,
      parameters: {
        prompt,
        num_inference_steps: 28,
        guidance_scale: 7.5,
      },
      provider: "auto",
    });
  } catch (e) {
    console.warn("instruct-pix2pix failed:", e);
  }

  try {
    return await client.imageToImage({
      model: IMG2IMG_MODEL,
      inputs: compositeBlob,
      parameters: {
        prompt,
        negative_prompt: "different person, wrong face, blurry, deformed, cartoon, watermark",
        strength: 0.28,
        num_inference_steps: 25,
        guidance_scale: 7,
      },
      provider: "auto",
    });
  } catch (e) {
    console.warn("img2img refinement failed:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const HF_TOKEN = getHuggingfaceToken();
  if (!HF_TOKEN) {
    console.warn("AI try-on: Hugging Face token not configured in admin settings");
    return error(publicAiError(503, "not_configured"), 503);
  }

  try {
    const body = await req.json();
    const {
      compositeImageBase64,
      userImageBase64,
      jewelryName = "gold jewelry",
      style = "realistic",
      extraPrompt = "",
    } = body;

    const sourceImage = compositeImageBase64 || userImageBase64;
    if (!sourceImage) {
      return error("لطفاً یک تصویر از خودتان آپلود کنید.");
    }

    if (!compositeImageBase64) {
      return error("لطفاً حداقل یک زیورآلات انتخاب کنید.");
    }

    const rawBase64 = stripBase64(sourceImage);
    const compositeBytes = Buffer.from(rawBase64, "base64");
    const compositeBlob = new Blob([compositeBytes], { type: "image/jpeg" });
    const compositeDataUrl = `data:image/jpeg;base64,${rawBase64}`;

    const prompt = buildEditPrompt(jewelryName, style, extraPrompt);
    const client = new InferenceClient(HF_TOKEN);

    const refined = await refineWithAi(client, compositeBlob, prompt);
    const image = refined ? await blobToDataUrl(refined) : compositeDataUrl;

    return NextResponse.json({
      success: true,
      data: {
        image,
        refined: Boolean(refined),
      },
    });
  } catch (e) {
    console.error("AI tryon error:", e);
    const status = getHfErrorStatus(e);
    return error(publicAiError(status), status >= 400 && status < 600 ? status : 500);
  }
}
