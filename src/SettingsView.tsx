import { useState } from "react";
import { Globe, Palette, Cpu, RefreshCw, Sparkles, Sun, Moon } from "lucide-react";
import { Language, translations } from "./i18n";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

interface SettingsViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  engineVersion: string | null;
  isCheckingUpdate: boolean;
  updateFeedbackMsg: string | null;
  onCheckUpdates: () => void;
  isDownloadingMole: boolean;
  onDownloadMole: () => void;
  kireiUpdate?: { version: string, url: string } | null;
}

export function SettingsView({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  engineVersion,
  isCheckingUpdate,
  updateFeedbackMsg,
  onCheckUpdates,
  isDownloadingMole,
  onDownloadMole,
  kireiUpdate
}: SettingsViewProps) {
  const t = translations[language] || translations.es;
  
  const [isUpdatingKirei, setIsUpdatingKirei] = useState(false);

  const handleUpdateKirei = async () => {
    if (!kireiUpdate) return;
    try {
      if (kireiUpdate.url.endsWith(".dmg")) {
        setIsUpdatingKirei(true);
        await invoke("download_and_open_kirei_update", { url: kireiUpdate.url });
      } else {
        await openUrl(kireiUpdate.url);
      }
    } catch (e) {
      console.error("Update failed", e);
    } finally {
      setIsUpdatingKirei(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 p-2 text-left animate-in fade-in duration-200">
      
      {/* Panel Agrupado estilo macOS Preferences */}
      <div className="bg-black/30 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col gap-5">
        
        {/* Fila 1: Idioma */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{t.settingsLangTitle}</h3>
              <p className="text-[11px] text-white/40">{t.settingsLangDesc}</p>
            </div>
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onLanguageChange("es")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                language === "es"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Español
            </button>
            <button
              onClick={() => onLanguageChange("en")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                language === "en"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Fila 2: Apariencia y Tema */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Palette size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{t.settingsThemeTitle}</h3>
              <p className="text-[11px] text-white/40">{t.settingsThemeDesc}</p>
            </div>
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onThemeChange("default")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme === "default"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>{t.themeDefault}</span>
            </button>
            <button
              onClick={() => onThemeChange("light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Sun size={13} className="text-yellow-300" />
              <span>{t.themeLight}</span>
            </button>
            <button
              onClick={() => onThemeChange("dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Moon size={13} className="text-blue-300" />
              <span>{t.themeDark}</span>
            </button>
          </div>
        </div>

        {/* Fila 3: Motor Mole */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{t.settingsEngineTitle}</h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {engineVersion ? `v${engineVersion}` : t.settingsNotInstalled}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{t.settingsEngineStatusOk}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCheckUpdates}
              disabled={isCheckingUpdate || isDownloadingMole}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/15 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={isCheckingUpdate ? "animate-spin text-amber-400" : ""} />
              <span>{updateFeedbackMsg || t.settingsBtnCheckUpdates}</span>
            </button>

            <button
              onClick={onDownloadMole}
              disabled={isDownloadingMole || isCheckingUpdate}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloadingMole ? t.checkingUpdates : t.settingsBtnReinstall}
            </button>
          </div>
        </div>

      </div>

      {/* Footer Version */}
      <div className="absolute bottom-4 right-4 cursor-default z-10">
        {kireiUpdate ? (
          <button 
            onClick={handleUpdateKirei}
            disabled={isUpdatingKirei}
            className="text-[11px] font-mono font-medium text-white bg-blue-500/20 hover:bg-blue-500/40 px-3 py-1.5 rounded-md border border-blue-500/50 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isUpdatingKirei ? (
              <><RefreshCw size={12} className="animate-spin" /> Descargando...</>
            ) : (
              <><Globe size={12} /> v0.2.0 ({kireiUpdate.version} disponible)</>
            )}
          </button>
        ) : (
          <span className="text-[11px] font-mono font-medium text-white/50 bg-black/20 px-2.5 py-1 rounded-md border border-white/5 opacity-50 hover:opacity-100 transition-opacity block">
            v0.2.0
          </span>
        )}
      </div>

    </div>
  );
}
