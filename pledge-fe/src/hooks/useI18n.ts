import { useCallback } from 'react';

const useI18n = () => {
  return useCallback((translationId: number, fallback: string) => {
    return fallback;
  }, []);
};

export default useI18n;
