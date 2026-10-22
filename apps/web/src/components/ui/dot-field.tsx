'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Campo "halftone": transforma uma fonte de intensidade (ruído animado,
// um glifo ou uma imagem) em uma grade de quadradinhos — ou caracteres ASCII.
// Puramente decorativo: aria-hidden, pausa fora da tela e fica estático com
// prefers-reduced-motion.

const RAMP = ' .:-=+*#%@';

// Ruído de valor 2D (hash + interpolação suave) e fbm de 3 oitavas
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  return (
    noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15
  );
}

export function DotField({
  className,
  cell = 9,
  mode = 'dots',
  glyph,
  src,
  color = '#ececee',
  accent = '#a3e635',
  speed = 1,
  coverage = 0.5,
}: {
  className?: string;
  cell?: number; // tamanho da célula em px
  mode?: 'dots' | 'ascii';
  glyph?: string; // texto desenhado como "imagem" (ex: ">_")
  src?: string; // imagem convertida em pontos
  color?: string;
  accent?: string;
  speed?: number;
  coverage?: number; // 0..1 — quanto do ruído vira pontos
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -1e4, y: -1e4 };
    let cols = 0;
    let rows = 0;
    let width = 0;
    let dpr = 1;
    let shape: Float32Array | null = null; // intensidade da imagem/glifo por célula
    let img: HTMLImageElement | null = null;
    let raf = 0;
    let last = 0;
    let visible = true;
    const t0 = performance.now();
    const threshold = 1 - coverage;

    // Rasteriza glifo/imagem na resolução da grade e guarda a luminância
    function sampleShape() {
      if ((!glyph && !img) || !cols || !rows) {
        shape = null;
        return;
      }
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const o = off.getContext('2d', { willReadFrequently: true });
      if (!o) return;
      o.fillStyle = '#000';
      o.fillRect(0, 0, cols, rows);
      if (img) {
        const r = Math.max(cols / img.width, rows / img.height);
        const w = img.width * r;
        const h = img.height * r;
        o.drawImage(img, (cols - w) / 2, (rows - h) / 2, w, h);
      } else if (glyph) {
        o.fillStyle = '#fff';
        // baseline alfabética com folga embaixo: "_" e descendentes cabem
        o.font = `700 ${Math.round(rows * 0.8)}px ui-monospace, monospace`;
        o.textAlign = 'right';
        o.textBaseline = 'alphabetic';
        o.fillText(glyph, cols * 0.96, rows * 0.74);
      }
      const data = o.getImageData(0, 0, cols, rows).data;
      shape = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        shape[i] =
          (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) /
          255;
      }
    }

    function draw(now: number) {
      if (!ctx) return;
      const t = ((now - t0) / 1000) * speed;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, rows * cell);
      if (mode === 'ascii') {
        ctx.font = `${Math.round(cell * 1.1)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // ruído com deriva lenta → "manchas" que respiram
          let v = (fbm(x * 0.045 + t * 0.06, y * 0.07 - t * 0.035) - threshold) * 2.6;
          if (shape) v = Math.max(v * 0.55, shape[y * cols + x] * 1.05);

          // brilho que segue o ponteiro
          const cx = (x + 0.5) * cell;
          const cy = (y + 0.5) * cell;
          const dx = cx - pointer.x;
          const dy = cy - pointer.y;
          const d2 = dx * dx + dy * dy;
          const glow = d2 < 12100 ? 1 - Math.sqrt(d2) / 110 : 0;
          v += glow * 0.55;
          if (v <= 0.06) continue;

          const q = Math.min(1, Math.ceil(v * 4) / 4); // 4 níveis = look pixelado
          const hot = glow > 0.35 || (q >= 0.75 && hash(x, y) > 0.985);
          ctx.fillStyle = hot ? accent : color;
          ctx.globalAlpha = 0.18 + q * 0.62;

          if (mode === 'ascii') {
            ctx.fillText(RAMP[Math.round(q * (RAMP.length - 1))], cx, cy);
          } else {
            const s = cell * (0.22 + q * 0.42);
            ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 42) return; // ~24fps é suficiente
      last = now;
      draw(now);
    }

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      cols = Math.ceil(rect.width / cell);
      rows = Math.ceil(rect.height / cell);
      sampleShape();
      draw(performance.now());
    }

    function onPointer(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    }

    if (src) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        sampleShape();
        draw(performance.now());
      };
      img.src = src;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    if (!reduce) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [cell, mode, glyph, src, color, accent, speed, coverage]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none block h-full w-full', className)}
    />
  );
}
