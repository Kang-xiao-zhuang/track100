"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
    defaultValues: { category: "learning", unit: "hours", icon: "🎯", color: COLORS[0], step: 1, target: 100 },
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
      });
    }
  }, [editing, reset]);

  const icon = watch("icon");
  const color = watch("color");
  const category = watch("category");
  const unit = watch("unit");

  const onSubmit = (v: FormValues) => {
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
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-5 pb-28 pt-2">
        <Field label={t("f.name")} error={formState.errors.title && t(formState.errors.title.message!)}>
          <input {...register("title")} placeholder={t("f.namePh")} className={inputCls} />
        </Field>

        <Field label={t("f.icon")}>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((ic) => (
              <button
                type="button"
                key={ic}
                onClick={() => setValue("icon", ic)}
                className={cn("h-11 w-11 rounded-input text-xl", icon === ic ? "bg-primary/15 ring-2 ring-primary" : "bg-surface border border-border")}
              >
                {ic}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("f.color")}>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setValue("color", c)}
                aria-label={c}
                className={cn("h-8 w-8 rounded-full", color === c && "ring-2 ring-offset-2 ring-offset-background")}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </Field>

        <Field label={t("f.category")}>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Selectable key={c.value} active={category === c.value} onClick={() => setValue("category", c.value)}>
                {c.emoji} {t("cat." + c.value)}
              </Selectable>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("f.target")} error={formState.errors.target && t(formState.errors.target.message!)}>
            <input type="number" step="any" {...register("target")} className={inputCls} />
          </Field>
          <Field label={t("f.unit")}>
            <select {...register("unit")} className={inputCls} value={unit} onChange={(e) => setValue("unit", e.target.value as FormValues["unit"])}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{t("u." + u.value)}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t("f.step")} error={formState.errors.step && t(formState.errors.step.message!)}>
          <input type="number" step="any" {...register("step")} className={inputCls} />
        </Field>

        <Field label={t("f.endDate")}>
          <input type="date" {...register("endDate")} className={inputCls} />
        </Field>

        <Field label={t("f.desc")}>
          <textarea {...register("description")} rows={3} className={cn(inputCls, "resize-none")} placeholder={t("f.descPh")} />
        </Field>

        <button type="submit" className="mt-2 h-12 rounded-btn bg-primary font-semibold text-white shadow-card active:scale-95">
          {editing ? t("save") : t("createGoal")}
        </button>
      </form>
    </main>
  );
}

const inputCls =
  "h-12 w-full rounded-input border border-border bg-surface px-4 text-text-primary outline-none focus:border-primary";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

function Selectable({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium",
        active ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}
