/**
 * Smoothly scrolls to a card section in the stacking overlay layout.
 * Ensures culled (hidden) sections are made visible and accurately
 * computes the cumulative scroll position across sticky card layers.
 */
export function scrollToCard(anchorId: string, duration = 1.2): boolean {
  if (!anchorId) return false;

  const targetEl = document.getElementById(anchorId);
  if (!targetEl) return false;

  // 1. Unhide all stack card sections that GSAP ScrollTrigger culling might have marked hidden
  const allSections = document.querySelectorAll<HTMLElement>('.stack-card-section');
  allSections.forEach((sec) => {
    sec.style.visibility = 'visible';
  });

  // 2. Identify the target .stack-card-section
  const targetSection = targetEl.classList.contains('stack-card-section')
    ? targetEl
    : targetEl.closest<HTMLElement>('.stack-card-section');

  const lenis = (window as any).__lenis;

  if (targetSection && allSections.length > 0) {
    const sectionsArray = Array.from(allSections);
    const targetIndex = sectionsArray.indexOf(targetSection);

    if (targetIndex >= 0) {
      const container = document.querySelector<HTMLElement>('.airlens-stacking-container');
      let targetY: number;
      if (window.matchMedia('(max-width: 768px)').matches) {
        targetY = window.scrollY + targetSection.getBoundingClientRect().top;
      } else {
        targetY = container ? container.offsetTop : 0;
        for (let i = 0; i < targetIndex; i++) {
          targetY += sectionsArray[i].offsetHeight;
        }
      }

      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(targetY, { duration });
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
      return true;
    }
  }

  // Fallback if not inside .stack-card-section
  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(targetEl, { duration });
  } else {
    targetEl.scrollIntoView({ behavior: 'smooth' });
  }
  return true;
}
