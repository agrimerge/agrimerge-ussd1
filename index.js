// ussd-server.js (single file production-ready version)
// Dependencies: express, body-parser, axios, ioredis, bcryptjs
// Install: npm i express body-parser axios ioredis bcryptjs

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Redis = require('ioredis');
const bcrypt = require('bcryptjs');
const { ITEMS, CROPS, FARMING_TIPS, USER_TYPES, WEATHER_TRANSLATIONS_RW } = require('./constants');

// --- Redis Connection ---
const redis = new Redis({
  host: 'normal-hen-16590.upstash.io',
  port: 6379,
  password: 'AUDOAAIncDJiNTljNTUyMGEyZTQ0ZTk5YWI3MzViOWVlMTNiY2FmMHAyMTY1OTA',
  tls: {}, // keep for secure connection (Upstash)
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('Redis connected successfully.'));
redis.on('error', (err) => console.error('Redis connection error:', err));

// --- App & Middleware ---
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- API Keys (kept inline as requested) ---
const OPENWEATHER_API_KEY = '74b40ae6d63662578fb06932913843cd';

// --- Localization / i18n ---
const locales = {
  en: {
    lang_selection: 'Please select your language:\n1. Kinyarwanda\n2. English\n3. Français',
    welcome: 'Welcome to Agrimerge!\n1. Register\n2. Login\n0. Exit',
    exit_message: 'Thank you for using AGRIMERGE.',
    invalid_option: 'Invalid option. Please try again.',
    user_not_found: 'User not found. Please register first.\nDial *123# to start again.',
    generic_error: 'An error occurred. Please try again.',
    reg_enter_name: 'Enter your full name:',
    reg_confirm_phone: 'Your phone number is: {phoneNumber}\n1. Correct\n2. Change',
    reg_enter_phone: 'Enter correct phone number:',
    reg_enter_district: 'Enter your district (e.g., Kigali, Musanze):',
    reg_user_type: 'Select user type:\n1. Farmer\n2. Buyer\n3. Supplier',
    reg_enter_pin: 'Enter 4-digit PIN:',
    reg_confirm_pin: 'Confirm 4-digit PIN:',
    reg_pin_mismatch: 'PINs do not match. Please try again.\nEnter 4-digit PIN:',
    reg_success: 'Registration successful! 👏\nYour PIN: {pin}\nPress 1 to go to Main Menu',
    login_enter_pin: 'Enter your PIN:',
    login_incorrect_pin: 'Invalid PIN. Please try again. ({attempts} attempts left)',
    login_too_many_attempts: 'Too many incorrect attempts. Please try again later.\nDial *123# to start again.',
    login_user_not_found: 'User not found. Please register first.',
    main_menu: 'Main Menu\n1. Sell Produce\n2. Buy Produce\n3. Market Prices\n4. Wallet & Pay\n5. Farming Tips\n6. My Orders\n7. Sent Services\n8. Support / Help\n9. Settings\n0. Exit',
    sell_not_farmer: 'Only farmers can sell produce. Your user type is {userType}.',
    // New menu items
    market_prices_under_dev: 'Market Prices feature is under development. Please try again later.',
    wallet_under_dev: 'Wallet & Pay feature is under development. Please try again later.',
    orders_under_dev: 'My Orders feature is under development. Please try again later.',
    sent_services_under_dev: 'Sent Services feature is under development. Please try again later.',
    settings_under_dev: 'Settings feature is under development. Please try again later.',

    buy_menu: 'Buy Seeds & Fertilizers\n1. Seeds\n2. Fertilizers\n3. Tools\n0. Back',
    sell_menu: 'Sell Produce\n1. Maize\n2. Beans\n3. Potatoes\n4. Cassava\n5. Vegetables\n6. Other\n0. Back',
    tips_menu: 'Farming Tips\n1. Maize Tips\n2. Beans Tips\n3. General Tips\n0. Back',
    support_menu: 'For help, please call or SMS 12345.\n\n0. Back to Main Menu',
    buy_menu_expanded: 'Buy Seeds & Fertilizers\n1. Seeds\n2. Fertilizers\n3. Tools\n4. Food Produce\n0. Back',
    buy_seeds_menu: 'Select Seeds:\n1. Maize Seeds (1500 RWF/kg)\n2. Bean Seeds (2000 RWF/kg)\n0. Back',
    buy_fertilizers_menu: 'Select Fertilizer:\n1. NPK (800 RWF/kg)\n2. Urea (750 RWF/kg)\n3. DAP (850 RWF/kg)\n0. Back',
    buy_tools_menu: 'Select Tool:\n1. Hoe (5000 RWF)\n2. Panga (4500 RWF)\n3. Sprayer (15000 RWF)\n0. Back',
    buy_enter_quantity: 'Enter quantity (e.g., 10 for 10kg or 1 for 1 tool):',
    buy_confirm: 'Confirm Order:\n{quantity} of {item} for {totalPrice} RWF.\n\n1. Confirm\n2. Cancel',
    buy_order_confirmed: 'Order confirmed! You will receive an SMS with pickup/delivery details shortly. Press 1 for Main Menu.',
    buy_order_cancelled: 'Order cancelled. Press 1 for Main Menu.',
    back_to_main_menu: 'Returning to main menu...',
    sell_enter_quantity: 'Enter quantity in kg (e.g., 50):\n0. Back',
    sell_enter_price: 'Enter price per kg in RWF (e.g., 300):\n0. Back',
    sell_confirm_listing: 'Confirm Listing:\nCrop: {crop}\nQty: {quantity} kg\nPrice: {price} RWF/kg\n\n1. Confirm\n2. Cancel',
    sell_listing_successful: 'Your listing for {quantity}kg of {crop} is live! You will be notified of offers. Press 1 for Main Menu.',
    sell_listing_cancelled: 'Listing cancelled. Press 1 for Main Menu.',
    weather_display: 'Weather for {district}:\n{description}, {temp}°C.\n\nPress 0 for Main Menu.',
    weather_error: 'Could not get weather data. Please try again later.\nPress 0 for Main Menu.',
    weather_no_location: 'Your location is not set. Please register again to set it.\nPress 0 for Main Menu.',
  },
  rw: {
    lang_selection: 'Hitamo ururimi rwawe:\n1. Kinyarwanda\n2. Icyongereza\n3. Français',
    welcome: 'Murakaza neza kuri Agrimerge!\n1. Iyandikishe\n2. Injira\n0. Sohora',
    exit_message: 'Murakoze gukoresha AGRIMERGE.',
    user_not_found: 'Ntabwo twabashije kubona konti yawe. Banza wiyandikishe.\nAndika *123# wongere utangire.',
    invalid_option: 'Amahitamo yanyu ntabwo ariyo. Mwongere mugerageze.',
    generic_error: 'Habaye ikibazo. Mwongere mugerageze.',
    reg_enter_name: 'Andika amazina yawe yose:',
    reg_confirm_phone: 'Nimero yawe ya telefone ni: {phoneNumber}\n1. Nibyo\n2. Hindura',
    reg_enter_phone: 'Andika nimero ya telefone ikosoye:',
    reg_enter_district: 'Andika akarere kawe (Urugero: Kigali, Musanze):',
    reg_user_type: 'Hitamo ubwoko bw\'umukoresha:\n1. Umuhinzi\n2. Umuguzi\n3. Utanga ibikoresho',
    reg_enter_pin: 'Andika umubare w\'ibanga w\'imibare 4:',
    reg_confirm_pin: 'Emeza umubare w\'ibanga w\'imibare 4:',
    reg_pin_mismatch: 'Imibare y\'ibanga ntiyahuza. Mwongere mugerageze.\nAndika umubare w\'ibanga w\'imibare 4:',
    reg_success: 'Kwiyandikisha byagenze neza! 👏\nUmubare wanyu w\'ibanga: {pin}\nKanda 1 ujye ahabanza',
    login_enter_pin: 'Andika umubare wanyu w\'ibanga:',
    login_incorrect_pin: 'Umubare w\'ibanga siwo. Mwongere mugerageze. (Hasigaye uburyo {attempts})',
    login_too_many_attempts: 'Mwagerageje kenshi. Mwongere mugerageze nyuma.\nAndika *123# wongere utangire.',
    login_user_not_found: 'Konti yawe ntibonetse. Banza wiyandikishe.',
    main_menu: 'Ahabanza\n1. Gurisha umusaruro\n2. Gura umusaruro\n3. Ibiciro ku isoko\n4. Ikofi & Kwishyura\n5. Inama\n6. Ibyo watumije\n7. Serivisi z\'uwoherejwe\n8. Ubufasha\n9. Igenamiterere\n0. Sohora',
    sell_not_farmer: 'Abahinzi bonyine nibo bemerewe kugurisha umusaruro. Wiyandikishije nk\'uri: {userType}.',
    // New menu items
    market_prices_under_dev: 'Serivisi y\'Ibiciro ku isoko iracyakorwa. Mwongere mugerageze nyuma.',
    wallet_under_dev: 'Serivisi y\'Ikofi & Kwishyura iracyakorwa. Mwongere mugerageze nyuma.',
    orders_under_dev: 'Serivisi y\'Ibyo watumije iracyakorwa. Mwongere mugerageze nyuma.',
    sent_services_under_dev: 'Serivisi z\'uwoherejwe ziracyakorwa. Mwongere mugerageze nyuma.',
    settings_under_dev: 'Serivisi y\'Igenamiterere iracyakorwa. Mwongere mugerageze nyuma.',

    buy_menu: 'Gura Imbuto & Ifumbire\n1. Imbuto\n2. Ifumbire\n3. Ibikoresho\n0. Subira inyuma',
    sell_menu: 'Gurisha Umusaruro\n1. Ibigori\n2. Ibishyimbo\n3. Ibirayi\n4. Imyumbati\n5. Imboga\n6. Ibindi\n0. Subira inyuma',
    tips_menu: 'Inama z\'Ubuhinzi\n1. Inama ku bigori\n2. Inama ku bishyimbo\n3. Inama rusange\n0. Subira inyuma',
    support_menu: 'Ukeneye ubufasha, hamagara cyangwa wohereze ubutumwa kuri 12345.\n\n0. Subira ahabanza',
    buy_menu_expanded: 'Gura Imbuto & Ifumbire\n1. Imbuto\n2. Ifumbire\n3. Ibikoresho\n4. Ibiribwa\n0. Subira inyuma',
    buy_seeds_menu: 'Hitamo Imbuto:\n1. Imbuto y\'ibigori (1500 RWF/kg)\n2. Imbuto y\'ibishyimbo (2000 RWF/kg)\n0. Subira inyuma',
    buy_fertilizers_menu: 'Hitamo Ifumbire:\n1. NPK (800 RWF/kg)\n2. Urea (750 RWF/kg)\n3. DAP (850 RWF/kg)\n0. Subira inyuma',
    buy_tools_menu: 'Hitamo Igikoresho:\n1. Isuka (5000 RWF)\n2. Umuhoro (4500 RWF)\n3. Igitera umuti (15000 RWF)\n0. Subira inyuma',
    buy_enter_quantity: 'Andika ingano (Urugero: 10 kuri 10kg cyangwa 1 ku gikoresho 1):',
    buy_confirm: 'Emeza ibyo ugura:\n{quantity} bya {item} kuri {totalPrice} RWF.\n\n1. Emeza\n2. Hagarika',
    buy_order_confirmed: 'Ibyo mwaguraga byemejwe! Murahita mwakira ubutumwa bugufi buriho amakuru yo kubifata. Kanda 1 usubire ahabanza.',
    buy_order_cancelled: 'Ibyo mwaguraga byahagaritswe. Kanda 1 usubire ahabanza.',
    buy_food_menu: 'Hitamo Ibiribwa:\n1. Umuceri (1000 RWF/kg)\n2. Ingano (900 RWF/kg)\n3. Amasaka (700 RWF/kg)\n0. Subira inyuma',
    back_to_main_menu: 'Ugarutse ahabanza...',
    sell_enter_quantity: 'Andika ingano mu biro (kg) (Urugero: 50):\n0. Subira inyuma',
    sell_enter_price: 'Andika igiciro kuri kg mu RWF (Urugero: 300):\n0. Subira inyuma',
    sell_confirm_listing: 'Emeza igurishwa:\nIgihingwa: {crop}\nIngano: {quantity} kg\nIgiciro: {price} RWF/kg\n\n1. Emeza\n2. Hagarika',
    sell_listing_successful: 'Igurishwa rya {quantity}kg bya {crop} ryashyizwe ku isoko! Muzamenyeshwa ibyifuzo. Kanda 1 usubire ahabanza.',
    sell_listing_cancelled: 'Igurishwa ryahagaritswe. Kanda 1 usubire ahabanza.',
    weather_display: 'Iteganyagihe rya {district}:\n{description}, {temp}°C.\n\nKanda 0 usubire ahabanza.',
    weather_error: 'Amakuru y\'iteganyagihe ntiyabonetse. Mwongere mugerageze nyuma.\nKanda 0 usubire ahabanza.',
    weather_no_location: 'Aho muherereye ntihanditse. Mwongere mwiyandikishe kugirango muhashyire.\nKanda 0 usubire ahabanza.',
  },
  fr: {
    lang_selection: 'Veuillez sélectionner votre langue:\n1. Kinyarwanda\n2. English\n3. Français',
    welcome: 'Bienvenue à Agrimerge!\n1. S\'inscrire\n2. Se connecter\n0. Quitter',
    exit_message: 'Merci d\'utiliser AGRIMERGE.',
    invalid_option: 'Option invalide. Veuillez réessayer.',
    generic_error: 'Une erreur est survenue. Veuillez réessayer.',
    main_menu: 'Menu Principal\n1. Acheter semences & engrais\n2. Vendre produits\n3. Météo\n4. Conseils agricoles\n5. Aide\n0. Quitter',
    weather_display: 'Météo pour {district}:\n{description}, {temp}°C.\n\nAppuyez sur 0 pour le menu principal.',
    weather_error: 'Impossible d\'obtenir les données météo. Veuillez réessayer plus tard.\nAppuyez sur 0 pour le menu principal.',
  },
};

const t = (lang, key, params = {}) => {
  const baseLang = locales[lang] ? lang : 'en';
  let text = locales[baseLang][key] || locales.en[key] || '';
  for (const p in params) {
    text = text.replace(new RegExp(`{${p}}`, 'g'), params[p]);
  }
  return text;
};

// --- Helpers ---
const safeJsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

// USSD root health
app.get('/', (req, res) => {
  res.send('✅ Agrimerge USSD server is running!');
});

// USSD webhook endpoint
app.post('/api/ussd/webhook', async (req, res) => {
  try {
    const { sessionId, phoneNumber = '', text = '' } = req.body || {};
    // Normalize incoming fields
    const sessionKey = `session:${sessionId || phoneNumber || 'unknown'}`;
    const rawSession = await redis.get(sessionKey);
    let session = safeJsonParse(rawSession) || { phone: phoneNumber, stage: 'LANG_SELECTION', lang: 'en', data: {} };

    // USSD providers often send "text" as the full dial string (e.g., "1*2*3") or empty
    // We take the last segment as the user's immediate input
    const inputRaw = (text || '').toString();
    const input = inputRaw === '' ? '' : inputRaw.split('*').pop().trim();

    const response = await handleUSSD(session, input, phoneNumber);

    // Save session (with a short TTL)
    await redis.set(sessionKey, JSON.stringify(response.session), 'EX', 180);

    // Respond in plain text as USSD gateways expect: "CON <message>" or "END <message>"
    res.set('Content-Type', 'text/plain');
    res.send(`${response.type} ${response.message}`);
  } catch (error) {
    console.error('Fatal Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again.\nHabaye ikibazo. Mwongere mugerageze.');
  }
});

async function handleUSSD(session, input, phoneNumber) {
  // defaults
  let responseType = 'CON';
  let responseMessage = '';
  try {
    // Ensure session object shape
    session.lang = session.lang || 'en';
    const lang = session.lang;

    // Check user existence once
    const rawUser = await redis.get(`user:${phoneNumber}`);
    const userExists = safeJsonParse(rawUser);

    switch (session.stage) {
      // LANGUAGE SELECTION
      case 'LANG_SELECTION':
        if (!input) {
          responseMessage = t('en', 'lang_selection');
          session.stage = 'LANG_SELECTION';
        } else {
          if (input === '1') session.lang = 'rw';
          else if (input === '2') session.lang = 'en';
          else if (input === '3') session.lang = 'fr';

          // Accept only valid options
          if (['1', '2', '3'].includes(input)) {
            session.stage = 'WELCOME';
            responseMessage = t(session.lang, 'welcome');
          } else {
            responseMessage = `${t('en', 'invalid_option')}\n${t('en', 'lang_selection')}`;
            session.stage = 'LANG_SELECTION';
            session.lang = 'en';
          }
        }
        break;

      // WELCOME MENU
      case 'WELCOME':
        if (!input) {
          responseMessage = t(lang, 'welcome');
        } else {
          if (input === '1') { // Register
            session.stage = 'REG_ENTER_NAME';
            responseMessage = t(lang, 'reg_enter_name');
          } else if (input === '2') { // Login
            if (userExists) {
              session.stage = 'LOGIN_ENTER_PIN';
              session.data.loginAttempts = 0;
              responseMessage = t(lang, 'login_enter_pin');
            } else {
              responseType = 'END';
              responseMessage = t(lang, 'user_not_found');
            }
          } else if (input === '0') {
            responseType = 'END';
            responseMessage = t(lang, 'exit_message');
          } else {
            responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'welcome')}`;
          }
        }
        break;

      // Registration stages
      case 'REG_ENTER_NAME':
      case 'REG_USER_TYPE':
      case 'REG_ENTER_DISTRICT':
      case 'REG_ENTER_PIN':
      case 'REG_CONFIRM_PIN':
      case 'REG_SUCCESS':
        ({ responseMessage, responseType, session } = await handleRegistration(session, input, session.lang, phoneNumber));
        break;

      // Login
      case 'LOGIN_ENTER_PIN':
        ({ responseMessage, responseType, session } = await handleLogin(session, input, session.lang, userExists));
        break;

      // MAIN MENU
      case 'MAIN_MENU':
        if (!input) {
          responseMessage = t(session.lang, 'main_menu');
        } else {
          switch (input) {
            case '1': { // 1. Gurisha umusaruro (Sell Produce)
              if (!userExists) {
                responseType = 'END';
                responseMessage = t(session.lang, 'user_not_found');
              } else {
                const currentUser = userExists;
                if ((currentUser.userType || '').toLowerCase() === 'farmer' || currentUser.userType === 'Umuhinzi') {
                  session.stage = 'SELL_MENU';
                  responseMessage = t(session.lang, 'sell_menu');
                } else {
                  responseMessage = t(session.lang, 'sell_not_farmer', { userType: currentUser.userType || 'Unknown' });
                  session.stage = 'MAIN_MENU_REDIRECT';
                }
              }
              break;
            }
            case '2': // 2. Gura umusaruro (Buy Produce)
              session.stage = 'BUY_MENU';
              responseMessage = t(session.lang, 'buy_menu_expanded'); // Use expanded menu
              break;
            case '3': // 3. Ibiciro ku isoko (Market Prices)
              responseMessage = t(session.lang, 'market_prices_under_dev');
              session.stage = 'MAIN_MENU_REDIRECT';
              break;
            case '4': // 4. Ikofi & Kwishyura (Wallet & Pay)
              responseMessage = t(session.lang, 'wallet_under_dev');
              session.stage = 'MAIN_MENU_REDIRECT';
              break;
            case '5': // 5. Inama (Farming Tips)
              session.stage = 'TIPS_MENU';
              responseMessage = t(session.lang, 'tips_menu');
              break;
            case '6': // 6. Ibyo watumije (My Orders)
              responseMessage = t(session.lang, 'orders_under_dev');
              session.stage = 'MAIN_MENU_REDIRECT';
              break;
            case '7': // 7. Serivisi z'uwoherejwe (Sent Services)
              responseMessage = t(session.lang, 'sent_services_under_dev');
              session.stage = 'MAIN_MENU_REDIRECT';
              break;
            case '8': // 8. Ubufasha (Support / Help)
              session.stage = 'SUPPORT_MENU';
              responseMessage = t(session.lang, 'support_menu');
              break;
            case '9': // 9. Igenamiterere (Settings)
              responseMessage = t(session.lang, 'settings_under_dev');
              session.stage = 'MAIN_MENU_REDIRECT';
              break;
            // Original case 3 (Weather Updates) is now removed from the main menu
            // If you want to re-add weather, you'll need to find a new spot for it.
            // For now, it's not accessible from this main menu.
            /*
            case 'X': // Placeholder for where Weather might go if re-added
              responseMessage = await handleWeather(session.lang, userExists);
              session.stage = 'MAIN_MENU_REDIRECT';
              break;
            */
            case '0':
              responseType = 'END';
              responseMessage = t(session.lang, 'exit_message');
              break;
            default:
              responseMessage = `${t(session.lang, 'invalid_option')}\n${t(session.lang, 'main_menu')}`;
              break;
          }
        }
        break;

      case 'MAIN_MENU_REDIRECT':
        session.stage = 'MAIN_MENU';
        responseMessage = t(session.lang, 'main_menu');
        break;

      // BUY flow
      case 'BUY_MENU':
      case 'BUY_SEEDS_MENU':
      case 'BUY_FERTILIZERS_MENU':
      case 'BUY_TOOLS_MENU':
      case 'BUY_FOOD_MENU': // New stage for food items
      case 'BUY_ENTER_QUANTITY':
      case 'BUY_CONFIRM':
      case 'BUY_COMPLETE':
        ({ responseMessage, responseType, session } = handleBuyFlow(session, input, session.lang));
        break;

      // SELL flow
      case 'SELL_MENU':
      case 'SELL_ENTER_QUANTITY':
      case 'SELL_ENTER_PRICE':
      case 'SELL_CONFIRM_LISTING':
      case 'SELL_COMPLETE':
        ({ responseMessage, responseType, session } = handleSellFlow(session, input, session.lang));
        break;

      // TIPS
      case 'TIPS_MENU':
        ({ responseMessage, responseType, session } = handleTipsFlow(session, input, session.lang));
        break;

      // SUPPORT_MENU fallback
      case 'SUPPORT_MENU':
        if (input === '0') {
          session.stage = 'MAIN_MENU';
          responseMessage = t(session.lang, 'main_menu');
        } else {
          // Show the support message again if the input is not '0'
          responseMessage = t(session.lang, 'support_menu');
        }
        break;

      default:
        responseType = 'END';
        responseMessage = t(session.lang, 'generic_error');
        session.stage = 'WELCOME';
        break;
    }

    // ensure we never return an empty message
    if (!responseMessage) {
      responseType = 'END';
      responseMessage = t(session.lang, 'generic_error');
      session.stage = 'WELCOME';
    }

    return { session, type: responseType, message: responseMessage };
  } catch (err) {
    console.error('handleUSSD error:', err);
    // Attempt to return a sensible error message in session language
    return {
      session,
      type: 'END',
      message: t(session.lang || 'en', 'generic_error'),
    };
  }
}

// --- Registration Handler ---
async function handleRegistration(session, input, lang, phoneNumber) {
  let responseMessage = '';
  let responseType = 'CON';
  try {
    switch (session.stage) {
      case 'REG_ENTER_NAME':
        if (!input) {
          responseMessage = t(lang, 'reg_enter_name');
        } else {
          session.data.name = input;
          session.stage = 'REG_USER_TYPE';
          responseMessage = t(lang, 'reg_user_type');
        }
        break;

      case 'REG_USER_TYPE':
        if (!input) {
          responseMessage = t(lang, 'reg_user_type');
        } else if (USER_TYPES[input]) {
          session.data.userType = USER_TYPES[input];
          session.stage = 'REG_ENTER_DISTRICT';
          responseMessage = t(lang, 'reg_enter_district');
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'reg_user_type')}`;
        }
        break;

      case 'REG_ENTER_DISTRICT':
        if (!input) {
          responseMessage = t(lang, 'reg_enter_district');
        } else {
          session.data.district = input;
          session.stage = 'REG_ENTER_PIN';
          responseMessage = t(lang, 'reg_enter_pin');
        }
        break;

      case 'REG_ENTER_PIN':
        if (!input || !/^\d{4}$/.test(input)) {
          responseMessage = t(lang, 'reg_enter_pin');
        } else {
          session.data.pin = input;
          session.stage = 'REG_CONFIRM_PIN';
          responseMessage = t(lang, 'reg_confirm_pin');
        }
        break;

      case 'REG_CONFIRM_PIN':
        if (!input || !/^\d{4}$/.test(input)) {
          responseMessage = t(lang, 'reg_confirm_pin');
        } else if (input !== session.data.pin) {
          session.stage = 'REG_ENTER_PIN';
          responseMessage = t(lang, 'reg_pin_mismatch');
        } else {
          // Hash the PIN before storing
          const salt = await bcrypt.genSalt(10);
          const hashedPin = await bcrypt.hash(session.data.pin, salt);

          const userData = {
            name: session.data.name,
            userType: session.data.userType,
            district: session.data.district,
            pinHash: hashedPin,
            phone: phoneNumber,
            createdAt: new Date().toISOString(),
          };

          await redis.set(`user:${phoneNumber}`, JSON.stringify(userData));

          // clear sensitive session data
          delete session.data.pin;

          session.stage = 'REG_SUCCESS';
          responseMessage = t(lang, 'reg_success', { pin: '****' }); // don't show raw PIN
        }
        break;

      case 'REG_SUCCESS':
        if (input === '1') {
          session.stage = 'MAIN_MENU';
          responseMessage = t(lang, 'main_menu');
        } else {
          responseType = 'END';
          responseMessage = t(lang, 'exit_message');
        }
        break;

      default:
        responseType = 'END';
        responseMessage = t(lang, 'generic_error');
        session.stage = 'WELCOME';
        break;
    }
  } catch (err) {
    console.error('handleRegistration error:', err);
    responseType = 'END';
    responseMessage = t(lang, 'generic_error');
    session.stage = 'WELCOME';
  }
  return { responseMessage, responseType, session };
}

