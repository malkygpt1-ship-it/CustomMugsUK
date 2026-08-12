"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DELIVERY_PRICE, MAX_CART_ITEMS, MUGS } from "@/lib/catalogue";

const TEMPLATE_NAMES = [
  "Bad",
  "Birthday",
  "Bossy",
  "Brainy",
  "Brave",
  "Busy",
  "Chatterbox",
  "Christmas",
  "Contrary",
  "Curious",
  "Dotty",
  "Fabulous",
  "Fickle",
  "Fun",
  "Giggles",
  "Greedy",
  "Helpful",
  "Hug",
  "Inventor",
  "Late",
  "Lucky",
  "Magic",
  "Naughty",
  "Neat",
  "Princess",
  "Quick",
  "Scary",
  "Scatterbrain",
  "Shy",
  "Somersault",
  "Sparkle",
  "Splendid",
  "Star",
  "Stubborn",
  "Sunshine",
  "Surprise",
  "Tidy",
  "Tiny",
  "Trouble",
  "Twins",
  "Whoops",
  "Wise",
] as const;

const FONT_OPTIONS = [
  { label: "Playful", value: "Bangers" },
  { label: "Rounded", value: "Fredoka" },
  { label: "Handwritten", value: "Pacifico" },
  { label: "Classic", value: "Playfair Display" },
  { label: "Friendly", value: "Roboto Slab" },
] as const;

const COLOUR_PRESETS = [
  "#012169",
  "#c8102e",
  "#171717",
  "#005eb8",
  "#6f2c91",
  "#007a3d",
] as const;

const DESIGN_SIZE = 1050;

type MugSize = keyof typeof MUGS;
type TemplateName = (typeof TEMPLATE_NAMES)[number];
type FontName = (typeof FONT_OPTIONS)[number]["value"];

type CartItem = {
  id: string;
  size: MugSize;
  template: TemplateName;
  title: string;
  name: string;
  font: FontName;
  colour: string;
  price: number;
  preview: string;
};

function formatPrice(pennies: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pennies / 100);
}

function createClientId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
  font: FontName,
  colour: string,
) {
  let fontSize = initialSize;
  const displayText = text.trim() || "Your words here";

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = colour;

  while (fontSize > minimumSize) {
    context.font = `400 ${fontSize}px "${font}", sans-serif`;
    if (context.measureText(displayText).width <= maxWidth) break;
    fontSize -= 2;
  }

  context.fillText(displayText, x, y, maxWidth);
}

function dataUrlToImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The saved design could not be read."));
    image.src = dataUrl;
  });
}

