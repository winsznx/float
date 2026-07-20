export type ReceiptImageData = {
  amount: number;
  recipientLabel: string;
  senderHandle: string | null;
  timestamp: number;
  note?: string | null;
  status?: string | null;
  txId?: string | null;
};

type ReceiptRow = {
  label: string;
  value: string;
};

type FontSpec = {
  size: number;
  family: string;
  weight?: number;
  italic?: boolean;
  spacing?: string;
};

const PAGE_WIDTH = 1080;
const PAGE_HEIGHT = 1350;

/** Fixed rather than devicePixelRatio so the exported file is identical on every screen. */
const SCALE = 3;

const MARGIN = 60;
/**
 * Scaled from the app's `shadow-[7px_7px_0_0]` on a ~384px card. Carrying the
 * literal 7px onto a 1080px card would render the brutalist offset as a
 * hairline — the same number, but not the same look.
 */
const SHADOW_OFFSET = 20;
const CARD_X = MARGIN;
const CARD_Y = MARGIN;
const CARD_WIDTH = PAGE_WIDTH - MARGIN * 2 - SHADOW_OFFSET;
const CARD_HEIGHT = PAGE_HEIGHT - MARGIN * 2 - SHADOW_OFFSET;
const CARD_RADIUS = 24;
const CARD_PADDING = 72;
const CONTENT_LEFT = CARD_X + CARD_PADDING;
const CONTENT_RIGHT = CARD_X + CARD_WIDTH - CARD_PADDING;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

const WORDMARK_BASELINE = CARD_Y + 128;
const STAMP_RADIUS = 26;
const AMOUNT_BASELINE = CARD_Y + 460;
const AMOUNT_MAX_SIZE = 128;
const AMOUNT_MIN_SIZE = 64;
const RECIPIENT_BASELINE = AMOUNT_BASELINE + 58;
const DIVIDER_Y = CARD_Y + 640;
const DIVIDER_HEIGHT = 2;
const ROW_FIRST_BASELINE = DIVIDER_Y + 76;
const ROW_STEP = 62;
const ROW_GAP = 32;
const ROW_SIZE = 26;
const NOTE_GAP = 64;
const NOTE_SIZE = 28;
const NOTE_LINE_HEIGHT = 40;
const NOTE_MAX_LINES = 3;
const FOOTER_BASELINE = CARD_Y + CARD_HEIGHT - 72;

const DISPLAY_FONT = '"Space Grotesk", system-ui, sans-serif';
const BODY_FONT = '"Inter", system-ui, sans-serif';
const MONO_FONT = '"IBM Plex Mono", ui-monospace, monospace';

const PAGE_COLOR = "#f3effa";
const SURFACE_COLOR = "#fdfbfe";
const INK_COLOR = "#1c1726";
const MUTED_COLOR = "#6b6478";
const FAINT_COLOR = "#948da3";
const ACCENT_COLOR = "#f2a683";
const SHADOW_COLOR = "rgba(28, 23, 38, 0.88)";

const RENDER_FAILURE = "Couldn't render the receipt image.";

const amountFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function applyFont(ctx: CanvasRenderingContext2D, spec: FontSpec): void {
  const style = spec.italic ? "italic " : "";
  ctx.font = `${style}${spec.weight ?? 400} ${spec.size}px ${spec.family}`;
  ctx.letterSpacing = spec.spacing ?? "0px";
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let end = text.length - 1;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end -= 1;
  }
  return `${text.slice(0, end)}…`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const fits = ctx.measureText(candidate).width <= maxWidth;

    if (fits || !current || lines.length + 1 === maxLines) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);

  return lines.map((line) => truncateToWidth(ctx, line, maxWidth));
}

