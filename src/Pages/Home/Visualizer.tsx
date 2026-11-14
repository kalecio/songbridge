import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { VisualizerColors } from './visualizerSettings';

interface VisualizerProps {
  isPlaying: boolean;
  colors: VisualizerColors;
  presetName: string;
  preset: Record<string, unknown> | undefined;
}

interface ButterchurnInstance {
  loadPreset: (..._args: [Record<string, unknown>, number]) => void;
  setRendererSize: (..._args: [number, number]) => void;
  render: (..._args: [{ elapsedTime: number; audioLevels: { timeByteArray: Uint8Array; timeByteArrayL: Uint8Array; timeByteArrayR: Uint8Array } }]) => void;
  destroy?: () => void;
}

const BAND_COUNT = 32;
const FFT_SIZE = 1024;

const createWaveform = (levels: number[], frame: number, channel: number) => {
  const samples = new Uint8Array(FFT_SIZE);
  for (let sample = 0; sample < samples.length; sample += 1) {
    const time = sample / samples.length;
    let value = 0;
    for (let band = 0; band < BAND_COUNT; band += 1) {
      const frequency = 1 + Math.pow(band / (BAND_COUNT - 1), 2) * 125;
      // Butterchurn expects byte-scale waveform input. Give quiet bands enough
      // headroom to remain visible after converting the synthesized waveform.
      const amplitude = (levels[band] ?? 0) * (1.5 / Math.sqrt(BAND_COUNT));
      value += Math.sin(2 * Math.PI * frequency * time + frame * (0.025 + band * 0.001) + channel * 0.14) * amplitude;
    }
    samples[sample] = Math.max(0, Math.min(255, Math.round(128 + value * 255)));
  }
  return samples;
};

/** Renders Butterchurn presets, driven by the desktop player's live frequency bands. */
const Visualizer = ({ isPlaying, colors, presetName, preset }: VisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<ButterchurnInstance | null>(null);
  const levelsRef = useRef<number[]>(Array(BAND_COUNT).fill(0));
  const isPlayingRef = useRef(isPlaying);
  const drawRef = useRef<(() => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [rendererReady, setRendererReady] = useState(false);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!isPlaying) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const sample = async () => {
      try {
        const levels = await invoke<number[]>('get_audio_visualizer_levels');
        if (!cancelled && Array.isArray(levels) && levels.length === BAND_COUNT) {
          levelsRef.current = levels.map((level) => Math.max(0, Math.min(1, level)));
        }
      } catch {
        // The web preview and older native builds can run without this command.
      } finally {
        if (!cancelled) timeout = setTimeout(sample, 40);
      }
    };

    void sample();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(bounds.width * ratio));
      const height = Math.max(1, Math.floor(bounds.height * ratio));
      canvas.width = width;
      canvas.height = height;
      visualizerRef.current?.setRendererSize(width, height);
    };
    const observer = new ResizeObserver(resize);

    const start = async () => {
      try {
        const module = await import('butterchurn');
        if (cancelled) return;
        const factory = module.default as unknown as { createVisualizer: (..._args: [null, HTMLCanvasElement, Record<string, unknown>]) => ButterchurnInstance };
        resize();
        visualizerRef.current = factory.createVisualizer(null, canvas, {
          width: canvas.width,
          height: canvas.height,
          pixelRatio: 1,
          textureCheck: false,
        });
        observer.observe(canvas);
        setRendererReady(true);
      } catch (error) {
        console.error('Unable to initialize Butterchurn visualizer', error);
      }
    };

    void start();
    return () => {
      cancelled = true;
      observer.disconnect();
      visualizerRef.current?.destroy?.();
      visualizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (rendererReady && preset) visualizerRef.current?.loadPreset(preset, 1.5);
  }, [preset, presetName, rendererReady]);

  useEffect(() => {
    if (!rendererReady) return;
    let lastTime = performance.now();
    let elapsedTime = 0;
    let frame = 0;
    const current = Array(BAND_COUNT).fill(0) as number[];

    const draw = (now: number) => {
      if (!visualizerRef.current || !isPlayingRef.current) {
        animationFrameRef.current = null;
        return;
      }
      elapsedTime += Math.min(now - lastTime, 100) / 1000;
      lastTime = now;
      frame += 1;
      const target = levelsRef.current;
      for (let index = 0; index < BAND_COUNT; index += 1) {
        current[index] += ((target[index] ?? 0) - current[index]) * (target[index] > current[index] ? 0.55 : 0.12);
      }
      const left = createWaveform(current, frame, 0);
      const right = createWaveform(current, frame, 1);
      const mono = createWaveform(current, frame, 0.5);
      visualizerRef.current.render({ elapsedTime, audioLevels: { timeByteArray: mono, timeByteArrayL: left, timeByteArrayR: right } });
      animationFrameRef.current = window.requestAnimationFrame(draw);
    };

    drawRef.current = () => {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(draw);
      }
    };
    if (isPlayingRef.current) drawRef.current();
    return () => {
      drawRef.current = null;
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [rendererReady]);

  useEffect(() => {
    if (isPlaying) {
      drawRef.current?.();
    } else if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isPlaying]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.13,
          mixBlendMode: 'color',
          background: `linear-gradient(125deg, ${colors[0]}, ${colors[1]} 52%, ${colors[2]})`,
        }}
      />
    </>
  );
};

export default Visualizer;