// --- Login Handler ---
async function handleLogin(session, input, lang, userExists) {
  let responseMessage = '';
  let responseType = 'CON';
  try {
    if (!userExists) {
      responseType = 'END';
      responseMessage = t(lang, 'login_user_not_found');
      return { responseMessage, responseType, session };
    }
    const user = userExists;

    if (!input) {
      responseMessage = t(lang, 'login_enter_pin');
      return { responseMessage, responseType, session };
    }

    const correct = await bcrypt.compare(input, user.pinHash || '');
    if (correct) {
      session.stage = 'MAIN_MENU';
      responseMessage = t(lang, 'main_menu');
    } else {
      session.data.loginAttempts = (session.data.loginAttempts || 0) + 1;
      if (session.data.loginAttempts >= 3) {
        responseType = 'END';
        responseMessage = t(lang, 'login_too_many_attempts');
      } else {
        const attemptsLeft = 3 - session.data.loginAttempts;
        responseMessage = t(lang, 'login_incorrect_pin', { attempts: attemptsLeft });
      }
    }
  } catch (err) {
    console.error('handleLogin error:', err);
    responseType = 'END';
    responseMessage = t(lang, 'generic_error');
  }
  return { responseMessage, responseType, session };
}

// --- Buy Flow ---
function handleBuyFlow(session, input, lang) {
  let responseMessage = '';
  let responseType = 'CON';
  try {
    switch (session.stage) {
      case 'BUY_MENU':
        if (!input) {
          responseMessage = t(lang, 'buy_menu_expanded'); // Use expanded menu
        } else if (input === '1') {
          session.stage = 'BUY_SEEDS_MENU';
          responseMessage = t(lang, 'buy_seeds_menu');
        } else if (input === '2') {
          session.stage = 'BUY_FERTILIZERS_MENU';
          responseMessage = t(lang, 'buy_fertilizers_menu');
        } else if (input === '3') {
          session.stage = 'BUY_TOOLS_MENU';
          responseMessage = t(lang, 'buy_tools_menu');
        } else if (input === '4') { // New option for Food Produce
          session.stage = 'BUY_FOOD_MENU';
          responseMessage = t(lang, 'buy_food_menu');
        } else if (input === '0') {
          session.stage = 'MAIN_MENU';
          responseMessage = t(lang, 'main_menu');
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_menu')}`;
        }
        break;

      case 'BUY_SEEDS_MENU':
      case 'BUY_FERTILIZERS_MENU':
      case 'BUY_TOOLS_MENU': {
      case 'BUY_FOOD_MENU': { // Handle selection from the new food menu
        const currentMenu = session.stage;
        if (!input) {
          responseMessage = t(lang, currentMenu.toLowerCase());
        } else if (input === '0') {
          session.stage = 'BUY_MENU';
          responseMessage = t(lang, 'buy_menu');
        } else {
          // ITEMS mapping expected: ITEMS['BUY_SEEDS_MENU'] = { '1': { name, name_rw, price, unit }, ... }
          if (ITEMS[currentMenu] && ITEMS[currentMenu][input]) {
            session.data.buyItem = ITEMS[currentMenu][input];
            session.stage = 'BUY_ENTER_QUANTITY';
            responseMessage = t(lang, 'buy_enter_quantity');
          } else {
            responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, currentMenu.toLowerCase())}`;
          }
        }
        break;
      }

      case 'BUY_ENTER_QUANTITY':
        if (!input) {
          responseMessage = t(lang, 'buy_enter_quantity');
        } else {
          const quantity = parseInt(input, 10);
          if (!isNaN(quantity) && quantity > 0 && session.data.buyItem) {
            session.data.buyQuantity = quantity;
            session.data.buyTotalPrice = quantity * (session.data.buyItem.price || 0);
            session.stage = 'BUY_CONFIRM';
            const itemName = session.lang === 'rw' ? session.data.buyItem.name_rw || session.data.buyItem.name : session.data.buyItem.name;
            const unit = session.data.buyItem.unit === 'kg' ? 'kg' : '';
            responseMessage = t(lang, 'buy_confirm', { quantity: `${quantity}${unit}`, item: itemName, totalPrice: session.data.buyTotalPrice });
          } else {
            responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_enter_quantity')}`;
          }
        }
        break;

      case 'BUY_CONFIRM':
        if (!input) {
          responseMessage = t(lang, 'buy_confirm', { quantity: session.data.buyQuantity || '', item: session.data.buyItem?.name || '', totalPrice: session.data.buyTotalPrice || 0 });
        } else if (input === '1') {
          // Here you would create an order record, call payment, notify, etc.
          session.stage = 'BUY_COMPLETE';
          responseMessage = t(lang, 'buy_order_confirmed');
        } else if (input === '2') {
          session.stage = 'BUY_COMPLETE';
          responseMessage = t(lang, 'buy_order_cancelled');
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_confirm', { quantity: session.data.buyQuantity || '', item: session.data.buyItem?.name || '', totalPrice: session.data.buyTotalPrice || 0 })}`;
        }
        break;

      case 'BUY_COMPLETE':
        if (input === '1') {
          session.stage = 'MAIN_MENU';
          responseMessage = t(lang, 'main_menu');
        } else {
          responseType = 'END';
          responseMessage = t(lang, 'exit_message');
        }
        break;

      default:
        responseType = 'END';
        responseMessage = t(lang, 'generic_error');
        session.stage = 'WELCOME';
        break;
    }
  } catch (err) {
    console.error('handleBuyFlow error:', err);
    responseType = 'END';
    responseMessage = t(lang, 'generic_error');
  }

  return { responseMessage, responseType, session };
}