function buildRows(data: ReceiptImageData): ReceiptRow[] {
  const rows: ReceiptRow[] = [
    {
      label: "From",
      value: data.senderHandle ? `@${data.senderHandle}` : "FLOAT",
    },
    {
      label: "Date",
      value: new Date(data.timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    },
  ];

  if (data.status) {
    rows.push({ label: "Status", value: data.status });
  }
  if (data.txId) {
    rows.push({ label: "Transaction", value: `${data.txId.slice(0, 10)}…` });
  }
  return rows;
}

function drawCard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAGE_COLOR;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  ctx.fillStyle = SHADOW_COLOR;
  ctx.beginPath();
  ctx.roundRect(
    CARD_X + SHADOW_OFFSET,
    CARD_Y + SHADOW_OFFSET,
    CARD_WIDTH,
    CARD_HEIGHT,
    CARD_RADIUS
  );
  ctx.fill();

  ctx.fillStyle = SURFACE_COLOR;
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(CARD_X, CARD_Y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  ctx.fill();
  ctx.stroke();
}

function drawHeader(ctx: CanvasRenderingContext2D): void {
  applyFont(ctx, {
    size: 40,
    family: DISPLAY_FONT,
    weight: 700,
    spacing: "0.3em",
  });
  ctx.textAlign = "left";
  ctx.fillStyle = INK_COLOR;
  ctx.fillText("FLOAT", CONTENT_LEFT, WORDMARK_BASELINE);

  ctx.beginPath();
  ctx.arc(
    CONTENT_RIGHT - STAMP_RADIUS,
    WORDMARK_BASELINE - 14,
    STAMP_RADIUS,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = ACCENT_COLOR;
  ctx.fill();
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function amountFontSize(ctx: CanvasRenderingContext2D, text: string): number {
  for (let size = AMOUNT_MAX_SIZE; size > AMOUNT_MIN_SIZE; size -= 4) {
    applyFont(ctx, { size, family: DISPLAY_FONT, weight: 700 });
    if (ctx.measureText(text).width <= CONTENT_WIDTH) return size;
  }
  return AMOUNT_MIN_SIZE;
}

function drawHeadline(ctx: CanvasRenderingContext2D, data: ReceiptImageData): void {
  const amountText = amountFormatter.format(data.amount);

  applyFont(ctx, {
    size: amountFontSize(ctx, amountText),
    family: DISPLAY_FONT,
    weight: 700,
  });
  ctx.textAlign = "left";
  ctx.fillStyle = INK_COLOR;
  ctx.fillText(
    truncateToWidth(ctx, amountText, CONTENT_WIDTH),
    CONTENT_LEFT,
    AMOUNT_BASELINE
  );

  applyFont(ctx, { size: 30, family: BODY_FONT });
  ctx.fillStyle = MUTED_COLOR;
  ctx.fillText(
    truncateToWidth(ctx, `to ${data.recipientLabel}`, CONTENT_WIDTH),
    CONTENT_LEFT,
    RECIPIENT_BASELINE
  );
}

function drawDivider(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = INK_COLOR;
  ctx.fillRect(CONTENT_LEFT, DIVIDER_Y, CONTENT_WIDTH, DIVIDER_HEIGHT);
}

function drawRows(ctx: CanvasRenderingContext2D, rows: ReceiptRow[]): number {
  rows.forEach((row, index) => {
    const baseline = ROW_FIRST_BASELINE + index * ROW_STEP;

    applyFont(ctx, { size: ROW_SIZE, family: BODY_FONT, weight: 500 });
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED_COLOR;
    ctx.fillText(row.label, CONTENT_LEFT, baseline);
    const labelWidth = ctx.measureText(row.label).width;

    applyFont(ctx, { size: ROW_SIZE, family: MONO_FONT, weight: 500 });
    ctx.textAlign = "right";
    ctx.fillStyle = INK_COLOR;
    ctx.fillText(
      truncateToWidth(ctx, row.value, CONTENT_WIDTH - labelWidth - ROW_GAP),
      CONTENT_RIGHT,
      baseline
    );
  });

  return ROW_FIRST_BASELINE + (rows.length - 1) * ROW_STEP;
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  note: string,
  afterBaseline: number
): void {
  applyFont(ctx, { size: NOTE_SIZE, family: BODY_FONT, italic: true });
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED_COLOR;

  const lines = wrapLines(ctx, note, CONTENT_WIDTH, NOTE_MAX_LINES);
  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      CONTENT_LEFT,
      afterBaseline + NOTE_GAP + index * NOTE_LINE_HEIGHT
    );
  });
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  applyFont(ctx, { size: 22, family: MONO_FONT, spacing: "0.14em" });
  ctx.textAlign = "left";
  ctx.fillStyle = FAINT_COLOR;
  ctx.fillText("float · your money, any chain", CONTENT_LEFT, FOOTER_BASELINE);
}

async function renderReceipt(data: ReceiptImageData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * SCALE;
  canvas.height = PAGE_HEIGHT * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(RENDER_FAILURE);

  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // next/font faces load asynchronously; measuring before they settle silently
  // falls back to system-ui and shifts every glyph position in the export.
  await document.fonts.ready;

  drawCard(ctx);
  drawHeader(ctx);
  drawHeadline(ctx, data);
  drawDivider(ctx);

  const lastRowBaseline = drawRows(ctx, buildRows(data));
  const note = data.note?.trim();
  if (note) drawNote(ctx, note, lastRowBaseline);

  drawFooter(ctx);
  return canvas;
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Renders the receipt to a 3240x4050 PNG and hands it to the browser as a
 * download. Everything drawn comes from `data` — there is no DOM capture, so
 * the output is identical regardless of viewport, theme, or device pixel ratio.
 */
export async function downloadReceiptImage(data: ReceiptImageData): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error(RENDER_FAILURE);
  }

  const canvas = await renderReceipt(data);
  const blob = await toPngBlob(canvas);
  if (!blob) throw new Error(RENDER_FAILURE);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `float-receipt-${data.timestamp}.png`;
  anchor.style.display = "none";
  document.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
