"use client";

import { useRef } from "react";
import { Download, Globe, Moon, Sun, Upload } from "lucide-react";
import { useSettingsStore } from "@/store/settings.store";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { useT } from "@/lib/i18n";

export default function SettingsPage() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const toggleLanguage = useSettingsStore((s) => s.toggleLanguage);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t, lang } = useT();

  if (!hydrated) return <div className="p-6 text-text-secondary">{t("loading")}</div>;

  const onExport = () => {
    const data = {
      app: "track100",
      version: 1,
      exportedAt: new Date().toISOString(),
      goals: readJSON(STORAGE_KEYS.goals, []),
      history: readJSON(STORAGE_KEYS.history, []),
      settings: readJSON(STORAGE_KEYS.settings, {}),
      achievements: readJSON(STORAGE_KEYS.achievements, []),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `track100-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.app !== "track100") throw new Error("不是 Track100 的备份文件");
      if (data.goals) writeJSON(STORAGE_KEYS.goals, data.goals);
      if (data.history) writeJSON(STORAGE_KEYS.history, data.history);
      if (data.settings) writeJSON(STORAGE_KEYS.settings, data.settings);
      if (data.achievements) writeJSON(STORAGE_KEYS.achievements, data.achievements);
      window.location.href = "/";
    } catch (e) {
      window.alert("导入失败:" + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <main className="px-5 pt-6">
      <h1 className="text-xl font-bold">{t("set.title")}</h1>

      <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <Row
          label={t("set.appearance")}
          value={theme === "dark" ? t("set.dark") : t("set.light")}
          icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          onClick={toggleTheme}
        />
        <Divider />
        <Row
          label={t("set.language")}
          value={lang === "zh" ? "中文" : "English"}
          icon={<Globe size={18} />}
          onClick={toggleLanguage}
        />
        <Divider />
        <Row label={t("set.export")} icon={<Download size={18} />} onClick={onExport} />
        <Divider />
        <Row label={t("set.import")} icon={<Upload size={18} />} onClick={() => fileRef.current?.click()} />
      </section>

      <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <Row label={t("set.about")} value={t("set.aboutSub")} />
        <Divider />
        <Row label={t("set.version")} value="v1.1.0" />
      </section>

      <p className="mt-6 text-center text-xs text-text-secondary">{t("set.footer")}</p>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </main>
  );
}

function Row({ label, value, icon, onClick }: { label: string; value?: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default"
    >
      {icon && <span className="text-text-secondary">{icon}</span>}
      <span className="flex-1 text-text-primary">{label}</span>
      {value && <span className="text-sm text-text-secondary">{value}</span>}
    </button>
  );
}

function Divider() {
  return <div className="mx-4 border-t border-border" />;
}
