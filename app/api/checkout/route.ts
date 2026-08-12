import {
  getPlatformEnvironment,
  runtimeString,
  storePrivateObject,
} from "@/lib/platform-storage";
import { DELIVERY_PRICE, MAX_CART_ITEMS, MUGS as CATALOGUE } from "@/lib/catalogue";

export const runtime = "edge";

const STORAGE_KEY_PATTERN =
  /^order-drafts\/[0-9a-f-]{36}\/personalised-mug-(11oz|15oz)\.png$/;

type MugSize = keyof typeof CATALOGUE;

type IncomingItem = {
  id?: string;
  size?: string;
  template?: string;
  title?: string;
  name?: string;
  font?: string;
  colour?: string;
  storageKey?: string;
  storageUrl?: string;
};

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maximumLength)
    : "";
}

function cleanStorageUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function randomLetters(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export async function POST(request: Request) {
  try {
    const environment = await getPlatformEnvironment();
    if (runtimeString(environment, "CHECKOUT_ENABLED") !== "true") {
      return Response.json(
        { error: "Checkout is not open just yet. Your design is still here to edit." },
        { status: 503 },
      );
    }

    const stripeKey =
      runtimeString(environment, "STRIPE_RESTRICTED_KEY") ??
      runtimeString(environment, "STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return Response.json(
        { error: "Secure checkout has not been connected yet." },
        { status: 503 },
      );
    }

    const parsed = (await request.json()) as { items?: IncomingItem[] };
    if (
      !Array.isArray(parsed.items) ||
      !parsed.items.length ||
      parsed.items.length > MAX_CART_ITEMS
    ) {
      return Response.json({ error: "Your basket is not valid." }, { status: 400 });
    }

    const items = parsed.items.map((incoming, index) => {
      const size = cleanText(incoming.size, 8) as MugSize;
      const product = CATALOGUE[size];
      if (!product) throw new Error(`Mug ${index + 1} has an invalid size.`);

      const storageKey = cleanText(incoming.storageKey, 180);
      const storageMatch = storageKey.match(STORAGE_KEY_PATTERN);
      if (!storageMatch || storageMatch[1] !== size) {
        throw new Error(`Mug ${index + 1} is missing its print-ready artwork.`);
      }

      return {
        id: cleanText(incoming.id, 80) || crypto.randomUUID(),
        size,
        product,
        template: cleanText(incoming.template, 40) || "Character",
        title: cleanText(incoming.title, 28) || "Personalised",
        name: cleanText(incoming.name, 24) || "Mug",
        font: cleanText(incoming.font, 40),
        colour: cleanText(incoming.colour, 12),
        storageKey,
        storageUrl: cleanStorageUrl(incoming.storageUrl),
      };
    });

    const draftId = crypto.randomUUID();
    const manifestKey = `order-drafts/${draftId}/order.json`;
    const storedItems = items.map((item) => ({
      id: item.id,
      size: item.size,
      template: item.template,
      title: item.title,
      name: item.name,
      font: item.font,
      colour: item.colour,
      printFileKey: item.storageKey,
      printFileUrl: item.storageUrl || undefined,
      width: item.product.exportWidth,
      height: item.product.exportHeight,
      price: item.product.price,
    }));

    await storePrivateObject(
      environment,
      manifestKey,
      JSON.stringify(
        {
          draftId,
          createdAt: new Date().toISOString(),
          currency: "gbp",
          status: "awaiting_payment",
          items: storedItems,
        },
        null,
        2,
      ),
      "application/json",
    );

    const requestOrigin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set(
      "success_url",
      `${requestOrigin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    );
    params.set("cancel_url", `${requestOrigin}/?checkout=cancelled`);
    params.set("customer_creation", "always");
    params.set("billing_address_collection", "auto");
    params.set("phone_number_collection[enabled]", "true");
    params.set("shipping_address_collection[allowed_countries][0]", "GB");
    params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    params.set(
      "shipping_options[0][shipping_rate_data][fixed_amount][amount]",
      String(DELIVERY_PRICE),
    );
    params.set(
      "shipping_options[0][shipping_rate_data][fixed_amount][currency]",
      "gbp",
    );
    params.set(
      "shipping_options[0][shipping_rate_data][display_name]",
      "UK standard delivery",
    );
    params.set(
      "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]",
      "business_day",
    );
    params.set(
      "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]",
      "3",
    );
    params.set(
      "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]",
      "business_day",
    );
    params.set(
      "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]",
      "7",
    );
    params.set("metadata[design_draft_id]", draftId);
    params.set("metadata[order_manifest_key]", manifestKey);
    params.set("metadata[item_count]", String(items.length));
    params.set("integration_identifier", `custom_mugs_uk_${randomLetters(8)}`);

    items.forEach((item, index) => {
      const prefix = `line_items[${index}]`;
      params.set(`${prefix}[quantity]`, "1");
      params.set(`${prefix}[price_data][currency]`, "gbp");
      params.set(`${prefix}[price_data][unit_amount]`, String(item.product.price));
      params.set(
        `${prefix}[price_data][product_data][name]`,
        `Personalised ${item.product.label} white glossy mug`,
      );
      params.set(
        `${prefix}[price_data][product_data][description]`,
        `${item.template} · ${item.title} · ${item.name}`.slice(0, 180),
      );
      params.set(
        `metadata[item_${index + 1}]`,
        `${item.size}|${item.template}|${item.title}|${item.name}`.slice(0, 480),
      );
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2026-06-24.dahlia",
      },
      body: params,
    });
    const stripeResult = (await stripeResponse.json()) as {
      url?: string;
      error?: { message?: string };
    };

    if (!stripeResponse.ok || !stripeResult.url) {
      return Response.json(
        { error: stripeResult.error?.message || "Stripe checkout could not be started." },
        { status: 502 },
      );
    }

    return Response.json({ url: stripeResult.url });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout could not be started. Please try again.",
      },
      { status: 400 },
    );
  }
}