// --- Sell Flow ---
function handleSellFlow(session, input, lang) {
  let responseMessage = '';
  let responseType = 'CON';
  try {
    switch (session.stage) {
      case 'SELL_MENU':
        if (!input) {
          responseMessage = t(lang, 'sell_menu');
        } else if (input === '0') {
          session.stage = 'MAIN_MENU';
          responseMessage = t(lang, 'main_menu');
        } else if (CROPS[input]) {
          session.data.sellCrop = CROPS[input];
          session.stage = 'SELL_ENTER_QUANTITY';
          responseMessage = t(lang, 'sell_enter_quantity');
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_menu')}`;
        }
        break;

      case 'SELL_ENTER_QUANTITY':
        if (!input) {
          responseMessage = t(lang, 'sell_enter_quantity');
        } else if (input === '0') {
          session.stage = 'SELL_MENU';
          responseMessage = t(lang, 'sell_menu');
        } else {
          const qty = parseInt(input, 10);
          if (!isNaN(qty) && qty > 0) {
            session.data.sellQuantity = qty;
            session.stage = 'SELL_ENTER_PRICE';
            responseMessage = t(lang, 'sell_enter_price');
          } else {
            responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_enter_quantity')}`;
          }
        }
        break;

      case 'SELL_ENTER_PRICE':
        if (!input) {
          responseMessage = t(lang, 'sell_enter_price');
        } else if (input === '0') {
          session.stage = 'SELL_ENTER_QUANTITY';
          responseMessage = t(lang, 'sell_enter_quantity');
        } else {
          const price = parseInt(input, 10);
          if (!isNaN(price) && price > 0) {
            session.data.sellPrice = price;
            session.stage = 'SELL_CONFIRM_LISTING';
            const cropName = session.lang === 'rw' ? session.data.sellCrop.name_rw || session.data.sellCrop.name : session.data.sellCrop.name;
            responseMessage = t(lang, 'sell_confirm_listing', { crop: cropName, quantity: session.data.sellQuantity, price: session.data.sellPrice });
          } else {
            responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_enter_price')}`;
          }
        }
        break;

      case 'SELL_CONFIRM_LISTING': {
        const cropName = session.lang === 'rw' ? session.data.sellCrop.name_rw || session.data.sellCrop.name : session.data.sellCrop.name;
        if (input === '1') {
          // Create listing in DB / Redis (basic)
          const listing = {
            phone: session.phone,
            crop: cropName,
            quantity: session.data.sellQuantity,
            price: session.data.sellPrice,
            createdAt: new Date().toISOString(),
          };
          // For demo we store listing in Redis list
          redis.lpush('listings', JSON.stringify(listing)).catch(err => console.error('redis lpush err', err));
          session.stage = 'SELL_COMPLETE';
          responseMessage = t(lang, 'sell_listing_successful', { quantity: session.data.sellQuantity, crop: cropName });
        } else if (input === '2') {
          session.stage = 'SELL_COMPLETE';
          responseMessage = t(lang, 'sell_listing_cancelled');
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_confirm_listing', { crop: cropName, quantity: session.data.sellQuantity, price: session.data.sellPrice })}`;
        }
        break;
      }

      case 'SELL_COMPLETE':
        session.stage = 'MAIN_MENU';
        responseMessage = t(lang, 'main_menu');
        break;

      default:
        responseType = 'END';
        responseMessage = t(lang, 'generic_error');
        session.stage = 'WELCOME';
        break;
    }
  } catch (err) {
    console.error('handleSellFlow error:', err);
    responseType = 'END';
    responseMessage = t(lang, 'generic_error');
  }
  return { responseMessage, responseType, session };
}

