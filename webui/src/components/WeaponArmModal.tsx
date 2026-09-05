import React from 'react';
import {
  Flame,
  Shield,
  Crosshair,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Keyboard,
  Eye,
  Radio,
  X,
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

interface WeaponArmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArmWeapon: (arm: boolean) => void;
  laserArmed: boolean;
}

export const WeaponArmModal: React.FC<WeaponArmModalProps> = ({
  isOpen,
  onClose,
  onArmWeapon,
  laserArmed,
}) => {
  if (!isOpen) return null;

  const handleArmAndLaunch = () => {
    soundManager.playWeaponArmSound();
    onArmWeapon(true);
    onClose();
  };

  const handleSafeLaunch = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="hud-panel rounded-2xl w-full max-w-xl p-5 sm:p-6 tactical-corners border-2 border-cyan-500/60 shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col gap-4 font-mono relative overflow-hidden">
        {/* Futuristic Corner Ambient Glows */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Header with Badge and Close */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              <Crosshair className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm tracking-wider text-white">
                  TACTICAL C2 INITIALIZATION // PROTOKOL
                </h2>
                <span className="text-[10px] px-2 py-0.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 rounded font-bold">
                  HAZIRLIK
                </span>
              </div>
              <p className="text-[11px] text-cyan-400/80">
                TEKNOFEST HSS HAVA SAVUNMA LAZER GİMBAL SİSTEMİ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-950/80 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Subsystem Diagnostic Checklist */}
        <div className="bg-[#030a17]/90 rounded-xl p-3 border border-cyan-500/25 flex flex-col gap-1.5 text-xs">
          <div className="text-[10px] text-cyan-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400" /> SİSTEM TEŞHİS RAPORU (DIAGNOSTICS):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20 text-cyan-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span>Optik Sensör & Web Kamera: <b>AKTİF</b></span>
            </div>
            <div className="flex items-center gap-2 bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20 text-cyan-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span>Three.js 3D Donanım İkizi: <b>SENKRON</b></span>
            </div>
            <div className="flex items-center gap-2 bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20 text-cyan-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span>STM32F401 Telemetri: <b>ONLINE</b></span>
            </div>
            <div className="flex items-center gap-2 bg-amber-950/30 p-1.5 rounded border border-amber-500/30 text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Lazer Silahı: <b>{laserArmed ? 'ARM EDİLDİ' : 'BEKLEMEDE (SAFE)'}</b></span>
            </div>
          </div>
        </div>

        {/* 3. Tactical Mission & Controls Guide */}
        <div className="flex flex-col gap-2 text-xs">
          <div className="text-cyan-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>KOMUTA MERKEZİ NASIL KULLANILIR?</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-black/50 p-2.5 rounded-lg border border-cyan-500/20 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-cyan-400 font-bold text-[11px]">
                <Flame className="w-3 h-3 text-red-400" /> 1. SİLAHI KUR (ARM)
              </div>
              <p className="text-[10px] text-cyan-400/80 leading-relaxed">
                Lazer kondansatörlerini şarj edin ve sistemi atışa hazır hale getirin.
              </p>
            </div>

            <div className="bg-black/50 p-2.5 rounded-lg border border-cyan-500/20 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-cyan-400 font-bold text-[11px]">
                <Keyboard className="w-3 h-3 text-cyan-400" /> 2. NİŞAN AL & ATEŞ ET
              </div>
              <p className="text-[10px] text-cyan-400/80 leading-relaxed">
                <b>W / A / S / D</b> ile yönlendirin. <b>Boşluk (Space)</b> tuşuna basılı tutarak lazeri ateşleyin!
              </p>
            </div>

            <div className="bg-black/50 p-2.5 rounded-lg border border-cyan-500/20 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-cyan-400 font-bold text-[11px]">
                <Eye className="w-3 h-3 text-blue-400" /> 3. OTONOM TAKİP
              </div>
              <p className="text-[10px] text-cyan-400/80 leading-relaxed">
                <b>MAVİ HEDEF</b> veya <b>YOLO AI</b> modunu seçerek hava hedeflerini otonom kilitleyin.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Exciting Call-To-Action Arm Button */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-cyan-500/20">
          <button
            onClick={handleArmAndLaunch}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:via-amber-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-[0_0_25px_rgba(255,40,70,0.6)] flex items-center justify-center gap-2 tracking-wider transition-all transform active:scale-95 border border-red-400"
          >
            <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>⚡ SİLAH SİSTEMİNİ KUR (ARM) VE BAŞLAT</span>
          </button>

          <button
            onClick={handleSafeLaunch}
            className="py-3 px-4 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 tracking-wider"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>GÖZLEM MODUNDA AÇ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
