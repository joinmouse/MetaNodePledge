import { useTranslation } from 'react-i18next';

const useI18n = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return {
    t,
    changeLanguage,
    currentLanguage,
    isZh: currentLanguage === 'zh',
    isEn: currentLanguage === 'en',
  };
};

export default useI18n;
