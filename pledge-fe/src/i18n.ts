import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';

const resources = {
  en: {
    translation: enTranslation.translation,
  },
  zh: {
    translation: zhTranslation.translation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'zh',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
