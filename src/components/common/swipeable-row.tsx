"use client";

import { useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Archive, Pin, PinOff, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const ACTION_W = 76;
const TOTAL_W = ACTION_W * 3;

interface SwipeActions {
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  pinned?: boolean;
  archived?: boolean;
}

/**
 * 左滑露出操作:置顶 / 归档 / 删除。
 * 用手势而非 hover 按钮,贴合手机单手操作。sortMode 时禁用,避免与排序箭头冲突。
 */
export function SwipeableRow({
  children,
  actions,
  disabled = false,
}: {
  children: React.ReactNode;
  actions: SwipeActions;
  disabled?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const snap = (info: PanInfo) => {
    const threshold = -TOTAL_W / 2;
    setOpen(info.offset.x < threshold || info.velocity.x < -400);
  };

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const actionsEl = (
    <div className="absolute inset-y-0 right-0 flex overflow-hidden rounded-card" style={{ width: TOTAL_W }}>
      <ActionButton bg="bg-warning" label={actions.pinned ? t("home.unpin") : t("home.pin")} onClick={() => run(actions.onPin)}>
        {actions.pinned ? <PinOff size={20} /> : <Pin size={20} />}
      </ActionButton>
      <ActionButton bg="bg-primary" label={actions.archived ? t("d.unarchive") : t("d.archive")} onClick={() => run(actions.onArchive)}>
        <Archive size={20} />
      </ActionButton>
      <ActionButton bg="bg-danger" label={t("d.delete")} onClick={() => run(actions.onDelete)}>
        <Trash2 size={20} />
      </ActionButton>
    </div>
  );

  if (disabled) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-card">
      {actionsEl}
      <motion.div
        drag="x"
        dragConstraints={{ left: -TOTAL_W, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragEnd={(_, info) => snap(info)}
        animate={{ x: open ? -TOTAL_W : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className={cn("relative touch-pan-y bg-surface", open && "cursor-default")}
        onClickCapture={(e) => {
          // 展开时点卡片空白处先收起,不触发底层 Link 跳转
          if (open) {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function ActionButton({
  bg,
  label,
  onClick,
  children,
}: {
  bg: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn("flex h-full shrink-0 flex-col items-center justify-center gap-1 text-white active:opacity-80", bg)}
      style={{ width: ACTION_W }}
    >
      {children}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
