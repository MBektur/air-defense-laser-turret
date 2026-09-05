import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HudOverlay } from './HudOverlay';
import type { TargetDetection, CameraDevice } from '../types/telemetry';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ShieldAlert,
  Crosshair,
  Cpu,
  Camera,
  RotateCw,
  Tv,
  RefreshCw,
  CheckCircle2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

interface VideoFeedProps {
  pitch: number;
  yaw: number;
  errorX: number;
  errorY: number;
  detections: TargetDetection[];
  systemState: string;
  laserFiring: boolean;
  laserArmed: boolean;
  trackingMode: string;
  fps: number;
  connected: boolean;
  cameraId?: number;
  isCameraLive?: boolean;
  flipMode?: string;
  availableCameras?: CameraDevice[];
  onSwitchCamera?: (id: number) => void;
  onSetFlipMode?: (mode: 'NONE' | '180' | 'V' | 'H') => void;
  onRescanCameras?: () => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  pitch,
  yaw,
  errorX,
  errorY,
  detections,
  systemState,
  laserFiring,
  laserArmed,
  trackingMode,
  fps,
  connected,
  cameraId = 0,
  flipMode = 'NONE',
  onSwitchCamera,
  onSetFlipMode,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showCamMenu, setShowCamMenu] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Webcam States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasWebcamStream, setHasWebcamStream] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [browserDevices, setBrowserDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [useSyntheticFeed, setUseSyntheticFeed] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Request browser webcam access
  const startWebcam = useCallback(async (deviceId?: string) => {
    setWebcamError(null);
    try {
      // Stop old stream if running
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setHasWebcamStream(true);
      setUseSyntheticFeed(false);

      // Enumerate all video input devices to populate device list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setBrowserDevices(videoInputs);

      if (!deviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err: any) {
      console.warn('Webcam access failed or denied:', err);
      setWebcamError(err.message || 'Kamera izni verilmedi');
      setHasWebcamStream(false);
      setUseSyntheticFeed(true);
    }
  }, []);

  // Initialize webcam on mount
  useEffect(() => {
    startWebcam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startWebcam]);

  const toggleFullscreen = () => {
    const el = document.getElementById('tactical-video-container');
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleSound = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundManager.setMuted(newMuted);
  };

  const handleRescan = async () => {
    setIsScanning(true);
    soundManager.playClick();
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setBrowserDevices(videoInputs);
    } catch (e) {
      console.warn('Scan devices failed:', e);
    }
    setTimeout(() => setIsScanning(false), 800);
  };

  const handleSelectDevice = (devId: string, idx: number) => {
    setSelectedDeviceId(devId);
    setUseSyntheticFeed(false);
    startWebcam(devId);
    if (onSwitchCamera) onSwitchCamera(idx);
    setShowCamMenu(false);
  };

  const flipOptions: Array<{ mode: 'NONE' | '180' | 'V' | 'H'; label: string }> = [
    { mode: 'NONE', label: 'Normal (0°)' },
    { mode: '180', label: '180° Ters Montaj' },
    { mode: 'H', label: 'Yatay Aynalama (H)' },
    { mode: 'V', label: 'Dikey Ters (V)' },
  ];

  // CSS transform for flip modes
  const getFlipTransform = () => {
    switch (flipMode) {
      case '180':
        return 'rotate(180deg)';
      case 'H':
        return 'scaleX(-1)';
      case 'V':
        return 'scaleY(-1)';
      default:
        return 'none';
    }
  };

  return (
    <div
      id="tactical-video-container"
      className="relative w-full aspect-video bg-[#030712] rounded-xl border border-cyan-500/30 overflow-hidden shadow-2xl flex items-center justify-center tactical-corners"
    >
      {/* 1. Live WebCam Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ transform: getFlipTransform() }}
        className={`w-full h-full object-cover select-none transition-transform duration-200 ${
          hasWebcamStream && !useSyntheticFeed ? 'block' : 'hidden'
        }`}
      />

      {/* 2. Synthetic Tactical Target Simulator Feed (Fallback when no webcam / user selected test feed) */}
      {(!hasWebcamStream || useSyntheticFeed) && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#040a16] relative overflow-hidden select-none">
          {/* Animated tactical background grid */}
          <div className="absolute inset-0 sci-fi-grid opacity-70" />
          
          {/* Animated concentric radar sweeps */}
          <div className="absolute w-[420px] h-[420px] rounded-full border border-cyan-500/20 flex items-center justify-center animate-spin" style={{ animationDuration: '18s' }}>
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          </div>
          <div className="absolute w-[260px] h-[260px] rounded-full border border-cyan-500/30" />
          <div className="absolute w-[120px] h-[120px] rounded-full border border-cyan-500/40" />

          {/* Central Target Reticle Indicator */}
          <Crosshair className="w-20 h-20 text-cyan-400/70 animate-pulse relative z-10 mb-3" />

          <div className="relative z-10 flex flex-col items-center gap-1.5 font-mono text-center px-4">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs tracking-widest bg-cyan-950/80 px-3 py-1 rounded border border-cyan-500/40">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>SENTETİK TAKTİK KAMERA SİMÜLASYONU // AKTİF</span>
            </div>
            
            <p className="text-[11px] text-cyan-500 max-w-sm mt-1">
              {webcamError
                ? 'Tarayıcı kamerası izni verilmedi. Canlı kameranızı görmek için izin verebilir veya aşağıdaki butonu kullanabilirsiniz.'
                : 'Kendi canlı web kameranızı görmek için kamerayı başlatın:'}
            </p>

            <button
              onClick={() => startWebcam()}
              className="mt-2.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black font-bold text-xs font-mono rounded-lg transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              CANLI WEB KAMERASINI BAŞLAT
            </button>
          </div>
        </div>
      )}

      {/* 3. HUD Canvas Graphics Overlay (Nişangah, Yapay Ufuk, Pusula ve Hedef Kutuları) */}
      <HudOverlay
        pitch={pitch}
        yaw={yaw}
        errorX={errorX}
        errorY={errorY}
        detections={detections}
        systemState={systemState}
        laserFiring={laserFiring}
        laserArmed={laserArmed}
        trackingMode={trackingMode}
      />

      {/* 4. Scanline & Vignette Effect Layer */}
      <div className="absolute inset-0 scanlines pointer-events-none z-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 pointer-events-none z-20" />

      {/* 5. Top Telemetry Status Bar inside Video */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-30 pointer-events-none">
        {/* Left Side: System & Mode Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded border border-cyan-500/30 text-xs font-mono font-bold tracking-wider">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-ping' : 'bg-red-500'}`} />
            <span className="text-cyan-400">{trackingMode}</span>
          </div>

          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>FPS: <b className="text-white">{fps.toFixed(0)}</b></span>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto relative">
          {/* Laser Firing Warning */}
          {laserFiring && (
            <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500 px-3 py-1 rounded text-red-300 text-xs font-mono font-bold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>ACTIVE FIRING</span>
            </div>
          )}

          {/* Camera Device Selector Dropdown Trigger Button */}
          <button
            onClick={() => setShowCamMenu(!showCamMenu)}
            title="Kamera Aygıt Seçimi & Ayarları"
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all border ${
              showCamMenu
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 glow-cyan'
                : 'bg-black/70 hover:bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {hasWebcamStream && !useSyntheticFeed ? `WEB KAMERASI #${cameraId} (CANLI)` : 'SİMÜLASYON FEED'}
            </span>
          </button>

          {/* Comprehensive Camera Selection Popup Modal / Dropdown */}
          {showCamMenu && (
            <div className="absolute right-0 top-9 w-84 bg-[#070e1c]/95 backdrop-blur-xl border border-cyan-500/60 rounded-xl p-3.5 shadow-2xl z-50 flex flex-col gap-3 font-mono text-xs text-cyan-200">
              {/* Header with Rescan Button */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <span>KAMERA AYGIT SEÇİMİ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleRescan}
                    disabled={isScanning}
                    title="Bağlı Kameraları Yeniden Tara"
                    className="p-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 rounded text-cyan-300 transition-colors flex items-center gap-1 text-[10px]"
                  >
                    <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
                    <span>{isScanning ? 'TARANIYOR...' : 'YENİLE'}</span>
                  </button>
                  <button
                    onClick={() => setShowCamMenu(false)}
                    className="p-1 text-cyan-500 hover:text-white rounded hover:bg-cyan-950"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dynamic Camera Devices List */}
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {browserDevices.map((dev, idx) => {
                  const isSelected = selectedDeviceId === dev.deviceId && !useSyntheticFeed;
                  return (
                    <button
                      key={dev.deviceId || idx}
                      onClick={() => handleSelectDevice(dev.deviceId, idx)}
                      className={`p-2 rounded-lg text-left transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-100 glow-cyan font-bold'
                          : 'bg-black/40 border-cyan-500/20 hover:bg-cyan-950/50 text-cyan-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Camera className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-300' : 'text-cyan-600'}`} />
                        <div className="flex flex-col">
                          <span className="text-[11px] leading-tight">
                            {dev.label || `Kamera ${idx + 1} (Webcam)`}
                          </span>
                          <span className="text-[9px] text-cyan-500">Tarayıcı Canlı Akışı</span>
                        </div>
                      </div>

                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-300" />}
                    </button>
                  );
                })}

                {/* Synthetic Simulator Option */}
                <button
                  onClick={() => {
                    setUseSyntheticFeed(true);
                    setShowCamMenu(false);
                  }}
                  className={`p-2 rounded-lg text-left transition-all border flex items-center justify-between ${
                    useSyntheticFeed
                      ? 'bg-cyan-950/90 border-cyan-400 text-cyan-100 glow-cyan font-bold'
                      : 'bg-black/40 border-cyan-500/20 hover:bg-cyan-950/50 text-cyan-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <div className="flex flex-col">
                      <span className="text-[11px] leading-tight">Sentetik Taktik Hedef Simülasyonu</span>
                      <span className="text-[9px] text-cyan-500">Kamera Olmadan Test Akışı</span>
                    </div>
                  </div>
                  {useSyntheticFeed && <CheckCircle2 className="w-4 h-4 text-cyan-300" />}
                </button>
              </div>

              {/* Image Orientation Flip Selection */}
              <div className="border-t border-cyan-500/20 pt-2.5 flex flex-col gap-1.5">
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-bold">
                  <RotateCw className="w-3 h-3 text-cyan-400" /> GÖRÜNTÜ YÖNÜ / FLIP AYARI:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {flipOptions.map((f) => (
                    <button
                      key={f.mode}
                      onClick={() => {
                        if (onSetFlipMode) onSetFlipMode(f.mode);
                      }}
                      className={`py-1.5 px-2 rounded text-[10px] text-center border transition-colors ${
                        flipMode === f.mode
                          ? 'bg-cyan-900/80 border-cyan-400 text-white font-bold'
                          : 'bg-black/40 border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 bg-black/70 hover:bg-cyan-950 border border-cyan-500/40 rounded text-cyan-400 hover:text-cyan-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1.5 bg-black/70 hover:bg-cyan-950 border border-cyan-500/40 rounded text-cyan-400 hover:text-cyan-200 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 6. Bottom Diagnostics Bar inside Video */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-30 pointer-events-none text-xs font-mono">
        <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded border border-cyan-500/30 text-cyan-300 flex items-center gap-3">
          <span>ΔX: <b className="text-white">{errorX > 0 ? `+${errorX}` : errorX}px</b></span>
          <span>ΔY: <b className="text-white">{errorY > 0 ? `+${errorY}` : errorY}px</b></span>
        </div>

        <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded border border-cyan-500/30 text-cyan-400">
          EO/IR SENSOR:{' '}
          <span className={hasWebcamStream && !useSyntheticFeed ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}>
            {hasWebcamStream && !useSyntheticFeed ? 'BROWSER WEBCAM ONLINE' : 'SYNTHETIC RADAR FEED'}
          </span>
        </div>
      </div>
    </div>
  );
};
