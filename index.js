
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Redis = require('ioredis');
const { ITEMS, CROPS, FARMING_TIPS, USER_TYPES, WEATHER_TRANSLATIONS_RW } = require('./constants');

// --- Redis Connection ---
const redis = new Redis({
  host: 'normal-hen-16590.upstash.io',
  port: 6379,
  password: 'AUDOAAIncDJiNTljNTUyMGEyZTQ0ZTk5YWI3MzViOWVlMTNiY2FmMHAyMTY1OTA',
  tls: {}, // Required for secure connection
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('Redis connected successfully.'));
redis.on('error', (err) => console.error('Redis connection error:', err));

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- API Keys ---
// IMPORTANT: Replace with your actual OpenWeatherMap API key
const OPENWEATHER_API_KEY = '74b40ae6d63662578fb06932913843cd';

// --- Localization / Internationalization (i18n) ---
const locales = {
  en: {
    // Step 1: Welcome
    lang_selection: 'Please select your language:\n1. Kinyarwanda\n2. English',
    welcome: 'Welcome to Agrimerge!\n1. Register\n2. Login\n0. Exit',
    exit_message: 'Thank you for using AGRIMERGE.',
    invalid_option: 'Invalid option. Please try again.',
    user_not_found: 'User not found. Please register first.\nDial *123# to start again.',
    generic_error: 'An error occurred. Please try again.',

    // Step 2: Registration
    reg_enter_name: 'Enter your full name:',
    reg_confirm_phone: 'Your phone number is: {phoneNumber}\n1. Correct\n2. Change',
    reg_enter_phone: 'Enter correct phone number:',
    reg_enter_district: 'Enter your district (e.g., Kigali, Musanze):',
    reg_user_type: 'Select user type:\n1. Farmer\n2. Buyer\n3. Supplier',
    reg_enter_pin: 'Enter 4-digit PIN:',
    reg_confirm_pin: 'Confirm 4-digit PIN:',
    reg_pin_mismatch: 'PINs do not match. Please try again.\nEnter 4-digit PIN:',
    reg_success: 'Registration successful! 👏\nYour PIN: {pin}\nPress 1 to go to Main Menu',

    // Step 3: Login
    login_enter_pin: 'Enter your PIN:',
    login_incorrect_pin: 'Invalid PIN. Please try again. ({attempts} attempts left)',
    login_too_many_attempts: 'Too many incorrect attempts. Please try again later.',
    login_user_not_found: 'User not found. Please register first.',

    // Step 4: Main Menu
    main_menu: 'Main Menu\n1. Buy Seeds & Fertilizers\n2. Sell Produce\n3. Weather Updates\n4. Farming Tips\n5. Support / Help\n0. Exit',
    sell_not_farmer: 'Only farmers can sell produce. Your user type is {userType}.',

    // Step 5: Submenus (placeholders)
    buy_menu: 'Buy Seeds & Fertilizers\n1. Seeds\n2. Fertilizers\n3. Tools\n0. Back',
    sell_menu: 'Sell Produce\n1. Maize\n2. Beans\n3. Potatoes\n4. Cassava\n5. Vegetables\n6. Other\n0. Back',
    tips_menu: 'Farming Tips\n1. Maize Tips\n2. Beans Tips\n3. General Tips\n0. Back',
    support_menu: 'Support / Help\nSelect category:',

    // Buy Flow
    buy_seeds_menu: 'Select Seeds:\n1. Maize Seeds (1500 RWF/kg)\n2. Bean Seeds (2000 RWF/kg)\n0. Back',
    buy_fertilizers_menu: 'Select Fertilizer:\n1. NPK (800 RWF/kg)\n2. Urea (750 RWF/kg)\n3. DAP (850 RWF/kg)\n0. Back',
    buy_tools_menu: 'Select Tool:\n1. Hoe (5000 RWF)\n2. Panga (4500 RWF)\n3. Sprayer (15000 RWF)\n0. Back',
    buy_enter_quantity: 'Enter quantity (e.g., 10 for 10kg or 1 for 1 tool):',
    buy_confirm: 'Confirm Order:\n{quantity} of {item} for {totalPrice} RWF.\n\n1. Confirm\n2. Cancel',
    buy_order_confirmed: 'Order confirmed! You will receive an SMS with pickup/delivery details shortly. Press 1 for Main Menu.',
    buy_order_cancelled: 'Order cancelled. Press 1 for Main Menu.',
    back_to_main_menu: 'Returning to main menu...',

    // Sell Flow
    sell_enter_quantity: 'Enter quantity in kg (e.g., 50):\n0. Back',
    sell_enter_price: 'Enter price per kg in RWF (e.g., 300):\n0. Back',
    sell_confirm_listing: 'Confirm Listing:\nCrop: {crop}\nQty: {quantity} kg\nPrice: {price} RWF/kg\n\n1. Confirm\n2. Cancel',
    sell_listing_successful: 'Your listing for {quantity}kg of {crop} is live! You will be notified of offers. Press 1 for Main Menu.',
    sell_listing_cancelled: 'Listing cancelled. Press 1 for Main Menu.',

    // Weather Flow
    weather_display: 'Weather for {district}:\n{description}, {temp}°C.\n\nPress 0 for Main Menu.',
    weather_error: 'Could not get weather data. Please try again later.\nPress 0 for Main Menu.',
    weather_no_location: 'Your location is not set. Please register again to set it.\nPress 0 for Main Menu.',
  },
  rw: {
    lang_selection: 'Hitamo ururimi rwawe:\n1. Kinyarwanda\n2. Icyongereza',
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
    login_too_many_attempts: 'Mwagerageje kenshi. Mwongere nyuma.',
    login_user_not_found: 'Konti yawe ntibonetse. Banza wiyandikishe.',
    main_menu: 'Ahabanza\n1. Gura Imbuto & Ifumbire\n2. Gurisha Umusaruro\n3. Amakuru y\'Ikirere\n4. Inama z\'Ubuhinzi\n5. Ubufasha\n0. Sohora',
    sell_not_farmer: 'Abahinzi bonyine nibo bemerewe kugurisha umusaruro. Wiyandikishije nk\'uri: {userType}.',
    buy_menu: 'Gura Imbuto & Ifumbire\n1. Imbuto\n2. Ifumbire\n3. Ibikoresho\n0. Subira inyuma',
    sell_menu: 'Gurisha Umusaruro\n1. Ibigori\n2. Ibishyimbo\n3. Ibirayi\n4. Imyumbati\n5. Imboga\n6. Ibindi\n0. Subira inyuma',
    tips_menu: 'Inama z\'Ubuhinzi\n1. Inama ku bigori\n2. Inama ku bishyimbo\n3. Inama rusange\n0. Subira inyuma',
    support_menu: 'Ubufasha\nHitamo icyiciro:',
    buy_seeds_menu: 'Hitamo Imbuto:\n1. Imbuto y\'ibigori (1500 RWF/kg)\n2. Imbuto y\'ibishyimbo (2000 RWF/kg)\n0. Subira inyuma',
    buy_fertilizers_menu: 'Hitamo Ifumbire:\n1. NPK (800 RWF/kg)\n2. Urea (750 RWF/kg)\n3. DAP (850 RWF/kg)\n0. Subira inyuma',
    buy_tools_menu: 'Hitamo Igikoresho:\n1. Isuka (5000 RWF)\n2. Umuhoro (4500 RWF)\n3. Igitera umuti (15000 RWF)\n0. Subira inyuma',
    buy_enter_quantity: 'Andika ingano (Urugero: 10 kuri 10kg cyangwa 1 ku gikoresho 1):',
    buy_confirm: 'Emeza ibyo ugura:\n{quantity} bya {item} kuri {totalPrice} RWF.\n\n1. Emeza\n2. Hagarika',
    buy_order_confirmed: 'Ibyo mwaguraga byemejwe! Murahita mwakira ubutumwa bugufi buriho amakuru yo kubifata. Kanda 1 usubire ahabanza.',
    buy_order_cancelled: 'Ibyo mwaguraga byahagaritswe. Kanda 1 usubire ahabanza.',
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
    // Adding a few French translations as an example
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
  let text = locales[lang]?.[key] || locales.en[key];
  for (const key in params) {
    text = text.replace(new RegExp(`{${key}}`, 'g'), params[key]);
  }
  return text;
};

app.get('/', (req, res) => {
  res.send('✅ Agrimerge USSD server is running!');
});

app.post('/api/ussd/webhook', async (req, res) => {
  try {
    const { sessionId, phoneNumber, text } = req.body;
    const input = text.split('*').pop();

    let session = JSON.parse(await redis.get(`session:${sessionId}`) || 'null');
    if (!session) { // New user session
      session = { phone: phoneNumber, stage: 'LANG_SELECTION', lang: 'en', data: {} };
    }

    const response = await handleUSSD(session, input, phoneNumber);

    await redis.set(`session:${sessionId}`, JSON.stringify(response.session), 'EX', 180);

    res.set('Content-Type', 'text/plain');
    res.send(`${response.type} ${response.message}`);

  } catch (error) {
    console.error('Fatal Error:', error);
    // We don't have session/lang here, so a generic multi-language response is best
    res.set('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again.\nHabaye ikibazo. Mwongere mugerageze.');
  }
});

async function handleUSSD(session, input, phoneNumber) {
  const lang = session.lang || 'en';
  const userExists = await redis.get(`user:${phoneNumber}`); // Check if user is already registered

  switch (session.stage) {
    case 'LANG_SELECTION':
      if (input === '') {
        responseMessage = t('en', 'lang_selection'); // Show in English by default
      } else {
        if (input === '1') { session.lang = 'rw'; }
        else if (input === '2') { session.lang = 'en'; }
        else if (input === '3') { session.lang = 'fr'; } // Example for French

        // If a valid language is selected, move to the welcome screen
        if (['1', '2', '3'].includes(input)) {
          session.stage = 'WELCOME';
          responseMessage = t(session.lang, 'welcome');
        } else {
          responseMessage = `${t('en', 'invalid_option')}\n${t('en', 'lang_selection')}`;
        }
      }
      break;
    case 'WELCOME':
      if (input === '') {
        responseMessage = t(lang, 'welcome');
      } else {
        switch (input) {
          case '1': // Register
            session.stage = 'REG_ENTER_NAME';
            responseMessage = t(lang, 'reg_enter_name');
            break;
          case '2': // Login
            if (userExists) {
              session.stage = 'LOGIN_ENTER_PIN';
              session.data.loginAttempts = 0;
              responseMessage = t(lang, 'login_enter_pin');
            } else {
              // If user tries to log in but doesn't exist, prompt to register
              responseMessage = t(lang, 'login_user_not_found');
            }
            break;
          case '0': // Exit
            responseType = 'END';
            responseMessage = t(lang, 'exit_message');
            break;
          default:
            responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'welcome')}`;
            break;
        }
      }
      break;

    // --- Registration Flow (Delegated) ---
    case 'REG_ENTER_NAME':
    case 'REG_USER_TYPE':
    case 'REG_ENTER_DISTRICT':
    case 'REG_ENTER_PIN':
    case 'REG_CONFIRM_PIN':
    case 'REG_SUCCESS':
      ({ responseMessage, responseType, session } = await handleRegistration(session, input, lang, phoneNumber));
      break;

    // --- Login Flow (Delegated) ---
    case 'LOGIN_ENTER_PIN':
      ({ responseMessage, responseType, session } = await handleLogin(session, input, lang, userExists));
      break;

    // --- Main Menu & Submenus ---
    case 'MAIN_MENU':
      switch (input) {
        case '1': 
          session.stage = 'BUY_MENU'; 
          responseMessage = t(lang, 'buy_menu'); 
          break;
        case '2': 
          const currentUser = JSON.parse(userExists);
          if (currentUser.userType === 'Farmer') {
            session.stage = 'SELL_MENU';
            responseMessage = t(lang, 'sell_menu');
          } else {
            responseMessage = t(lang, 'sell_not_farmer', { userType: currentUser.userType });
            session.stage = 'MAIN_MENU_REDIRECT'; // Go back to main menu after message
          }
          break;
        case '3': // Weather Updates
          responseMessage = await handleWeather(lang, userExists);
          session.stage = 'MAIN_MENU_REDIRECT';
          break;
        case '4': session.stage = 'TIPS_MENU'; responseMessage = t(lang, 'tips_menu'); break; // Farming Tips
        case '5': session.stage = 'SUPPORT_MENU'; responseMessage = t(lang, 'support_menu'); break;
        case '0': responseType = 'END'; responseMessage = t(lang, 'exit_message'); break;
        default: responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'main_menu')}`; break;
      }
      break;

    case 'MAIN_MENU_REDIRECT': // A simple stage to handle returning to the main menu
      session.stage = 'MAIN_MENU';
      responseMessage = t(lang, 'main_menu');
      break;

    // --- Buy Flow (Delegated) ---
    case 'BUY_MENU':
    case 'BUY_SEEDS_MENU':
    case 'BUY_FERTILIZERS_MENU':
    case 'BUY_TOOLS_MENU':
    case 'BUY_ENTER_QUANTITY':
    case 'BUY_CONFIRM':
    case 'BUY_COMPLETE':
      ({ responseMessage, responseType, session } = handleBuyFlow(session, input, lang));
      break;

    // --- Sell Flow (Delegated) ---
    case 'SELL_MENU':
    case 'SELL_ENTER_QUANTITY':
    case 'SELL_ENTER_PRICE':
    case 'SELL_CONFIRM_LISTING':
    case 'SELL_COMPLETE':
      ({ responseMessage, responseType, session } = handleSellFlow(session, input, lang));
      break;

    // --- Tips Flow ---
    case 'TIPS_MENU':
      ({ responseMessage, responseType, session } = handleTipsFlow(session, input, lang));
      break;

    default:
      responseType = 'END';
      responseMessage = t(lang, 'generic_error');
      session.stage = 'WELCOME'; // Reset to start
      break;
  }

  // Fallback for unhandled stages to prevent crashes
  if (responseMessage === '') {
    responseType = 'END';
    responseMessage = t(lang, 'generic_error');
    session.stage = 'WELCOME'; // Reset to start
  }

  return {
    session: session,
    type: responseType,
    message: responseMessage,
  };
}

// --- Refactored Handlers ---

async function handleRegistration(session, input, lang, phoneNumber) {
  let responseMessage = '';
  let responseType = 'CON';

  switch (session.stage) {
    case 'REG_ENTER_NAME':
      session.data.name = input;
      session.stage = 'REG_USER_TYPE';
      responseMessage = t(lang, 'reg_user_type');
      break;
    case 'REG_USER_TYPE':
      if (USER_TYPES[input]) {
        session.data.userType = USER_TYPES[input];
        session.stage = 'REG_ENTER_DISTRICT';
        responseMessage = t(lang, 'reg_enter_district');
      } else {
        responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'reg_user_type')}`;
      }
      break;
    case 'REG_ENTER_DISTRICT':
      session.data.district = input;
      session.stage = 'REG_ENTER_PIN';
      responseMessage = t(lang, 'reg_enter_pin');
      break;
    case 'REG_ENTER_PIN':
      session.data.pin = input;
      session.stage = 'REG_CONFIRM_PIN';
      responseMessage = t(lang, 'reg_confirm_pin');
      break;
    case 'REG_CONFIRM_PIN':
      if (input === session.data.pin) {
        const userData = {
          name: session.data.name,
          userType: session.data.userType,
          district: session.data.district,
          pin: session.data.pin, // In a real app, hash the PIN!
          phone: phoneNumber,
        };
        await redis.set(`user:${phoneNumber}`, JSON.stringify(userData));
        session.stage = 'REG_SUCCESS';
        responseMessage = t(lang, 'reg_success', { pin: session.data.pin });
      } else {
        session.stage = 'REG_ENTER_PIN';
        responseMessage = t(lang, 'reg_pin_mismatch');
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
  }
  return { responseMessage, responseType, session };
}

async function handleLogin(session, input, lang, userExists) {
  let responseMessage = '';
  let responseType = 'CON';
  const user = JSON.parse(userExists);

  if (input === user.pin) { // In a real app, compare hashed PINs
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
  return { responseMessage, responseType, session };
}

function handleBuyFlow(session, input, lang) {
  let responseMessage = '';
  let responseType = 'CON';

  switch (session.stage) {
    case 'BUY_MENU':
      if (input === '1') { session.stage = 'BUY_SEEDS_MENU'; responseMessage = t(lang, 'buy_seeds_menu'); }
      else if (input === '2') { session.stage = 'BUY_FERTILIZERS_MENU'; responseMessage = t(lang, 'buy_fertilizers_menu'); }
      else if (input === '3') { session.stage = 'BUY_TOOLS_MENU'; responseMessage = t(lang, 'buy_tools_menu'); }
      else if (input === '0') { session.stage = 'MAIN_MENU'; responseMessage = t(lang, 'main_menu'); }
      else { responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_menu')}`; }
      break;
    case 'BUY_SEEDS_MENU':
    case 'BUY_FERTILIZERS_MENU':
    case 'BUY_TOOLS_MENU':
      const currentMenu = session.stage;
      if (input === '0') {
        session.stage = 'BUY_MENU';
        responseMessage = t(lang, 'buy_menu');
      } else if (ITEMS[currentMenu] && ITEMS[currentMenu][input]) {
        session.data.buyItem = ITEMS[currentMenu][input];
        session.stage = 'BUY_ENTER_QUANTITY';
        responseMessage = t(lang, 'buy_enter_quantity');
      } else {
        responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, currentMenu.toLowerCase())}`;
      }
      break;
    case 'BUY_ENTER_QUANTITY':
      const quantity = parseInt(input, 10);
      if (!isNaN(quantity) && quantity > 0) {
        session.data.buyQuantity = quantity;
        session.data.buyTotalPrice = quantity * session.data.buyItem.price;
        session.stage = 'BUY_CONFIRM';
        const itemName = lang === 'rw' ? session.data.buyItem.name_rw : session.data.buyItem.name;
        const unit = session.data.buyItem.unit === 'kg' ? 'kg' : '';
        responseMessage = t(lang, 'buy_confirm', { quantity: `${quantity}${unit}`, item: itemName, totalPrice: session.data.buyTotalPrice });
      } else {
        responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_enter_quantity')}`;
      }
      break;
    case 'BUY_CONFIRM':
      if (input === '1') { session.stage = 'BUY_COMPLETE'; responseMessage = t(lang, 'buy_order_confirmed'); }
      else if (input === '2') { session.stage = 'BUY_COMPLETE'; responseMessage = t(lang, 'buy_order_cancelled'); }
      else { responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_confirm', { /* re-populate params */ })}`; }
      break;
    case 'BUY_COMPLETE':
      if (input === '1') { session.stage = 'MAIN_MENU'; responseMessage = t(lang, 'main_menu'); }
      else { responseType = 'END'; responseMessage = t(lang, 'exit_message'); }
      break;
  }
  return { responseMessage, responseType, session };
}

