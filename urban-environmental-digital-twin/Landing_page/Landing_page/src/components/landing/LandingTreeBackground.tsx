import React, { useEffect, useRef } from 'react';

interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  depth: number;
  order: number;
  side: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const LandingTreeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId = 0;
    let branches: Branch[] = [];
    let width = 0;
    let height = 0;
    let startTime = 0;

    const createBranches = () => {
      branches = [];
      let order = 0;
      const scale = Math.min(width, height);
      const rootX = width * 0.78;
      const rootY = height * 0.98;

      const grow = (
        startX: number,
        startY: number,
        angle: number,
        length: number,
        depth: number,
        side: number,
      ) => {
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        branches.push({ startX, startY, endX, endY, depth, order: order++, side });
        if (depth >= 8) return;

        const spread = depth < 2 ? 0.48 : 0.56;
        const nextLength = length * (depth < 2 ? 0.72 : 0.73);
        grow(endX, endY, angle - spread, nextLength, depth + 1, -1);
        grow(endX, endY, angle + spread, nextLength, depth + 1, 1);
      };

      grow(rootX, rootY, -Math.PI / 2, scale * 0.17, 0, 0);
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createBranches();
      startTime = performance.now();
      if (reducedMotion) draw(startTime);
    };

    const moveWithPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const horizontalOffset = (0.5 - event.clientX / window.innerWidth) * 16;
      const verticalOffset = (0.5 - event.clientY / window.innerHeight) * 12;
      canvas.style.setProperty('--tree-shift-x', `${horizontalOffset}px`);
      canvas.style.setProperty('--tree-shift-y', `${verticalOffset}px`);
    };

    const resetPointerOffset = () => {
      canvas.style.setProperty('--tree-shift-x', '0px');
      canvas.style.setProperty('--tree-shift-y', '0px');
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const elapsed = reducedMotion ? 10000 : time - startTime;
      const sway = reducedMotion ? 0 : Math.sin(time / 1800) * 1.4;

      for (const branch of branches) {
        const progress = clamp((elapsed - branch.depth * 210) / 620, 0, 1);
        if (progress <= 0) continue;

        const swayAmount = sway * (branch.depth / 8);
        const endX = branch.startX + (branch.endX - branch.startX) * progress + swayAmount;
        const endY = branch.startY + (branch.endY - branch.startY) * progress;
        const ageOpacity = 0.38 + (branch.depth / 8) * 0.36;
        const accent = branch.depth > 2 && branch.side === 1;

        context.beginPath();
        context.moveTo(branch.startX, branch.startY);
        context.lineTo(endX, endY);
        context.strokeStyle = accent
          ? `rgba(173, 126, 65, ${ageOpacity})`
          : `rgba(61, 111, 84, ${ageOpacity})`;
        context.lineWidth = Math.max(0.65, 3.2 - branch.depth * 0.34);
        context.lineCap = 'round';
        context.stroke();

        if (branch.depth === 8 && progress === 1) {
          const pulse = reducedMotion ? 1 : 0.72 + (Math.sin(time / 900 + branch.order) + 1) * 0.14;
          context.beginPath();
          context.arc(endX, endY, pulse * 1.45, 0, Math.PI * 2);
          context.fillStyle = `rgba(112, 143, 93, ${0.34 + pulse * 0.2})`;
          context.fill();
        }
      }

      if (!reducedMotion) frameId = window.requestAnimationFrame(draw);
    };

    resize();
    draw(performance.now());
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', moveWithPointer, { passive: true });
    document.addEventListener('mouseleave', resetPointerOffset);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', moveWithPointer);
      document.removeEventListener('mouseleave', resetPointerOffset);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-tree-background" aria-hidden="true" />;
};