async function createPrintBlob(item: CartItem) {
  const mug = MUGS[item.size];
  const output = document.createElement("canvas");
  output.width = mug.exportWidth;
  output.height = mug.exportHeight;

  const context = output.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the print file.");

  const design = await dataUrlToImage(item.preview);
  const sideWidth = mug.exportWidth / 2;
  const xInset = (sideWidth - DESIGN_SIZE) / 2;
  const yInset = (mug.exportHeight - DESIGN_SIZE) / 2;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(design, xInset, yInset, DESIGN_SIZE, DESIGN_SIZE);
  context.drawImage(
    design,
    sideWidth + xInset,
    yInset,
    DESIGN_SIZE,
    DESIGN_SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    output.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The print file could not be created."));
    }, "image/png");
  });
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M3.5 4.5h2l1.8 10.1a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 1.9-1.5l1.3-6.3H6.2M10 20a.8.8 0 1 1-1.6 0 .8.8 0 0 1 1.6 0Zm8 0a.8.8 0 1 1-1.6 0 .8.8 0 0 1 1.6 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MugMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" width="34" height="34">
      <path
        d="M8 9h20v16a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8V9Z"
        fill="#fff"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M28 13h2.5a5.5 5.5 0 0 1 0 11H28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M13 16c2-2 4-2 6 0s4 2 6 0"
        fill="none"
        stroke="#d63275"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export default function MugDesigner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<TemplateName>("Sunshine");
  const [title, setTitle] = useState("Sunshine");
  const [name, setName] = useState("Mum");
  const [font, setFont] = useState<FontName>("Bangers");
  const [colour, setColour] = useState("#012169");
  const [size, setSize] = useState<MugSize>("11oz");
  const [titleWasEdited, setTitleWasEdited] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [notice, setNotice] = useState("");

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await document.fonts.load(`400 90px "${font}"`);

    const image = new Image();
    image.decoding = "async";
    image.src = `/templates-base/${template}.png`;
    await image.decode();

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, DESIGN_SIZE, DESIGN_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, DESIGN_SIZE, DESIGN_SIZE);

    drawFittedText(
      context,
      title,
      525,
      210,
      720,
      94,
      42,
      font,
      colour,
    );
    drawFittedText(
      context,
      name,
      525,
      956,
      760,
      92,
      42,
      font,
      colour,
    );
  }, [colour, font, name, template, title]);

  useEffect(() => {
    let cancelled = false;
    drawCanvas().catch(() => {
      if (!cancelled) setNotice("That design took a wee moment to load. Try again.");
    });
    return () => {
      cancelled = true;
    };
  }, [drawCanvas]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    let nextNotice = "";
    if (search.get("paid") === "1") {
      nextNotice = "Payment received — your personalised mug is in the works.";
    } else if (search.get("checkout") === "cancelled") {
      nextNotice = "Checkout cancelled. Your design is still here to edit.";
    }

    if (!nextNotice) return;
    const timer = window.setTimeout(() => setNotice(nextNotice), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!cartOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartOpen]);

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.price, 0),
    [cart],
  );

  function selectTemplate(nextTemplate: TemplateName) {
    setTemplate(nextTemplate);
    if (!titleWasEdited) setTitle(nextTemplate);
  }

  async function addToCart() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await drawCanvas();
    const mug = MUGS[size];
    const item: CartItem = {
      id: createClientId(),
      size,
      template,
      title: title.trim() || "Your words here",
      name: name.trim() || "Your name here",
      font,
      colour,
      price: mug.price,
      preview: canvas.toDataURL("image/png"),
    };

    setCart((current) => [...current, item].slice(-MAX_CART_ITEMS));
    setCheckoutError("");
    setCartOpen(true);
  }

  async function beginCheckout() {
    if (!cart.length || isCheckingOut) return;

    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const uploadedItems = [];

      for (const item of cart) {
        const blob = await createPrintBlob(item);
        const formData = new FormData();
        formData.set("size", item.size);
        formData.set("design", blob, `custom-mug-${item.size}-${item.id}.png`);

        const uploadResponse = await fetch("/api/designs", {
          method: "POST",
          body: formData,
        });
        const uploadResult = (await uploadResponse.json()) as {
          design?: { storageKey: string; storageUrl?: string };
          error?: string;
        };

        if (!uploadResponse.ok || !uploadResult.design) {
          throw new Error(uploadResult.error || "A print file could not be saved.");
        }

        uploadedItems.push({
          id: item.id,
          size: item.size,
          template: item.template,
          title: item.title,
          name: item.name,
          font: item.font,
          colour: item.colour,
          storageKey: uploadResult.design.storageKey,
          storageUrl: uploadResult.design.storageUrl,
        });
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: uploadedItems }),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error || "Checkout could not be started.");
      }

      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Checkout could not be started. Please try again.",
      );
      setIsCheckingOut(false);
    }
  }

  const mug = MUGS[size];

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#designer" aria-label="Custom Mugs UK home">
          <span className="brand-mark">
            <MugMark />
          </span>
          <span>
            <strong>Custom Mugs UK</strong>
            <small>made personal</small>
          </span>
        </a>

        <div className="topbar-note">
          <span className="status-dot" /> UK delivery · print-ready both sides
        </div>

        <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>
          <CartIcon />
          <span>Basket</span>
          <b aria-label={`${cart.length} items in basket`}>{cart.length}</b>
        </button>
      </header>

      <main className="workspace" id="designer">
        <section className="canvas-panel" aria-label="Mug design canvas">
          <div className="canvas-heading">
            <div>
              <span className="eyebrow">Design desk</span>
              <strong>{template}</strong>
            </div>
            <span className="dimension-pill">
              {mug.exportWidth} × {mug.exportHeight}px
            </span>
          </div>

          <div className="canvas-wrap">
            <div className="canvas-mat">
              <canvas
                ref={canvasRef}
                width={DESIGN_SIZE}
                height={DESIGN_SIZE}
                aria-label={`Preview of the ${template} personalised mug design`}
              />
            </div>
            <span className="side-note side-note-left">Front</span>
            <span className="side-note side-note-right">Back</span>
          </div>

          <div className="template-section">
            <div className="template-label">
              <strong>Pick a favourite</strong>
              <span>{TEMPLATE_NAMES.length} designs</span>
            </div>
            <div className="template-rail" aria-label="Character templates">
              {TEMPLATE_NAMES.map((templateName) => (
                <button
                  className={`template-card ${templateName === template ? "is-active" : ""}`}
                  key={templateName}
                  type="button"
                  onClick={() => selectTemplate(templateName)}
                  aria-pressed={templateName === template}
                >
                  <img
                    alt=""
                    src={`/templates-base/${templateName}.png`}
                    loading="lazy"
                  />
                  <span>{templateName}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="controls-panel" aria-label="Personalisation controls">
          <div className="control-heading">
            <span className="eyebrow">Custom Mugs UK</span>
            <h1>Make their cuppa personal</h1>
            <p>Choose a design, add your words, and create a proper one-off.</p>
          </div>

          <fieldset className="control-group size-group">
            <legend><span>1</span> Mug size</legend>
            <div className="size-options">
              {(Object.keys(MUGS) as MugSize[]).map((mugSize) => (
                <button
                  className={mugSize === size ? "is-active" : ""}
                  key={mugSize}
                  type="button"
                  onClick={() => setSize(mugSize)}
                  aria-pressed={mugSize === size}
                >
                  <span>{MUGS[mugSize].label}</span>
                  <strong>{formatPrice(MUGS[mugSize].price)}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="control-group">
            <legend><span>2</span> Your words</legend>
            <label className="field-label" htmlFor="title-text">
              Title
              <input
                id="title-text"
                value={title}
                maxLength={28}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setTitleWasEdited(true);
                }}
                placeholder="e.g. Sunshine"
              />
              <small>{title.length}/28</small>
            </label>
            <label className="field-label" htmlFor="name-text">
              Name
              <input
                id="name-text"
                value={name}
                maxLength={24}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Mum"
              />
              <small>{name.length}/24</small>
            </label>
          </fieldset>

          <fieldset className="control-group style-group">
            <legend><span>3</span> Text style</legend>
            <label className="select-label" htmlFor="font-select">
              Font
              <select
                id="font-select"
                value={font}
                onChange={(event) => setFont(event.target.value as FontName)}
                style={{ fontFamily: `"${font}", sans-serif` }}
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="colour-control">
              <span>Colour</span>
              <label className="colour-picker" title="Choose any text colour">
                <input
                  type="color"
                  value={colour}
                  onChange={(event) => setColour(event.target.value)}
                  aria-label="Choose any text colour"
                />
                <i style={{ backgroundColor: colour }} />
              </label>
              {COLOUR_PRESETS.map((preset) => (
                <button
                  className={preset === colour ? "is-active" : ""}
                  key={preset}
                  type="button"
                  aria-label={`Use text colour ${preset}`}
                  aria-pressed={preset === colour}
                  onClick={() => setColour(preset)}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </fieldset>

          <div className="order-action">
            <div>
              <span>{mug.label} personalised mug</span>
              <strong>{formatPrice(mug.price)}</strong>
            </div>
            <button type="button" onClick={addToCart}>
              Add to basket <span aria-hidden="true">→</span>
            </button>
            <small>Dishwasher safe · made to order · UK delivery</small>
          </div>
        </aside>
      </main>

      {notice ? (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      ) : null}

      <div className={`cart-layer ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen}>
        <button
          className="cart-backdrop"
          type="button"
          onClick={() => setCartOpen(false)}
          aria-label="Close cart"
          tabIndex={cartOpen ? 0 : -1}
        />
        <section className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping basket">
          <div className="cart-header">
            <div>
              <span className="eyebrow">Your order</span>
              <h2>Your mug basket</h2>
            </div>
            <button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">
              ×
            </button>
          </div>

          <div className="cart-items">
            {cart.length ? (
              cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  <img src={item.preview} alt={`Preview of ${item.template} mug`} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.name} · {MUGS[item.size].label}</span>
                    <small>{item.template} character</small>
                  </div>
                  <div className="cart-item-price">
                    <strong>{formatPrice(item.price)}</strong>
                    <button
                      type="button"
                      onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-cart">
                <span><MugMark /></span>
                <h3>Your basket is empty</h3>
                <p>Finish your design, then add it here.</p>
                <button type="button" onClick={() => setCartOpen(false)}>Back to designing</button>
              </div>
            )}
          </div>

          {cart.length ? (
            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <div><span>UK delivery</span><strong>{formatPrice(DELIVERY_PRICE)}</strong></div>
              <div className="cart-total"><span>Total</span><strong>{formatPrice(subtotal + DELIVERY_PRICE)}</strong></div>
              {checkoutError ? <p className="checkout-error" role="alert">{checkoutError}</p> : null}
              <button type="button" onClick={beginCheckout} disabled={isCheckingOut}>
                {isCheckingOut ? "Saving your print files…" : "Secure checkout"}
              </button>
              <small>Payment is handled securely by Stripe.</small>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
