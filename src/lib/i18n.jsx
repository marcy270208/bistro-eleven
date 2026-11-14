import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  isId: false,
});

const DISH_TRANSLATIONS_ID = {
  'classic club sandwich': {
    description: 'Roti panggang renyah dengan ayam empuk, telur mata sapi, dan sayuran segar.',
    ingredients: ['Roti panggang', 'Daging ayam', 'Telur goreng', 'Selada', 'Tomat', 'Mayones'],
  },
  'spaghetti bolognese': {
    description: 'Pasta spaghetti dengan saus daging sapi kaya rempah dan keju parmesan.',
    ingredients: ['Spaghetti', 'Daging sapi cincang', 'Tomat', 'Bawang bombay', 'Bawang putih', 'Keju parmesan'],
  },
  'crispy fried chicken': {
    description: 'Ayam goreng renyah berbumbu rempah khas Bistro Eleven.',
    ingredients: ['Daging ayam', 'Tepung terigu', 'Bumbu rempah Bistro Eleven', 'Minyak goreng'],
  },
  'classic pepperoni pizza': {
    description: 'Pizza klasik dengan topping pepperoni, keju mozzarella leleh, dan saus tomat.',
    ingredients: ['Adonan pizza', 'Pepperoni', 'Keju mozzarella', 'Saus tomat'],
  },
  'chocolate lava cake': {
    description: 'Kue coklat hangat dengan lelehan coklat di tengah, ditaburi gula halus.',
    ingredients: ['Coklat hitam', 'Mentega', 'Telur', 'Gula', 'Tepung terigu', 'Gula halus'],
  },
  'berry & butter pancakes': {
    description: 'Pancake lembut dengan topping buah beri segar, mentega, dan sirup maple.',
    ingredients: ['Tepung terigu', 'Susu', 'Telur', 'Mentega', 'Buah beri segar', 'Sirup maple'],
  },
  'fresh orange juice': {
    description: 'Jus jeruk peras murni disajikan dingin dengan daun mint segar.',
    ingredients: ['Jeruk segar', 'Daun mint', 'Es batu'],
  },
  'strawberry smoothie': {
    description: 'Smoothie stroberi lembut yang diblender dengan susu, yogurt, dan mint segar.',
    ingredients: ['Stroberi segar', 'Susu', 'Yogurt', 'Daun mint segar'],
  },
};

export function localizeDish(dish, lang) {
  if (!dish || lang !== 'id') return dish;
  const key = String(dish.name || '').trim().toLowerCase();
  const translated = DISH_TRANSLATIONS_ID[key];
  if (!translated) return dish;
  return {
    ...dish,
    description: translated.description || dish.description,
    ingredients: translated.ingredients || dish.ingredients,
  };
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('bistroLang');
    return saved === 'id' ? 'id' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('bistroLang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'en' ? 'id' : 'en'));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, isId: lang === 'id' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
