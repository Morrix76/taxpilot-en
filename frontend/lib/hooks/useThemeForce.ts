import { useEffect } from 'react';

export const useThemeForce = (dependencies: any[] = []) => {
  useEffect(() => {
    const forceThemeOverride = () => {
      // Seleziona tutti gli elementi problematici
      const backgroundElements = document.querySelectorAll([
        '.bg-gray-100',
        '.bg-gray-50', 
        '.bg-gray-200',
        '.bg-slate-900',
        '.dark\\:bg-slate-900',
        '[class*="bg-gray"]',
        '[class*="bg-slate"]'
      ].join(', '));

      const textElements = document.querySelectorAll([
        '.text-slate-600',
        '.text-slate-700', 
        '.text-gray-600',
        '.text-gray-700',
        '[class*="text-gray"]',
        '[class*="text-slate"]'
      ].join(', '));

      // Applica styling forzato per background
      backgroundElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty('background-color', 'var(--background-color)', 'important');
      });

      // Applica styling forzato per testi
      textElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty('color', 'var(--text-color)', 'important');
      });

      // Force su cards e surfaces
      const cardElements = document.querySelectorAll([
        '.bg-white',
        '.card',
        '.surface',
        '[data-surface="true"]'
      ].join(', '));

      cardElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty('background-color', 'var(--surface-color)', 'important');
        htmlEl.style.setProperty('color', 'var(--text-color)', 'important');
      });
    };

    // Applica immediatamente
    forceThemeOverride();

    // Applica dopo un piccolo delay per elementi dinamici
    const timeoutId = setTimeout(forceThemeOverride, 100);

    // Observer per elementi che vengono aggiunti dinamicamente
    const observer = new MutationObserver(() => {
      forceThemeOverride();
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, dependencies);
};

// Hook per applicare theme a un elemento specifico
export const useElementTheme = (ref: React.RefObject<HTMLElement>, variant: 'background' | 'surface' | 'primary' = 'surface') => {
  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    
    switch (variant) {
      case 'background':
        element.style.setProperty('background-color', 'var(--background-color)', 'important');
        element.style.setProperty('color', 'var(--text-color)', 'important');
        break;
      case 'surface':
        element.style.setProperty('background-color', 'var(--surface-color)', 'important');
        element.style.setProperty('color', 'var(--text-color)', 'important');
        break;
      case 'primary':
        element.style.setProperty('background-color', 'var(--primary-color)', 'important');
        element.style.setProperty('color', 'white', 'important');
        break;
    }
  }, [ref, variant]);
};