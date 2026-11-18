"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Share2, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { isNative, saveFile, saveToGallery } from "@/lib/native";

/**
 * 分享预览弹层:生成卡片后先展示成品,再选择「保存到相册」或「系统分享」。
 * 避免盲分享;blob 由调用方持有,组件只负责预览与动作。
 */
export function SharePreview({
  blob,
  filename,
  shareTitle,
  onClose,
}: {
  blob: Blob | null;
  filename: string;
  shareTitle: string;
  onClose: () => void;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [message, setMessage] = useState("");
  const open = blob !== null;

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const doSave = async () => {
    if (!blob || busy) return;
    setBusy("save");
    try {
      const r = await saveToGallery(blob, filename);
      setMessage(r === "saved" ? t("share.savedGallery") : t("share.savedDownload"));
    } catch {
      setMessage(t("share.saveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const doShare = async () => {
    if (!blob || busy) return;
    setBusy("share");
    try {
      const r = await saveFile(blob, filename, { title: shareTitle, dialogTitle: t("share.dialogTitle") });
      if (r !== "canceled") onClose();
    } catch {
      setMessage(t("share.failed"));
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex max-w-app items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("share.preview")}
            className="relative flex max-h-[88dvh] w-full flex-col rounded-t-[28px] border-t border-border bg-surface px-5 pb-8 pt-3 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border" />

            <div className="mb-3 flex shrink-0 items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">{t("share.preview")}</span>
              <button aria-label={t("common.close")} onClick={onClose} className="rounded-full p-1.5 text-text-secondary active:bg-border/60">
                <X size={18} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-background py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={t("share.preview")} className="max-h-full max-w-full rounded-xl object-contain" />
            </div>

            {message && <p className="mt-3 shrink-0 text-center text-xs text-primary">{message}</p>}

            <div className="mt-4 flex shrink-0 flex-col gap-2.5">
              <button
                onClick={doSave}
                disabled={busy !== null}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-white active:opacity-85 disabled:opacity-50"
              >
                {busy === "save" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isNative() ? t("share.saveGallery") : t("share.saveDownload")}
              </button>
              <button
                onClick={doShare}
                disabled={busy !== null}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold text-text-primary active:bg-border/40 disabled:opacity-50"
              >
                {busy === "share" ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                {t("share.action")}
              </button>
              <p className="mt-0.5 text-center text-[11px] leading-relaxed text-text-secondary">{t("share.previewHint")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
