import { useEffect, useRef } from 'react';

export default function useSensitiveContentGuard({ enabled = true } = {}) {
  const originalTitleRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    originalTitleRef.current = document.title;

    const handleBeforePrint = (e) => {
      document.title = 'This page contains sensitive information and cannot be printed.';
      const style = document.createElement('style');
      style.id = 'sk-print-block';
      style.textContent = `
        @media print {
          body * { display: none !important; }
          body::after {
            content: "This page contains sensitive information and cannot be printed.";
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
            color: #ef4444;
            height: 100vh;
            padding: 2rem;
            text-align: center;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const handleAfterPrint = () => {
      const style = document.getElementById('sk-print-block');
      if (style) style.remove();
      document.title = originalTitleRef.current;
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.removeEventListener('keydown', handleKeyDown, true);
      const style = document.getElementById('sk-print-block');
      if (style) style.remove();
    };
  }, [enabled]);
}
