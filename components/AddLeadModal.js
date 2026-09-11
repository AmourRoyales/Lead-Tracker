"use client";

import { useEffect, useRef, useState } from "react";
import {
  CLOSED_FOR_NOW_STATUS,
  CONVERSATION_STAGE_OPTIONS,
  CONVERSATION_STAGE_SELECT_OPTIONS,
  LEAD_QUALITY_OPTIONS,
  QUALITY_LEADS_STAGE,
  LEAD_QUALITY_CUSTOM,
  PLATFORM_OPTIONS,
  PRODUCT_OPTIONS,
  PRODUCT_OTHER,
  STATUS_OPTIONS,
  statusOptionsFor,
} from "@/lib/constants";
import { STAGE_COLOR } from "@/lib/badgeColors";

function todayLocal() {
  const d = new Date();
  const tz = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map = Object.fromEntries(tz.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const emptyForm = {
  identified: "",
  adId: "",
  platform: "",
  description: "",
  descriptionSource: "manual",
  leadQuality: LEAD_QUALITY_OPTIONS[0],
  leadQualityCustom: "",
  leadDate: todayLocal(),
  leadTime: "",
  lastMessageDate: todayLocal(),
  lastMessageTime: "",
  product: PRODUCT_OPTIONS[0],
  productCustom: "",
  isNatural: false,
  quote: "",
  status: STATUS_OPTIONS[0],
  statusCustom: "",
  followUpMessage: "",
  highPriority: false,
  conversationStage: CONVERSATION_STAGE_OPTIONS[0],
};

function formFromLead(lead) {
  return {
    identified: lead.identified || "",
    adId: lead.adId || "",
    platform: lead.platform || "",
    description: lead.description || "",
    descriptionSource: lead.descriptionSource || "manual",
    leadQuality: lead.leadQuality || LEAD_QUALITY_OPTIONS[0],
    leadQualityCustom: lead.leadQualityCustom || "",
    leadDate: lead.leadDate || todayLocal(),
    leadTime: lead.leadTime || "",
    lastMessageDate: lead.lastMessageDate || todayLocal(),
    lastMessageTime: lead.lastMessageTime || "",
    product: lead.product || PRODUCT_OPTIONS[0],
    productCustom: lead.productCustom || "",
    isNatural: !!lead.isNatural,
    quote: lead.quote != null ? String(lead.quote) : "",
    status: lead.status || STATUS_OPTIONS[0],
    statusCustom: lead.statusCustom || "",
    followUpMessage: lead.followUpMessage || "",
    highPriority: !!lead.highPriority,
    conversationStage: lead.conversationStage || CONVERSATION_STAGE_OPTIONS[0],
  };
}

// Same form is used both to create a new lead (no `lead` prop, POSTs and
// calls onCreated) and as the "detailed edit" view for an existing lead
// (pass `lead` + `onUpdate` — the same update function the inline row edit
// uses, so both paths go through identical persistence logic).
export default function AddLeadModal({ onClose, onCreated, lead, onUpdate }) {
  const isEdit = !!lead;
  const [form, setForm] = useState(() =>
    isEdit
      ? formFromLead(lead)
      : { ...emptyForm, leadDate: todayLocal(), lastMessageDate: todayLocal() }
  );
  const [pastedText, setPastedText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [gemLoading, setGemLoading] = useState(false);
  const [gemError, setGemError] = useState(null);
  const [dupMatches, setDupMatches] = useState([]);
  const [dupChecking, setDupChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const dupTimer = useRef(null);
  const dateTouched = useRef(false);
  const timeTouched = useRef(false);
  const lastMessageDateTouched = useRef(false);
  const lastMessageTimeTouched = useRef(false);
  const leadQualityTouched = useRef(false);
  const productTouched = useRef(false);
  const isNaturalTouched = useRef(false);
  const statusTouched = useRef(false);
  const quoteTouched = useRef(false);
  const stageTouched = useRef(false);

  useEffect(() => {
    return () => clearTimeout(dupTimer.current);
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleIdentifiedChange(value) {
    set("identified", value);
    clearTimeout(dupTimer.current);
    if (!value.trim()) {
      setDupMatches([]);
      return;
    }
    dupTimer.current = setTimeout(async () => {
      setDupChecking(true);
      try {
        const res = await fetch(
          `/api/leads/check?identified=${encodeURIComponent(value.trim())}`
        );
        const data = await res.json();
        setDupMatches((data.leads || []).filter((l) => l.id !== lead?.id));
      } catch {
        // non-critical
      } finally {
        setDupChecking(false);
      }
    }, 400);
  }

  function setImageFromFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (file) setImageFromFile(file);
    e.target.value = "";
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        setImageFromFile(item.getAsFile());
        break;
      }
    }
  }

  function clearImage() {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
  }

  async function runGemini() {
    if (!pastedText.trim() && !imageFile) {
      setGemError("Paste text or pick a screenshot first.");
      return;
    }
    setGemLoading(true);
    setGemError(null);
    try {
      const payload = { text: pastedText.trim() || undefined };
      if (imageFile) {
        payload.imageBase64 = await fileToBase64(imageFile);
        payload.mimeType = imageFile.type;
      }
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gemini request failed");

      setForm((f) => ({
        ...f,
        description: data.description || f.description,
        descriptionSource: "gemini",
        leadDate: !dateTouched.current && data.suggestedDate ? data.suggestedDate : f.leadDate,
        leadTime: !timeTouched.current && data.suggestedTime ? data.suggestedTime : f.leadTime,
        lastMessageDate:
          !lastMessageDateTouched.current && data.suggestedLastMessageDate
            ? data.suggestedLastMessageDate
            : f.lastMessageDate,
        lastMessageTime:
          !lastMessageTimeTouched.current && data.suggestedLastMessageTime
            ? data.suggestedLastMessageTime
            : f.lastMessageTime,
        identified: !f.identified.trim() && data.suggestedIdentified ? data.suggestedIdentified : f.identified,
        leadQuality:
          !leadQualityTouched.current && data.suggestedLeadQuality
            ? data.suggestedLeadQuality
            : f.leadQuality,
        product:
          !productTouched.current && data.suggestedProduct
            ? data.suggestedProduct
            : f.product,
        isNatural:
          !isNaturalTouched.current && data.suggestedIsNatural != null
            ? data.suggestedIsNatural
            : f.isNatural,
        status:
          !statusTouched.current && data.suggestedStatus ? data.suggestedStatus : f.status,
        quote:
          !quoteTouched.current && data.suggestedQuote != null
            ? String(data.suggestedQuote)
            : f.quote,
        conversationStage:
          !stageTouched.current && data.suggestedConversationStage
            ? data.suggestedConversationStage
            : f.conversationStage,
      }));
      if (!form.identified.trim() && data.suggestedIdentified) {
        handleIdentifiedChange(data.suggestedIdentified);
      }
    } catch (err) {
      setGemError(err.message);
    } finally {
      setGemLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    if (!form.identified.trim()) return setSubmitError("Identified is required.");
    if (!form.platform) return setSubmitError("Platform is required.");
    if (!form.description.trim()) return setSubmitError("Description is required.");
    if (form.leadQuality === LEAD_QUALITY_CUSTOM && !form.leadQualityCustom.trim())
      return setSubmitError("Enter the custom lead quality.");
    if (form.product === PRODUCT_OTHER && !form.productCustom.trim())
      return setSubmitError("Enter the product.");
    if (form.status === "Custom" && !form.statusCustom.trim())
      return setSubmitError("Enter the custom status.");

    setSubmitting(true);
    try {
      if (isEdit) {
        await onUpdate(lead.id, form);
        onClose();
      } else {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create lead");
        onCreated(data.lead);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-xl border border-line bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{isEdit ? "Edit Lead" : "New Lead"}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ink-soft hover:bg-surface2"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {/* Identified */}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Identified (username / phone)
            </label>
            <input
              value={form.identified}
              onChange={(e) => handleIdentifiedChange(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              placeholder="e.g. Raj, +91-98xxxxxxx, @insta_handle"
            />
            {dupChecking && (
              <p className="mt-1 text-xs text-ink-mute">Checking existing leads…</p>
            )}
            {dupMatches.length > 0 && (
              <div className="mt-2 space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-950">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  {dupMatches.length} existing lead(s) with this identifier:
                </p>
                {dupMatches.map((l) => (
                  <div key={l.id} className="text-amber-700 dark:text-amber-400">
                    {l.leadDate} · {l.status} · {l.leadQuality} · {l.description.slice(0, 80)}
                  </div>
                ))}
                <p className="pt-1 text-amber-700 dark:text-amber-400">
                  You can still add this as a new separate lead below.
                </p>
              </div>
            )}
          </div>

          {/* Ad ID */}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Ad ID <span className="text-ink-mute">(optional)</span>
            </label>
            <input
              value={form.adId}
              onChange={(e) => set("adId", e.target.value)}
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              placeholder="Meta/Instagram ad ID this lead came from"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => set("platform", p)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.platform === p
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong text-ink-soft hover:bg-surface2"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-md border border-line p-3">
            <label className="mb-2 block text-sm font-medium text-ink">Description</label>

            <div
              onPaste={handlePaste}
              className="mb-2 space-y-2 rounded-md bg-surface2 p-2"
            >
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the copied chat text here, or paste (Ctrl/Cmd+V) a screenshot anywhere in this box…"
                rows={3}
                className="w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*" onChange={handleImagePick} className="text-xs text-ink-soft" />
                {imagePreview && (
                  <div className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="screenshot preview" className="h-10 rounded border border-line" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-xs text-ink-soft hover:text-ink"
                      aria-label="Remove screenshot"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={runGemini}
                  disabled={gemLoading}
                  className="ml-auto rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-strong disabled:opacity-50"
                >
                  {gemLoading ? "Summarizing…" : "Summarize with Gemini"}
                </button>
              </div>
              {gemError && <p className="text-xs text-red-600">{gemError}</p>}
            </div>

            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Description (auto-filled by Gemini, or type manually)"
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
            />
          </div>

          {/* Date + Last Message + Quality */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Lead Date</label>
              <input
                type="date"
                value={form.leadDate}
                onChange={(e) => {
                  dateTouched.current = true;
                  set("leadDate", e.target.value);
                }}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              />
              <input
                type="time"
                value={form.leadTime}
                onChange={(e) => {
                  timeTouched.current = true;
                  set("leadTime", e.target.value);
                }}
                title="Time the lead first messaged"
                className="mt-2 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Last Message Sent</label>
              <input
                type="date"
                value={form.lastMessageDate}
                onChange={(e) => {
                  lastMessageDateTouched.current = true;
                  set("lastMessageDate", e.target.value);
                }}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              />
              <input
                type="time"
                value={form.lastMessageTime}
                onChange={(e) => {
                  lastMessageTimeTouched.current = true;
                  set("lastMessageTime", e.target.value);
                }}
                title="Time of the last message in the conversation"
                className="mt-2 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Lead Quality</label>
              <select
                value={form.leadQuality}
                onChange={(e) => {
                  leadQualityTouched.current = true;
                  const quality = e.target.value;
                  setForm((f) => {
                    const validStatuses = statusOptionsFor(quality, f.conversationStage);
                    const status = validStatuses.includes(f.status) ? f.status : validStatuses[0];
                    return { ...f, leadQuality: quality, status };
                  });
                }}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              >
                {LEAD_QUALITY_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value={LEAD_QUALITY_CUSTOM}>Custom…</option>
              </select>
              {form.leadQuality === LEAD_QUALITY_CUSTOM && (
                <input
                  value={form.leadQualityCustom}
                  onChange={(e) => set("leadQualityCustom", e.target.value)}
                  placeholder="Custom lead quality"
                  className="mt-2 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
                />
              )}
            </div>
          </div>

          {/* Product */}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Product</label>
            <div className="flex flex-wrap gap-2">
              {[...PRODUCT_OPTIONS, PRODUCT_OTHER].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    productTouched.current = true;
                    set("product", p);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.product === p
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong text-ink-soft hover:bg-surface2"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {form.product === PRODUCT_OTHER && (
              <input
                value={form.productCustom}
                onChange={(e) => set("productCustom", e.target.value)}
                placeholder="Specify product"
                className="mt-2 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              />
            )}
            <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={form.isNatural}
                onChange={(e) => {
                  isNaturalTouched.current = true;
                  set("isNatural", e.target.checked);
                }}
              />
              Natural diamond
            </label>
          </div>

          {/* Quote + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Quote (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.quote}
                onChange={(e) => {
                  quoteTouched.current = true;
                  set("quote", e.target.value);
                }}
                placeholder="Optional"
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Status</label>
              <select
                value={form.status}
                onChange={(e) => {
                  statusTouched.current = true;
                  set("status", e.target.value);
                }}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
              >
                {statusOptionsFor(form.leadQuality, form.conversationStage).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="Custom">Custom…</option>
              </select>
              {form.status === "Custom" && (
                <input
                  value={form.statusCustom}
                  onChange={(e) => set("statusCustom", e.target.value)}
                  placeholder="Custom status"
                  className="mt-2 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
                />
              )}
            </div>
          </div>

          {/* Conversation Stage */}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Conversation Stage</label>
            <div className="flex flex-wrap gap-2">
              {CONVERSATION_STAGE_SELECT_OPTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => {
                    stageTouched.current = true;
                    setForm((f) => ({
                      ...f,
                      conversationStage: s,
                      // "Closed for now" is a Quality Leads-only status, so
                      // don't leave it stuck on a lead moved out of that stage.
                      ...(f.status === CLOSED_FOR_NOW_STATUS && s !== QUALITY_LEADS_STAGE
                        ? { status: "Follow-up Needed" }
                        : {}),
                    }));
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.conversationStage === s
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong text-ink-soft hover:bg-surface2"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-mute">
              Defaults to First Message — bump it up if the conversation has already gone
              further. Pick{" "}
              <span className={`rounded-full px-1.5 py-0.5 font-medium ${STAGE_COLOR[CONVERSATION_STAGE_SELECT_OPTIONS[0]]}`}>
                {CONVERSATION_STAGE_SELECT_OPTIONS[0]}
              </span>{" "}
              to leave it off all four stage pages entirely. Otherwise it's shown on its own
              page under{" "}
              <span className={`rounded-full px-1.5 py-0.5 font-medium ${STAGE_COLOR[form.conversationStage] || ""}`}>
                {form.conversationStage}
              </span>
              , not on the main leads list.
            </p>
          </div>

          {/* Next Follow-up Message */}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Next Follow-up Message <span className="text-ink-mute">(optional)</span>
            </label>
            <textarea
              value={form.followUpMessage}
              onChange={(e) => set("followUpMessage", e.target.value)}
              rows={3}
              placeholder="Draft what you'll send this lead next, if you already know…"
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
            />
            <p className="mt-1 text-xs text-ink-mute">
              Only shown on the Follow-up page, not here.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={form.highPriority}
                onChange={(e) => set("highPriority", e.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              High priority — pin to the top of the Follow-up page
            </label>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line-strong px-4 py-2 text-sm text-ink-soft hover:bg-surface2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
            >
              {isEdit
                ? submitting
                  ? "Saving…"
                  : "Save Changes"
                : submitting
                  ? "Adding…"
                  : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
