import { useEffect, useState } from 'react';
import { isFaceRegistrationHidden } from '../utils/hideFace';

export default function useFaceRegistrationHidden() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let mounted = true;
    isFaceRegistrationHidden().then((value) => {
      if (mounted) setHidden(value);
    }).catch(() => {
      if (mounted) setHidden(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return hidden;
}