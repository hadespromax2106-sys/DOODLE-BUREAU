import React from 'react';
import { AlertTriangle, Check, Scale, ShieldCheck, X } from 'lucide-react';

interface DisclaimerModalProps {
  requireAck?: boolean;
  onAccept: () => void;
  onClose?: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  requireAck = true,
  onAccept,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-xl border border-amber-500/40 bg-[#111827] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl tracking-wide text-white leading-none">
                Parody &amp; Fiction Disclaimer
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Doodle Bureau · Fictional Parody Notice ·{' '}
                <span className="text-amber-300 font-semibold">made by somewhat dead man</span>
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close disclaimer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-amber-100 font-medium">
              All characters, weapons, and events in this game are 100% fictional creations by
              Doodle Bureau for entertainment purposes only.
            </p>
          </div>

          <div className="space-y-2.5 text-xs sm:text-sm text-slate-300">
            <p>
              <span className="font-bold text-white">No Real-Life Representation:</span> None of
              the characters in this game represent, impersonate, endorse, or depict any real-life
              person, public figure, or organization. Any visual, vocal, or thematic resemblance is
              strictly coincidental and intended purely for lighthearted comedic parody.
            </p>
            <p>
              <span className="font-bold text-white">Original Creations Notice:</span>{' '}
              &copy; {new Date().getFullYear()} Doodle Bureau (
              <span className="font-semibold text-amber-300">made by somewhat dead man</span>). All
              original game artwork, canvas rendering, 3D lobby models, and synthesized audio are
              works of creative fiction and comedy.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              100% Fictional Entertainment ·{' '}
              <span className="text-amber-300 font-bold">made by somewhat dead man</span>
            </span>
            <button
              type="button"
              onClick={onAccept}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Check className="h-4 w-4" />
              {requireAck ? 'Enter Doodle Bureau' : 'Dismiss Notice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
