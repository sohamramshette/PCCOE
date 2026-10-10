import React, { useEffect, useRef } from 'react';
import './TechText.css';

export interface TechTextProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  color?: string;
  accentColor?: string;
  dashLength?: number;
  dashGap?: number;
  reveal?: 'letter' | 'area';
  specks?: number;
  className?: string;
  style?: React.CSSProperties;
}

const TechText: React.FC<TechTextProps> = ({
  text = 'React Bits',
  fontFamily = '',
  fontWeight = 600,
  fontSize = 150,
  color = '#ffffff',
  accentColor = '#ffffff',
  dashLength = 4,
  dashGap = 2,
  reveal = 'letter',
  specks = 15,
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!container || !canvas || !context) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let frameId = 0;
    let hoveredIndex = -1;
    let baseline = 0;
    let scale = 1;
    let glyphs: Array<{ char: string; x: number; width: number }> = [];
    let pointer = { x: 0, y: 0 };

    const render = (time = 0) => {
      context.clearRect(0, 0, width, height);
      context.font = `${fontWeight} ${fontSize * scale}px ${fontFamily || getComputedStyle(container).fontFamily}`;
      context.textBaseline = 'alphabetic';
      context.textAlign = 'left';
      const fontPx = fontSize * scale;
      const ascent = fontPx * 0.78;
      const descent = fontPx * 0.22;
      baseline = (height + ascent - descent) / 2;
      const textWidth = context.measureText(text).width;
      const startX = (width - textWidth) / 2;
      let currentX = startX;
      glyphs = Array.from(text).map((char) => {
        const glyphWidth = context.measureText(char).width;
        const glyph = { char, x: currentX, width: glyphWidth };
        currentX += glyphWidth;
        return glyph;
      });

      glyphs.forEach((glyph, index) => {
        const active = index === hoveredIndex;
        context.fillStyle = color;
        if (active && reveal === 'letter') {
          context.save();
          context.lineWidth = Math.max(1, fontPx * 0.018);
          context.strokeStyle = accentColor;
          context.setLineDash([dashLength, dashGap]);
          context.strokeText(glyph.char, glyph.x, baseline);
          context.restore();
        } else {
          context.fillText(glyph.char, glyph.x, baseline);
        }

        if (active && specks > 0 && !reduceMotion) {
          const top = baseline - ascent;
          for (let speck = 0; speck < specks; speck += 1) {
            const phase = time / 850 + speck * 2.399;
            const x = glyph.x + ((speck * 37) % Math.max(glyph.width, 1));
            const y = top + ((speck * 19) % Math.max(ascent, 1));
            const radius = 0.7 + ((speck * 7) % 10) / 10;
            context.globalAlpha = 0.35 + (Math.sin(phase) + 1) * 0.3;
            context.fillStyle = accentColor;
            context.fillRect(x + Math.sin(phase) * 3, y + Math.cos(phase) * 3, radius, radius);
          }
          context.globalAlpha = 1;
        }
      });

      if (hoveredIndex >= 0 && reveal === 'area') {
        const selected = glyphs[hoveredIndex];
        context.strokeStyle = accentColor;
        context.lineWidth = 1;
        context.setLineDash([dashLength, dashGap]);
        context.strokeRect(selected.x - 5, baseline - ascent - 5, selected.width + 10, ascent + descent + 10);
        context.setLineDash([]);
      }
    };

    const animateSpecks = (time: number) => {
      frameId = 0;
      if (hoveredIndex < 0 || reduceMotion || specks <= 0) return;
      render(time);
      frameId = window.requestAnimationFrame(animateSpecks);
    };

    const resize = () => {
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.font = `${fontWeight} ${fontSize}px ${fontFamily || getComputedStyle(container).fontFamily}`;
      const measuredWidth = context.measureText(text).width;
      scale = Math.min(1, (width * 0.9) / Math.max(measuredWidth, 1), (height * 0.68) / fontSize);
      render();
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const textTop = baseline - fontSize * scale * 0.9;
      const textBottom = baseline + fontSize * scale * 0.24;
      hoveredIndex = -1;
      if (pointer.y >= textTop - 12 && pointer.y <= textBottom + 12) {
        let nearestDistance = Infinity;
        glyphs.forEach((glyph, index) => {
          const distance = pointer.x < glyph.x ? glyph.x - pointer.x : pointer.x > glyph.x + glyph.width ? pointer.x - glyph.x - glyph.width : 0;
          if (distance < nearestDistance) {
            nearestDistance = distance;
            hoveredIndex = index;
          }
        });
        if (nearestDistance > 28) hoveredIndex = -1;
      }
      render(performance.now());
      if (hoveredIndex >= 0 && specks > 0 && !reduceMotion && frameId === 0) {
        frameId = window.requestAnimationFrame(animateSpecks);
      }
    };

    const clearPointer = () => {
      hoveredIndex = -1;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    container.addEventListener('pointermove', updatePointer, { passive: true });
    container.addEventListener('pointerleave', clearPointer, { passive: true });
    resize();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', updatePointer);
      container.removeEventListener('pointerleave', clearPointer);
    };
  }, [accentColor, color, dashGap, dashLength, fontFamily, fontSize, fontWeight, reveal, specks, text]);

  return (
    <div ref={containerRef} className={`tech-text ${className}`.trim()} style={style} role="img" aria-label={text}>
      <canvas ref={canvasRef} className="tech-text-canvas" aria-hidden="true" />
    </div>
  );
};

export default TechText;