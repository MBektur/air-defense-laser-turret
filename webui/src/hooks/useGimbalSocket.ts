import { useEffect, useRef, useState, useCallback } from 'react';
import type { TelemetryData, SystemCommand, TargetDetection } from '../types/telemetry';
import { soundManager } from '../utils/audioEffects';

const INITIAL_TELEMETRY: TelemetryData = {
  timestamp: Date.now(),
  connected: true, // Virtual STM32 connected by default in web demo
  port: 'STM32F401 (VIRTUAL USB)',
  pitch: 0.0,
  yaw: 0.0,
  roll: 0.0,
  error_x: 0,
  error_y: 0,
  tracking_mode: 'IDLE',
  laser_armed: false,
  laser_firing: false,
  laser_power: 100,
  fps: 60,
  latency_ms: 12,
  temperature_c: 37.2,
  voltage_v: 12.6,
  system_state: 'READY',
  detections: [],
  camera_id: 0,
  is_camera_live: true,
  flip_mode: 'NONE',
  available_cameras: [],
  pid: {
    kp: 0.60,
    ki: 0.16,
    kd: 0.50,
  },
};

export function useGimbalSocket() {
  const [telemetry, setTelemetry] = useState<TelemetryData>(INITIAL_TELEMETRY);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isCloudDemo, setIsCloudDemo] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] SYSTEM INITIALIZED // STANDALONE CLOUD ENGINE ACTIVE`,
    `[${new Date().toLocaleTimeString()}] WEBCAM SUBSYSTEM READY (NO BACKEND REQUIRED)`,
    `[${new Date().toLocaleTimeString()}] VIRTUAL STM32F401 ONLINE (115200 BAUD)`,
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const prevLockRef = useRef<boolean>(false);
  const targetRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: 0.5,
    y: 0.5,
    vx: 0.003,
    vy: 0.002,
  });

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  // 1. Simulation Engine (runs at 60 FPS in browser for pure Vercel / zero-Python operation)
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();
    let simTime = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      simTime += dt;

      // Only update local simulation if no external WebSocket server is broadcasting real telemetry
      if (!wsConnected) {
        setTelemetry((prev) => {
          let newPitch = prev.pitch;
          let newYaw = prev.yaw;
          let newRoll = prev.roll || 0;
          let newState = prev.system_state;
          let detections: TargetDetection[] = prev.detections || [];
          let errorX = 0;
          let errorY = 0;

          // Target movement physics (aerial target patrol)
          const tgt = targetRef.current;
          tgt.x += tgt.vx;
          tgt.y += tgt.vy;
          if (tgt.x < 0.15 || tgt.x > 0.85) tgt.vx *= -1;
          if (tgt.y < 0.20 || tgt.y > 0.80) tgt.vy *= -1;

          if (prev.tracking_mode === 'PATROL') {
            // Sweep azimuth and elevation like radar
            newYaw = Math.sin(simTime * 0.8) * 35;
            newPitch = Math.sin(simTime * 0.4) * 12;
            newState = 'SEARCHING';
            detections = [];
          } else if (prev.tracking_mode === 'COLOR_TRACKING' || prev.tracking_mode === 'YOLO_TRACKING') {
            const label = prev.tracking_mode === 'COLOR_TRACKING' ? 'MAVI HEDEF (DRONE)' : 'UAV-ALPHA [AI]';
            
            // Calculate pixel target on 1280x720 canvas
            const targetPixelX = tgt.x * 1280;
            const targetPixelY = tgt.y * 720;
            const centerPixelX = 640 + (prev.yaw / 80) * 500;
            const centerPixelY = 360 - (prev.pitch / 45) * 280;

            errorX = Math.round(targetPixelX - centerPixelX);
            errorY = Math.round(targetPixelY - centerPixelY);

            // Gimbal moves towards target via PID response
            const targetYaw = (tgt.x - 0.5) * 70;
            const targetPitch = -(tgt.y - 0.5) * 40;

            const lerpSpeed = Math.min(1.0, (prev.pid?.kp || 0.6) * dt * 4.5);
            newYaw += (targetYaw - newYaw) * lerpSpeed;
            newPitch += (targetPitch - newPitch) * lerpSpeed;

            const distanceToCenter = Math.hypot(errorX, errorY);
            const isLocked = distanceToCenter < 45;
            newState = isLocked ? 'LOCKED' : 'TRACKING';

            detections = [
              {
                id: 1,
                label,
                confidence: isLocked ? 0.98 : 0.89,
                bbox: [tgt.x, tgt.y, 0.14, 0.10],
                is_locked: isLocked,
                distance_m: 14.5 + Math.sin(simTime) * 1.5,
              },
            ];

            // Audio lock cue
            if (isLocked && !prevLockRef.current) {
              soundManager.playLockOn();
              addLog(`TARGET ACQUIRED & LOCKED [${label}]`);
            }
            prevLockRef.current = isLocked;
          } else if (prev.tracking_mode === 'IDLE') {
            newState = 'READY';
            detections = [];
            errorX = 0;
            errorY = 0;
            prevLockRef.current = false;
          }

          // Laser thermal and power simulation
          let temp = prev.temperature_c || 37.0;
          let volt = prev.voltage_v || 12.6;
          if (prev.laser_firing) {
            temp = Math.min(65.0, temp + dt * 3.5);
            volt = Math.max(11.8, volt - dt * 0.15);
          } else {
            temp = Math.max(37.0, temp - dt * 1.2);
            volt = Math.min(12.6, volt + dt * 0.08);
          }

          return {
            ...prev,
            timestamp: Date.now(),
            pitch: Number(newPitch.toFixed(2)),
            yaw: Number(newYaw.toFixed(2)),
            roll: Number(newRoll.toFixed(2)),
            error_x: errorX,
            error_y: errorY,
            system_state: newState,
            detections,
            temperature_c: Number(temp.toFixed(1)),
            voltage_v: Number(volt.toFixed(1)),
            fps: 60,
            latency_ms: 8 + Math.floor(Math.sin(simTime * 2) * 3),
          };
        });
      }

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [wsConnected, addLog]);

  // 2. Command Dispatcher (Handles both Cloud-Demo instant state and optional WS)
  const sendCommand = useCallback((cmd: SystemCommand) => {
    // Immediate reactive state update for client-side demo
    setTelemetry((prev) => {
      let next = { ...prev };

      switch (cmd.action) {
        case 'FIRE_LASER':
          if (next.laser_armed) {
            next.laser_firing = true;
            soundManager.startLaserContinuousFire();
            addLog('LASER EMITTER ACTIVE // HIGH ENERGY DISCHARGE');
          }
          break;

        case 'STOP_LASER':
          next.laser_firing = false;
          soundManager.stopLaserContinuousFire();
          break;

        case 'ARM_LASER': {
          const isArmed = Boolean(cmd.payload?.armed);
          next.laser_armed = isArmed;
          next.laser_firing = isArmed ? next.laser_firing : false;
          if (!isArmed) {
            soundManager.stopLaserContinuousFire();
            addLog('WEAPON SAFETY ENGAGED // LASER DISARMED');
          } else {
            soundManager.playAlert();
            addLog('WEAPON SYSTEM ARMED // FIRE PERMITTED');
          }
          break;
        }

        case 'SET_MODE': {
          const mode = cmd.payload?.mode || 'IDLE';
          next.tracking_mode = mode;
          soundManager.playClick();
          addLog(`OPERATION MODE SWITCHED -> ${mode}`);
          break;
        }

        case 'MANUAL_JOG': {
          const axis = cmd.payload?.axis;
          const dir = cmd.payload?.dir || 1;
          const step = cmd.payload?.step || 4;

          if (axis === 'x') {
            next.yaw = Math.max(-80, Math.min(80, next.yaw + dir * step));
          } else if (axis === 'y') {
            next.pitch = Math.max(-45, Math.min(45, next.pitch + dir * step));
          }
          next.tracking_mode = 'MANUAL';
          break;
        }

        case 'CENTER':
          next.pitch = 0;
          next.yaw = 0;
          soundManager.playClick();
          addLog('GIMBAL POSITION RESET TO BORESIGHT (0, 0)');
          break;

        case 'EMERGENCY_STOP':
          next.laser_firing = false;
          next.laser_armed = false;
          next.tracking_mode = 'IDLE';
          next.system_state = 'EMERGENCY_STOP';
          soundManager.stopLaserContinuousFire();
          soundManager.playAlert();
          addLog('🚨 EMERGENCY STOP ENGAGED // ALL ACTUATORS HALTED');
          break;

        case 'UPDATE_PID':
          if (cmd.payload?.pid) {
            next.pid = { ...next.pid, ...cmd.payload.pid };
            soundManager.playClick();
            addLog(`PID GAINS UPDATED: Kp=${next.pid.kp} Ki=${next.pid.ki} Kd=${next.pid.kd}`);
          }
          break;

        case 'CONNECT_SERIAL':
          next.connected = true;
          next.port = cmd.payload?.port || 'STM32F401 (VIRTUAL USB)';
          soundManager.playClick();
          addLog(`CONNECTED TO ${next.port} @ 115200 BAUD`);
          break;

        case 'DISCONNECT_SERIAL':
          next.connected = false;
          next.port = 'OFFLINE';
          soundManager.playClick();
          addLog('STM32 LINK DISCONNECTED');
          break;

        case 'SET_FLIP_MODE':
          next.flip_mode = cmd.payload?.flip_mode || 'NONE';
          addLog(`OPTICAL SENSOR ORIENTATION: ${next.flip_mode}`);
          break;

        case 'SET_CAMERA':
          next.camera_id = cmd.payload?.camera_id;
          addLog(`ACTIVE CAMERA SWITCHED -> ID: ${cmd.payload?.camera_id}`);
          break;

        default:
          break;
      }

      return next;
    });

    // Also forward to WebSocket if available (e.g. running locally with real hardware)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(cmd));
      } catch (err) {
        console.warn('WS Send failed:', err);
      }
    }
  }, [addLog]);

  // 3. Optional WebSocket Connection (only for local backend with Python)
  useEffect(() => {
    // In Vercel or cloud deployments, don't waste resources or spam errors attempting ws
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      setIsCloudDemo(true);
      return;
    }

    let socket: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
        setIsCloudDemo(false);
        addLog('TELEMETRY LINK ESTABLISHED WITH HARDWARE SERVER');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTelemetry(data);
        } catch {}
      };

      socket.onclose = () => {
        setWsConnected(false);
        setIsCloudDemo(true);
      };

      socket.onerror = () => {
        // Silently fall back to cloud demo
        setWsConnected(false);
        setIsCloudDemo(true);
      };

      wsRef.current = socket;
    } catch {
      setIsCloudDemo(true);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [addLog]);

  return {
    telemetry,
    wsConnected,
    isCloudDemo,
    logs,
    sendCommand,
    addLog,
  };
}