function handleSellFlow(session, input, lang) {
  let responseMessage = '';
  let responseType = 'CON';

  switch (session.stage) {
    case 'SELL_MENU':
      if (input === '0') { session.stage = 'MAIN_MENU'; responseMessage = t(lang, 'main_menu'); }
      else if (CROPS[input]) {
        session.data.sellCrop = CROPS[input];
        session.stage = 'SELL_ENTER_QUANTITY';
        responseMessage = t(lang, 'sell_enter_quantity');
      } else { responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_menu')}`; }
      break;
    case 'SELL_ENTER_QUANTITY':
      if (input === '0') { session.stage = 'SELL_MENU'; responseMessage = t(lang, 'sell_menu'); }
      else {
        const qty = parseInt(input, 10);
        if (!isNaN(qty) && qty > 0) {
          session.data.sellQuantity = qty;
          session.stage = 'SELL_ENTER_PRICE';
          responseMessage = t(lang, 'sell_enter_price');
        } else { responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_enter_quantity')}`; }
      }
      break;
    case 'SELL_ENTER_PRICE':
      if (input === '0') { session.stage = 'SELL_ENTER_QUANTITY'; responseMessage = t(lang, 'sell_enter_quantity'); }
      else {
        const price = parseInt(input, 10);
        if (!isNaN(price) && price > 0) {
          session.data.sellPrice = price;
          session.stage = 'SELL_CONFIRM_LISTING';
          const cropName = lang === 'rw' ? session.data.sellCrop.name_rw : session.data.sellCrop.name;
          responseMessage = t(lang, 'sell_confirm_listing', { crop: cropName, quantity: session.data.sellQuantity, price: session.data.sellPrice });
        } else { responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_enter_price')}`; }
      }
      break;
    case 'SELL_CONFIRM_LISTING':
      const cropName = lang === 'rw' ? session.data.sellCrop.name_rw : session.data.sellCrop.name;
      if (input === '1') {
        session.stage = 'SELL_COMPLETE';
        responseMessage = t(lang, 'sell_listing_successful', { quantity: session.data.sellQuantity, crop: cropName });
      } else {
        session.stage = 'SELL_COMPLETE';
        responseMessage = t(lang, 'sell_listing_cancelled');
      }
      break;
    case 'SELL_COMPLETE':
      session.stage = 'MAIN_MENU';
      responseMessage = t(lang, 'main_menu');
      break;
  }
  return { responseMessage, responseType, session };
}

function handleTipsFlow(session, input, lang) {
  let responseMessage = '';
  if (input === '0') {
    session.stage = 'MAIN_MENU';
    responseMessage = t(lang, 'main_menu');
  } else if (FARMING_TIPS[input]) {
    const tipData = FARMING_TIPS[input];
    responseMessage = lang === 'rw' ? tipData.tip_rw : tipData.tip;
    session.stage = 'MAIN_MENU_REDIRECT'; // Go back to main menu after showing tip
  } else {
    responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'tips_menu')}`;
  }
  return { responseMessage, responseType: 'CON', session };
}

async function handleWeather(lang, userExists) {
  const userData = JSON.parse(userExists);
  if (!userData || !userData.district) {
    return t(lang, 'weather_no_location');
  }

  try {
    // Use 'fr' for French, otherwise default to English for API call, as 'rw' is not supported
    const apiLang = lang === 'fr' ? 'fr' : 'en';
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${userData.district},RW&appid=${OPENWEATHER_API_KEY}&units=metric&lang=${apiLang}`;
    const weatherResponse = await axios.get(weatherApiUrl);
    const { weather, main } = weatherResponse.data;

    let description = weather[0].description;
    // If the user's language is Kinyarwanda, try to translate the description manually
    if (lang === 'rw') {
      description = WEATHER_TRANSLATIONS_RW[weather[0].description.toLowerCase()] || weather[0].description;
    }

    return t(lang, 'weather_display', {
      district: userData.district,
      description: description,
      temp: Math.round(main.temp)
    });
  } catch (apiError) {
    console.error("Weather API Error:", apiError.message);
    return t(lang, 'weather_error');
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`USSD webhook server listening on port ${PORT}`);
});
