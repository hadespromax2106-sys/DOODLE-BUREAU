import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { canPromptInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showBrowserTip, setShowBrowserTip] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (canPromptInstall) {
      await promptInstall();
      return;
    }
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }
    setShowBrowserTip(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install Doodle Bureau App"
        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/70 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showIosGuide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Smartphone className="h-4 w-4" />
                Install on iOS Safari
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  1
                </span>
                <span>
                  Tap the <Share className="inline h-3.5 w-3.5 text-sky-400 mx-0.5" /> Share icon in Safari&apos;s toolbar.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  2
                </span>
                <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  3
                </span>
                <span>Tap &ldquo;Add&rdquo; to launch Doodle Bureau full-screen.</span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {showBrowserTip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Download className="h-4 w-4" />
                Install Desktop / Mobile App
              </div>
              <button
                type="button"
                onClick={() => setShowBrowserTip(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Use your browser&apos;s address-bar install icon or menu (&ldquo;Install Doodle Bureau&rdquo; / &ldquo;Add to Home Screen&rdquo;) when running outside an embedded preview frame.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
