type ObjectBucket = {
  put(
    key: string,
    value: ArrayBuffer | string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
};

export type PlatformEnvironment = Record<string, unknown> & {
  BUCKET?: ObjectBucket;
};

export type StoredObject = {
  key: string;
  url?: string;
};

export async function getPlatformEnvironment(): Promise<PlatformEnvironment> {
  try {
    const cloudflareModule = "cloudflare:workers";
    const workers = (await import(cloudflareModule)) as {
      env?: PlatformEnvironment;
    };
    return workers.env ?? {};
  } catch {
    return {};
  }
}

export function runtimeString(
  environment: PlatformEnvironment,
  key: string,
) {
  const platformValue = environment[key];
  if (typeof platformValue === "string" && platformValue.trim()) {
    return platformValue.trim();
  }

  const processValue = process.env[key];
  return typeof processValue === "string" && processValue.trim()
    ? processValue.trim()
    : undefined;
}

export async function storePrivateObject(
  environment: PlatformEnvironment,
  key: string,
  value: ArrayBuffer | string,
  contentType: string,
): Promise<StoredObject> {
  if (environment.BUCKET) {
    await environment.BUCKET.put(key, value, {
      httpMetadata: { contentType },
    });
    return { key };
  }

  const token = runtimeString(environment, "BLOB_READ_WRITE_TOKEN");
  if (!token) {
    throw new Error("Private artwork storage has not been connected yet.");
  }

  const { put } = await import("@vercel/blob");
  const body = new Blob([value], { type: contentType });
  const blob = await put(key, body, {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token,
  });

  return { key, url: blob.url };
}
