import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Field, Modal, Panel, TextInput, useToast } from "@/components/dashboard/ui";
import { fromCaught, toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { DeleteMediaDialog, type MediaItem, type MediaUsage } from "./MediaLibrary";
import { uploadSiteMedia } from "@/lib/site-media.functions";
import { readAsBase64 } from "@/lib/read-as-base64";

export type FocalPoint = { x: number; y: number };

const RATIOS: { id: string; label: string; value: number | null }[] = [
  { id: "free", label: "Free shape", value: null },
  { id: "16:9", label: "16 : 9 — wide banner", value: 16 / 9 },
  { id: "4:3", label: "4 : 3 — card", value: 4 / 3 },
  { id: "1:1", label: "1 : 1 — square", value: 1 },
  { id: "3:2", label: "3 : 2 — photo", value: 3 / 2 },
];

const FRAME_W = 560;

export function ImageEditor({
  item,
  url,
  usage,
  focal,
  onClose,
  onChanged,
  onFocalChange,
}: {
  item: MediaItem;
  url: string | undefined;
  usage: MediaUsage[];
  focal: FocalPoint | null;
  onClose: () => void;
  onChanged: () => void;
  onFocalChange: (point: FocalPoint | null) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"details" | "crop" | "focal">("details");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [alt, setAlt] = useState(item.alt_text);
  const [tag, setTag] = useState(item.tag ?? "");
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    setAlt(item.alt_text);
    setTag(item.tag ?? "");
  }, [item]);

  async function saveDetails() {
    if (!alt.trim()) {
      toast("A description is required.", "error");
      return;
    }
    setSavingDetails(true);
    const { error } = await verifyRowsAffected(
      supabase
        .from("media")
        .update({ alt_text: alt.trim(), tag: tag.trim() || null })
        .eq("id", item.id),
    );
    setSavingDetails(false);
    if (error) return toast(toSafeErrorMessage(error, "Could not save those details."), "error");
    toast("Image details saved.");
    onChanged();
  }

  return (
    <Modal open title={item.alt_text} onClose={onClose} width={980}>
      <div className="space-y-5">
        <nav className="flex flex-wrap gap-2">
          {(
            [
              ["details", "Details & usage"],
              ["crop", "Crop, zoom & rotate"],
              ["focal", "Focal point"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "primary" : "secondary"}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </nav>

        {tab === "details" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-hidden rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)]">
              {url ? (
                <img
                  src={url}
                  alt={item.alt_text}
                  className="max-h-[420px] w-full object-contain"
                />
              ) : (
                <div className="p-10 text-center text-sm text-[color:var(--bp-muted)]">
                  Loading image…
                </div>
              )}
            </div>
            <div className="space-y-5">
              <Field
                label="Description (required)"
                help="Read aloud by screen readers and shown if the picture cannot load."
              >
                <TextInput value={alt} onChange={(e) => setAlt(e.target.value)} />
              </Field>
              <Field label="Category" help="Used to group and filter the library.">
                <TextInput
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="classroom"
                />
              </Field>
              <Button variant="primary" disabled={savingDetails} onClick={saveDetails}>
                {savingDetails ? "Saving…" : "Save details"}
              </Button>

              <Panel title="Where this image is used" padded>
                {usage.length === 0 ? (
                  <p className="text-sm text-[color:var(--bp-ink-2)]">
                    Not used anywhere on the site yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {usage.map((u, i) => (
                      <li key={i} className="text-sm text-[color:var(--bp-ink)]">
                        <span className="font-semibold">{u.where}</span>
                        <span className="text-[color:var(--bp-ink-2)]"> — {u.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Delete image
              </Button>
            </div>
          </div>
        )}

        {tab === "crop" && (
          <CropStudio
            item={item}
            url={url}
            onSaved={() => {
              toast("Cropped copy saved. The original is untouched.");
              onChanged();
            }}
          />
        )}

        {tab === "focal" && (
          <FocalPicker item={item} url={url} focal={focal} onChange={onFocalChange} />
        )}
      </div>

      <DeleteMediaDialog
        open={deleteOpen}
        item={item}
        usage={usage}
        onCancel={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          onChanged();
          onClose();
        }}
      />
    </Modal>
  );
}

/* ── Crop / zoom / rotate ───────────────────────────────────────────────── */

function CropStudio({
  item,
  url,
  onSaved,
}: {
  item: MediaItem;
  url: string | undefined;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [workingSrc, setWorkingSrc] = useState<string | undefined>(url);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [ratioId, setRatioId] = useState("16:9");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const uploadFn = useServerFn(uploadSiteMedia);

  useEffect(() => {
    setWorkingSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [url]);

  useEffect(() => {
    if (!workingSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = workingSrc;
  }, [workingSrc]);

  const ratio = RATIOS.find((r) => r.id === ratioId)?.value;
  const frameW = FRAME_W;
  const frameH = ratio ? Math.round(FRAME_W / ratio) : Math.round(FRAME_W * 0.62);

  const base = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1;
  const drawW = natural ? natural.w * base * zoom : 0;
  const drawH = natural ? natural.h * base * zoom : 0;

  const clamp = useCallback(
    (o: { x: number; y: number }) => {
      const maxX = Math.max(0, (drawW - frameW) / 2);
      const maxY = Math.max(0, (drawH - frameH) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
    },
    [drawW, drawH, frameW, frameH],
  );

  useEffect(() => {
    setOffset((o) => clamp(o));
  }, [clamp]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function rotate() {
    if (!workingSrc) return;
    const img = await loadImage(workingSrc);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    setWorkingSrc(canvas.toDataURL("image/png"));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function saveVersion() {
    if (!workingSrc || !natural) return;
    setBusy(true);
    try {
      const img = await loadImage(workingSrc);
      const scale = base * zoom;
      const sw = frameW / scale;
      const sh = frameH / scale;
      const sx = natural.w / 2 - offset.x / scale - sw / 2;
      const sy = natural.h / 2 - offset.y / scale - sh / 2;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare the image.");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.92));
      if (!blob) throw new Error("Could not produce the cropped image.");

      const base64 = await readAsBase64(blob);
      const result = await uploadFn({
        data: { base64, filename: `edited-${item.id.slice(0, 8)}.webp` },
      });
      if (!result.ok) throw new Error(result.reason);

      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("media").insert({
        storage_path: result.path,
        alt_text: item.alt_text,
        tag: item.tag,
        width: canvas.width,
        height: canvas.height,
        uploaded_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      toast(toSafeErrorMessage(fromCaught(e), "Could not save the cropped image."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div
          className="relative mx-auto max-w-full touch-none overflow-hidden rounded-lg border border-[color:var(--bp-line-strong)] bg-black"
          style={{ width: frameW, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {workingSrc && natural ? (
            <img
              src={workingSrc}
              alt=""
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none cursor-grab select-none active:cursor-grabbing"
              style={{
                width: drawW,
                height: drawH,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-white/60">
              Loading image…
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 border border-white/25" />
        </div>
        <p className="mt-3 text-center text-xs text-[color:var(--bp-muted)]">
          Drag the picture to choose what stays visible inside the frame.
        </p>
      </div>

      <div className="space-y-5">
        <Field label="Shape" help="Match the shape used where this picture appears on the site.">
          <div className="flex flex-wrap gap-2">
            {RATIOS.map((r) => (
              <Button
                key={r.id}
                size="sm"
                variant={ratioId === r.id ? "primary" : "secondary"}
                onClick={() => setRatioId(r.id)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </Field>

        <Field label="Zoom" help="Zoom in to fill the frame with a smaller part of the picture.">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              icon={<ZoomOut className="size-3.5" />}
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
            >
              Out
            </Button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[color:var(--bp-indigo)]"
              aria-label="Zoom level"
            />
            <Button
              size="sm"
              icon={<ZoomIn className="size-3.5" />}
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}
            >
              In
            </Button>
          </div>
        </Field>

        <Field label="Rotate" help="Turns the picture a quarter turn clockwise each time.">
          <Button size="sm" icon={<RotateCw className="size-3.5" />} onClick={rotate}>
            Rotate 90°
          </Button>
        </Field>

        <div className="rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] p-3 text-xs leading-relaxed text-[color:var(--bp-muted)]">
          Saving creates a new copy in the library. The original picture is never changed, so you
          can always come back and crop it differently.
        </div>

        <Button variant="primary" disabled={busy || !natural} onClick={saveVersion}>
          {busy ? "Saving…" : "Save as new version"}
        </Button>
      </div>
    </div>
  );
}

/* ── Focal point ────────────────────────────────────────────────────────── */

function FocalPicker({
  item,
  url,
  focal,
  onChange,
}: {
  item: MediaItem;
  url: string | undefined;
  focal: FocalPoint | null;
  onChange: (p: FocalPoint | null) => void;
}) {
  const [point, setPoint] = useState<FocalPoint | null>(focal);

  useEffect(() => setPoint(focal), [focal]);

  function pick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPoint({
      x: +Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)).toFixed(3),
      y: +Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)).toFixed(3),
    });
  }

  const pos = point ? `${point.x * 100}% ${point.y * 100}%` : "50% 50%";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={() => {}}
          className="relative cursor-crosshair overflow-hidden rounded-lg border border-[color:var(--bp-line-strong)] bg-black"
        >
          {url ? (
            <img
              src={url}
              alt={item.alt_text}
              className="max-h-[420px] w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="p-10 text-center text-sm text-white/60">Loading image…</div>
          )}
          {point && (
            <span
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[color:var(--bp-indigo)]/60 shadow"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            />
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[color:var(--bp-muted)]">
          Click the part of the picture that must always stay in view. Wherever the site shows this
          image in a different shape, it crops around this point instead of the middle.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
            How it will look
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Wide", cls: "aspect-[16/9]" },
              { label: "Square", cls: "aspect-square" },
              { label: "Tall", cls: "aspect-[3/4]" },
            ].map((p) => (
              <div key={p.label}>
                <div
                  className={`overflow-hidden rounded-md border border-[color:var(--bp-line-strong)] bg-black ${p.cls}`}
                >
                  {url && (
                    <img
                      src={url}
                      alt=""
                      className="size-full object-cover"
                      style={{ objectPosition: pos }}
                    />
                  )}
                </div>
                <p className="mt-1 text-center text-[10px] text-[color:var(--bp-muted)]">
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!point} onClick={() => point && onChange(point)}>
            Save focal point
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPoint(null);
              onChange(null);
            }}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image could not be loaded for editing."));
    img.src = src;
  });
}
