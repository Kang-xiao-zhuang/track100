"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { CATEGORIES, COLORS, GOAL_ICONS, UNITS } from "@/lib/goal-meta";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/layout/page-header";

// zod messages are i18n KEYS, resolved to text at display time.
const schema = z.object({
  title: z.string().min(1, "err.name").max(40),
  category: z.enum(["learning", "health", "work", "life", "finance", "fitness", "other"]),
  unit: z.enum(["hours", "days", "books", "times", "km", "pages", "custom"]),
  target: z.coerce.number().positive("err.target"),
  step: z.coerce.number().positive("err.step"),
  icon: z.string().min(1),
  color: z.string().min(1),
  endDate: z.string().optional(),
  description: z.string().max(200).optional(),
  type: z.enum(["cumulative", "habit"]),
  habitPeriod: z.enum(["daily", "weekly"]),
});
type FormValues = z.infer<typeof schema>;

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateForm />
    </Suspense>
  );
}

function CreateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");
  const { getGoal, createGoal, updateGoal } = useGoalStore();
  const editing = editId ? getGoal(editId) : undefined;
  const { t } = useT();

  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "learning", unit: "hours", icon: "🎯", color: COLORS[0],
      step: 1, target: 100, type: "cumulative", habitPeriod: "daily",
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        title: editing.title,
        category: editing.category,
        unit: editing.unit,
        target: editing.target,
        step: editing.step,
        icon: editing.icon,
        color: editing.color,
        endDate: editing.endDate,
        description: editing.description,
        type: editing.type ?? "cumulative",
        habitPeriod: editing.habitPeriod ?? "daily",
      });
    }
  }, [editing, reset]);

  const icon = watch("icon");
  const color = watch("color");
  const category = watch("category");
  const unit = watch("unit");
  const type = watch("type");
  const habitPeriod = watch("habitPeriod");
  const title = watch("title");
  const target = watch("target");
  const step = watch("step");
  const isHabitType = type === "habit";

  const onSubmit = (v: FormValues) => {
    // 目标值调低到低于已完成量时会瞬间「完成」,历史百分比也会失真 —— 先让用户确认
    if (editing && editing.current > v.target && !window.confirm(t("f.targetWarn", { n: editing.current }))) return;
    if (editing) {
      updateGoal(editing.id, v);
      router.back();
    } else {
      createGoal(v);
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen">
      <PageHeader title={editing ? t("create.edit") : t("create.new")} back />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-5 pb-32 pt-2">
        <PreviewCard
          icon={icon}
          color={color}
          title={title?.trim()}
          target={target}
          unit={t("u." + unit)}
        />

        <Section title={t("f.secBasic")}>
          <Field label={t("f.name")} error={formState.errors.title && t(formState.errors.title.message!)}>
            <input {...register("title")} placeholder={t("f.namePh")} className={inputCls} />
          </Field>

          <Field label={t("f.type")} hint={isHabitType ? t("f.typeHabitHint") : t("f.typeCumulativeHint")}>
            <Segmented
              value={type}
              onChange={(v) => {
                setValue("type", v as FormValues["type"]);
                // 习惯型数的是「坚持几次」,用着默认的「小时」会很别扭 —— 只在没动过单位时顺手切一下
                if (v === "habit" && unit === "hours") setValue("unit", "times");
              }}
              options={[
                { value: "cumulative", label: t("f.typeCumulative") },
                { value: "habit", label: t("f.typeHabit") },
              ]}
            />
          </Field>

          {isHabitType && (
            <Field label={t("f.period")}>
              <Segmented
                value={habitPeriod}
                onChange={(v) => setValue("habitPeriod", v as FormValues["habitPeriod"])}
                options={[
                  { value: "daily", label: t("f.periodDaily") },
                  { value: "weekly", label: t("f.periodWeekly") },
                ]}
              />
            </Field>
          )}
        </Section>

        <Section title={t("f.secValue")}>
          <Field
            label={isHabitType ? t("f.targetHabit") : t("f.target")}
            error={formState.errors.target && t(formState.errors.target.message!)}
          >
            <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-border/80 bg-background focus-within:border-primary">
              <input
                type="number"
                step="any"
                inputMode="decimal"
                {...register("target")}
                className="min-w-0 flex-1 bg-transparent px-3.5 text-[17px] font-semibold tabular-nums text-text-primary outline-none"
              />
              <UnitStepper value={unit} onChange={(v) => setValue("unit", v)} />
            </div>
          </Field>

          <Field label={t("f.step")} hint={t("f.stepHint")} error={formState.errors.step && t(formState.errors.step.message!)}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                inputMode="decimal"
                {...register("step")}
                className={cn(inputCls, "flex-1 tabular-nums")}
              />
              <div className="flex gap-1.5">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setValue("step", n, { shouldValidate: true })}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-[13px] font-medium tabular-nums transition-colors",
                      Number(step) === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/80 bg-background text-text-secondary",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </Section>

        <Section title={t("f.secLook")}>
          <Field label={t("f.icon")}>
            <IconStrip value={icon} onChange={(v) => setValue("icon", v)} />
          </Field>

          <Field label={t("f.color")}>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setValue("color", c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className="relative flex aspect-square w-full items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}` : undefined,
                  }}
                >
                  {color === c && <Check size={14} strokeWidth={3.5} className="text-white" />}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t("f.category")}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setValue("category", c.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    category === c.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/80 bg-background text-text-secondary",
                  )}
                >
                  {c.emoji} {t("cat." + c.value)}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title={t("f.secMore")}>
          <Field label={t("f.endDate")}>
            <input type="date" {...register("endDate")} className={inputCls} />
          </Field>
          <Field label={t("f.desc")}>
            <textarea {...register("description")} rows={3} className={cn(inputCls, "h-auto resize-none py-3 leading-relaxed")} placeholder={t("f.descPh")} />
          </Field>
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-app border-t border-border/60 bg-background/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <button type="submit" className="h-12 w-full rounded-btn bg-primary font-semibold text-white shadow-card active:scale-95 dark:text-background">
            {editing ? t("save") : t("createGoal")}
          </button>
        </div>
      </form>
    </main>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-border/80 bg-background px-3.5 text-[15px] text-text-primary outline-none focus:border-primary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-xs font-semibold tracking-wide text-text-secondary/80">{title}</h2>
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-surface p-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-text-secondary">{label}</label>
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-text-secondary/80">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/** 实时预览:用户还没保存就能看到目标卡长什么样。 */
function PreviewCard({ icon, color, title, target, unit }: { icon: string; color: string; title?: string; target: number; unit: string }) {
  const { t } = useT();
  const safeTarget = Number.isFinite(Number(target)) && Number(target) > 0 ? Number(target) : 0;
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${color}24` }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-[15px] font-semibold", title ? "text-text-primary" : "text-text-secondary/60")}>
            {title || t("f.previewPh")}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-text-secondary">
            0 / {safeTarget || "—"} {unit}
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div className="h-full w-0 rounded-full transition-all" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex rounded-xl bg-background p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "h-9 flex-1 rounded-lg text-sm font-medium transition-colors",
            value === o.value ? "bg-primary text-white shadow-sm dark:text-background" : "text-text-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 单位选择:左右箭头切换,比原生 select 手感更稳,也不会有弹窗遮挡。 */
function UnitStepper({ value, onChange }: { value: string; onChange: (v: FormValues["unit"]) => void }) {
  const { t } = useT();
  const idx = Math.max(0, UNITS.findIndex((u) => u.value === value));
  const move = (d: number) => onChange(UNITS[(idx + d + UNITS.length) % UNITS.length].value);
  return (
    <div className="flex items-center border-l border-border/70 pl-1 pr-1.5">
      <button
        type="button"
        aria-label={t("f.prev")}
        onClick={() => move(-1)}
        className="flex h-9 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors active:bg-border/60"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="w-14 truncate text-center text-sm font-medium text-text-primary">{t("u." + value)}</span>
      <button
        type="button"
        aria-label={t("f.next")}
        onClick={() => move(1)}
        className="flex h-9 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors active:bg-border/60"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/** 图标选择:两行横向滚动的图标条,两端箭头翻页。 */
function IconStrip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  const stripRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  // 老目标可能存着不在预设里的图标 —— 放到最前面,保证仍然能看到并选中
  const icons = useMemo(() => (GOAL_ICONS.includes(value) ? GOAL_ICONS : [value, ...GOAL_ICONS]), [value]);

  const syncEdge = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  // 编辑时把已选图标滚到中间,免去用户自己找
  useEffect(() => {
    const box = stripRef.current;
    const on = box?.querySelector<HTMLElement>('[data-on="true"]');
    if (box && on) box.scrollLeft = on.offsetLeft - box.clientWidth / 2 + on.clientWidth / 2;
    syncEdge();
  }, [syncEdge]);

  const page = (dir: number) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(96, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={t("f.prev")}
        onClick={() => page(-1)}
        disabled={edge.start}
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-text-secondary transition-opacity active:scale-90 disabled:opacity-30"
      >
        <ChevronLeft size={17} />
      </button>

      <div className="relative min-w-0 flex-1">
        <div ref={stripRef} onScroll={syncEdge} className="no-scrollbar overflow-x-auto">
          <div className="grid w-max grid-flow-col grid-rows-2 gap-2 py-0.5">
            {icons.map((ic) => (
              <button
                key={ic}
                type="button"
                data-on={ic === value}
                onClick={() => onChange(ic)}
                aria-pressed={ic === value}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border text-xl leading-none transition-transform active:scale-90",
                  ic === value
                    ? "scale-105 border-primary bg-primary/12 ring-2 ring-primary/60"
                    : "border-border/70 bg-background",
                )}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        {/* 边缘渐隐:提示这一条还能继续滑,避免图标被硬切一半 */}
        {!edge.start && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-surface to-transparent" />
        )}
        {!edge.end && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-surface to-transparent" />
        )}
      </div>

      <button
        type="button"
        aria-label={t("f.next")}
        onClick={() => page(1)}
        disabled={edge.end}
        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-text-secondary transition-opacity active:scale-90 disabled:opacity-30"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
