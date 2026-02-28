import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Dil dosyalarını import et
import tr from './locales/tr.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

// Şimdilik detector'ü dışarıda tutup en basit haliyle başlatıyoruz
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: 'en', // Başlangıç dili
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;