// --- Tips Flow ---
function handleTipsFlow(session, input, lang) {
  let responseMessage = '';
  let responseType = 'CON';
  try {
    if (!input) {
      responseMessage = t(lang, 'tips_menu');
    } else if (input === '0') {
      session.stage = 'MAIN_MENU';
      responseMessage = t(lang, 'main_menu');
    } else if (FARMING_TIPS[input]) {
      const tipData = FARMING_TIPS[input];
      responseMessage = session.lang === 'rw' ? (tipData.tip_rw || tipData.tip) : (tipData.tip || tipData.tip_rw);
      session.stage = 'MAIN_MENU_REDIRECT';
    } else {
      responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'tips_menu')}`;
    }
  } catch (err) {
    console.error('handleTipsFlow error:', err);
    responseType = 'END';
    responseMessage = t(lang, 'generic_error');
  }
  return { responseMessage, responseType, session };
}

// --- Weather Handler ---
async function handleWeather(lang, userData) {
  if (!userData || !userData.district) {
    return t(lang, 'weather_no_location');
  }

  try {
    const apiLang = (lang === 'fr') ? 'fr' : 'en';
    // Use the district as the place parameter; consider mapping district names to canonical city names or lat/lon for better accuracy
    const q = encodeURIComponent(`${userData.district},RW`);
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=${apiLang}`;
    const weatherResponse = await axios.get(weatherApiUrl, { timeout: 5000 });
    const { weather, main } = weatherResponse.data;

    let description = weather && weather[0] && weather[0].description ? weather[0].description : '';
    if (lang === 'rw') {
      const key = description.toLowerCase();
      description = WEATHER_TRANSLATIONS_RW[key] || description;
    }

    return t(lang, 'weather_display', {
      district: userData.district,
      description,
      temp: Math.round(main.temp),
    });
  } catch (apiError) {
    console.error('Weather API Error:', apiError && apiError.message ? apiError.message : apiError);
    return t(lang, 'weather_error');
  }
}

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`USSD webhook server listening on port ${PORT}`);
});


