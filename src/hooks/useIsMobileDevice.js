import { useState, useEffect } from 'react';

const MOBILE_UA_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|Kindle|Silk|Mobile|Tablet|opera mobi|opera mini/i;

const useIsMobileDevice = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const detect = () => {
      const ua = navigator.userAgent || '';
      const isUaMobile = MOBILE_UA_PATTERN.test(ua);
      const isSmallScreen = window.innerWidth < 1024;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isNarrowViewport = window.matchMedia?.('(max-width: 1023px)').matches;

      setIsMobile(isUaMobile || (isSmallScreen && isTouchDevice) || isNarrowViewport);
    };

    detect();

    const mql = window.matchMedia?.('(max-width: 1023px)');
    const handleResize = () => detect();
    const handleMqlChange = () => detect();

    window.addEventListener('resize', handleResize);
    mql?.addEventListener?.('change', handleMqlChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      mql?.removeEventListener?.('change', handleMqlChange);
    };
  }, []);

  return isMobile;
};

export default useIsMobileDevice;
