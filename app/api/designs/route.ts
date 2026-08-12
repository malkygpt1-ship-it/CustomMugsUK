import {
  getPlatformEnvironment,
  runtimeString,
  storePrivateObject,
} from "@/lib/platform-storage";
import { MUGS } from "@/lib/catalogue";

export const runtime = "edge";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

type MugSize = keyof typeof MUGS;

function pngDimensions(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !pngSignature.every((byte, index) => bytes[index] === byte)
  ) {
    return null;
  }

  const view = new DataView(buffer);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

export async function POST(request: Request) {
  try {
    const environment = await getPlatformEnvironment();
    if (runtimeString(environment, "CHECKOUT_ENABLED") !== "true") {
      return Response.json(
        { error: "Checkout is not open just yet. Your design is safe on screen." },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const size = formData.get("size") as MugSize;
    const mug = MUGS[size];
    const file = formData.get("design");

    if (!mug) {
      return Response.json({ error: "Choose a valid mug size." }, { status: 400 });
    }
    if (
      !(file instanceof File) ||
      file.type !== "image/png" ||
      file.size > MAX_FILE_BYTES
    ) {
      return Response.json(
        { error: "That print file could not be accepted. Please try the design again." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const dimensions = pngDimensions(buffer);
    if (
      !dimensions ||
      dimensions.width !== mug.exportWidth ||
      dimensions.height !== mug.exportHeight
    ) {
      return Response.json(
        {
          error: `The ${size} print file must be ${mug.exportWidth} × ${mug.exportHeight}px.`,
        },
        { status: 400 },
      );
    }

    const uploadId = crypto.randomUUID();
    const storageKey = `order-drafts/${uploadId}/personalised-mug-${size}.png`;
    const stored = await storePrivateObject(
      environment,
      storageKey,
      buffer,
      "image/png",
    );

    return Response.json({
      design: {
        storageKey: stored.key,
        storageUrl: stored.url,
        width: mug.exportWidth,
        height: mug.exportHeight,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The print file could not be saved. Please try again.",
      },
      { status: 503 },
    );
  }
}
