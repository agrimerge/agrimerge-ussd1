const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Redis = require('ioredis');

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

    // Step 4: Main Menu
    main_menu: 'Main Menu\n1. Buy Seeds & Fertilizers\n2. Sell Produce\n3. Weather Updates\n4. Farming Tips\n5. Support / Help\n0. Exit',

    // Step 5: Submenus (placeholders)
    buy_menu: 'Buy Seeds & Fertilizers\n1. Seeds\n2. Fertilizers\n3. Tools\n0. Back',
    sell_menu: 'Sell Produce\n1. Maize\n2. Beans\n3. Other\n0. Back',
    tips_menu: 'Select crop for farming tips:',
    support_menu: 'Support / Help\nSelect category:',

    // Buy Flow
    buy_seeds_menu: 'Select Seeds:\n1. Maize Seeds (1500 RWF/kg)\n2. Bean Seeds (2000 RWF/kg)\n0. Back',
    buy_fertilizers_menu: 'Select Fertilizer:\n1. NPK (800 RWF/kg)\n2. Urea (750 RWF/kg)\n0. Back',
    buy_tools_menu: 'Select Tool:\n1. Hoe (5000 RWF)\n2. Panga (4500 RWF)\n0. Back',
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
    main_menu: 'Ahabanza\n1. Gura Imbuto & Ifumbire\n2. Gurisha Umusaruro\n3. Amakuru y\'Ikirere\n4. Inama z\'Ubuhinzi\n5. Ubufasha\n0. Sohora',
    buy_menu: 'Gura Imbuto & Ifumbire\n1. Imbuto\n2. Ifumbire\n3. Ibikoresho\n0. Subira inyuma',
    sell_menu: 'Gurisha Umusaruro\n1. Ibigori\n2. Ibishyimbo\n3. Ibindi\n0. Subira inyuma',
    tips_menu: 'Hitamo igihingwa ushakira inama:',
    support_menu: 'Ubufasha\nHitamo icyiciro:',
    buy_seeds_menu: 'Hitamo Imbuto:\n1. Imbuto y\'ibigori (1500 RWF/kg)\n2. Imbuto y\'ibishyimbo (2000 RWF/kg)\n0. Subira inyuma',
    buy_fertilizers_menu: 'Hitamo Ifumbire:\n1. NPK (800 RWF/kg)\n2. Urea (750 RWF/kg)\n0. Subira inyuma',
    buy_tools_menu: 'Hitamo Igikoresho:\n1. Isuka (5000 RWF)\n2. Umuhoro (4500 RWF)\n0. Subira inyuma',
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
    welcome: 'Bienvenue chez AGRIMERGE',
    // ... other translations
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
    res.set('Content-Type', 'text/plain');
    res.send('END An unexpected error occurred. Please try again later.');
  }
});

async function handleUSSD(session, input, phoneNumber) {
  let responseMessage = '';
  let responseType = 'CON';
  const lang = session.lang || 'en';
  const userExists = await redis.get(`user:${phoneNumber}`); // Check if user is already registered

  switch (session.stage) {
    case 'LANG_SELECTION':
      if (input === '') {
        responseMessage = t('en', 'lang_selection'); // Show in English by default
      } else {
        if (input === '1') session.lang = 'rw';
        if (input === '2') session.lang = 'en';
        
        // If a valid language is selected, move to the welcome screen
        if (input === '1' || input === '2') {
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
              responseType = 'END';
              responseMessage = `User not found. Please register first.\nDial *123# to start again.`;
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

    // --- Registration Flow ---
    case 'REG_ENTER_NAME':
      session.data.name = input;
      session.stage = 'REG_USER_TYPE';
      responseMessage = t(lang, 'reg_user_type');
      break;

    case 'REG_USER_TYPE':
      const userTypes = { '1': 'Farmer', '2': 'Buyer', '3': 'Supplier' };
      if (userTypes[input]) {
        session.data.userType = userTypes[input];
        session.stage = 'REG_ENTER_DISTRICT';
        responseMessage = t(lang, 'reg_enter_district');
      } else {
        responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'reg_user_type')}`;
      }
      break;

    case 'REG_ENTER_DISTRICT':
      session.data.district = input; // Assuming input is a valid district name
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
        // --- SAVE USER TO REDIS ---
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

    // --- Login Flow ---
    case 'LOGIN_ENTER_PIN':
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
      break;

    // --- Main Menu & Submenus ---
    case 'MAIN_MENU':
      switch (input) {
        case '1': 
          session.stage = 'BUY_MENU'; 
          responseMessage = t(lang, 'buy_menu'); 
          break;
        case '2': 
          // Only allow 'Farmer' user type to sell
          const user = JSON.parse(userExists);
          session.stage = 'SELL_MENU'; 
          responseMessage = t(lang, 'sell_menu'); 
          break;
        case '3': // Weather Updates
          const userData = JSON.parse(userExists);
          if (userData && userData.district) {
            try {
              const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${userData.district},RW&appid=${OPENWEATHER_API_KEY}&units=metric`;
              const weatherResponse = await axios.get(weatherApiUrl);
              const { weather, main } = weatherResponse.data;
              
              responseMessage = t(lang, 'weather_display', {
                district: userData.district,
                description: weather[0].description,
                temp: Math.round(main.temp)
              });

            } catch (apiError) {
              console.error("Weather API Error:", apiError.message);
              responseMessage = t(lang, 'weather_error');
            }
          } else {
            responseMessage = t(lang, 'weather_no_location');
          }
          // This is a display-only screen, so we set the next stage back to main menu
          session.stage = 'MAIN_MENU_REDIRECT';
          break;
        case '4': session.stage = 'TIPS_MENU'; responseMessage = t(lang, 'tips_menu'); break;
        case '5': session.stage = 'SUPPORT_MENU'; responseMessage = t(lang, 'support_menu'); break;
        case '0': responseType = 'END'; responseMessage = t(lang, 'exit_message'); break;
        default: responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'main_menu')}`; break;
      }
      break;

    case 'MAIN_MENU_REDIRECT': // A simple stage to handle returning to the main menu
      session.stage = 'MAIN_MENU';
      responseMessage = t(lang, 'main_menu');
      break;


    // --- Buy Seeds & Fertilizers Flow ---
    case 'BUY_MENU':
      switch (input) {
        case '1': session.stage = 'BUY_SEEDS_MENU'; responseMessage = t(lang, 'buy_seeds_menu'); break;
        case '2': session.stage = 'BUY_FERTILIZERS_MENU'; responseMessage = t(lang, 'buy_fertilizers_menu'); break;
        case '3': session.stage = 'BUY_TOOLS_MENU'; responseMessage = t(lang, 'buy_tools_menu'); break;
        case '0': session.stage = 'MAIN_MENU'; responseMessage = t(lang, 'main_menu'); break;
        default: responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_menu')}`; break;
      }
      break;

    case 'BUY_SEEDS_MENU':
    case 'BUY_FERTILIZERS_MENU':
    case 'BUY_TOOLS_MENU':
      // Mock data for items and prices
      const items = {
        'BUY_SEEDS_MENU': { '1': { name: 'Maize Seeds', price: 1500 }, '2': { name: 'Bean Seeds', price: 2000 } },
        'BUY_FERTILIZERS_MENU': { '1': { name: 'NPK', price: 800 }, '2': { name: 'Urea', price: 750 } },
        'BUY_TOOLS_MENU': { '1': { name: 'Hoe', price: 5000 }, '2': { name: 'Panga', price: 4500 } }
      };
      const currentMenu = session.stage;
      if (input === '0') {
        session.stage = 'BUY_MENU';
        responseMessage = t(lang, 'buy_menu');
      } else if (items[currentMenu] && items[currentMenu][input]) {
        session.data.buyItem = items[currentMenu][input];
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
        responseMessage = t(lang, 'buy_confirm', {
          quantity: `${quantity}${session.stage === 'BUY_TOOLS_MENU' ? '' : 'kg'}`,
          item: session.data.buyItem.name,
          totalPrice: session.data.buyTotalPrice
        });
      } else {
        responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_enter_quantity')}`;
      }
      break;

    case 'BUY_CONFIRM':
      switch (input) {
        case '1': // Confirm
          // Here you would trigger the order processing logic (e.g., save to DB, send SMS)
          session.stage = 'BUY_COMPLETE';
          responseMessage = t(lang, 'buy_order_confirmed');
          break;
        case '2': // Cancel
          session.stage = 'BUY_COMPLETE';
          responseMessage = t(lang, 'buy_order_cancelled');
          break;
        default:
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'buy_confirm', {
            quantity: `${session.data.buyQuantity}${session.stage === 'BUY_TOOLS_MENU' ? '' : 'kg'}`,
            item: session.data.buyItem.name,
            totalPrice: session.data.buyTotalPrice
          })}`;
          break;
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

    // --- Sell Produce Flow ---
    case 'SELL_MENU':
      const crops = { '1': 'Maize', '2': 'Beans', '3': 'Other' };
      if (input === '0') {
        session.stage = 'MAIN_MENU';
        responseMessage = t(lang, 'main_menu');
      } else if (crops[input]) {
        session.data.sellCrop = crops[input];
        session.stage = 'SELL_ENTER_QUANTITY';
        responseMessage = t(lang, 'sell_enter_quantity');
      } else {
        responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_menu')}`;
      }
      break;

    case 'SELL_ENTER_QUANTITY':
      if (input === '0') {
        session.stage = 'SELL_MENU';
        responseMessage = t(lang, 'sell_menu');
      } else {
        const sellQuantity = parseInt(input, 10);
        if (!isNaN(sellQuantity) && sellQuantity > 0) {
          session.data.sellQuantity = sellQuantity;
          session.stage = 'SELL_ENTER_PRICE';
          responseMessage = t(lang, 'sell_enter_price');
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_enter_quantity')}`;
        }
      }
      break;

    case 'SELL_ENTER_PRICE':
      if (input === '0') {
        session.stage = 'SELL_ENTER_QUANTITY';
        responseMessage = t(lang, 'sell_enter_quantity');
      } else {
        const sellPrice = parseInt(input, 10);
        if (!isNaN(sellPrice) && sellPrice > 0) {
          session.data.sellPrice = sellPrice;
          session.stage = 'SELL_CONFIRM_LISTING';
          responseMessage = t(lang, 'sell_confirm_listing', {
            crop: session.data.sellCrop,
            quantity: session.data.sellQuantity,
            price: session.data.sellPrice
          });
        } else {
          responseMessage = `${t(lang, 'invalid_option')}\n${t(lang, 'sell_enter_price')}`;
        }
      }
      break;

    case 'SELL_CONFIRM_LISTING':
      if (input === '1') { // Confirm
        // Here you would save the listing to your database
        session.stage = 'SELL_COMPLETE';
        responseMessage = t(lang, 'sell_listing_successful', {
          quantity: session.data.sellQuantity,
          crop: session.data.sellCrop
        });
      } else { // Cancel or invalid
        session.stage = 'SELL_COMPLETE';
        responseMessage = t(lang, 'sell_listing_cancelled');
      }
      break;

    case 'SELL_COMPLETE':
      // Any input here takes them back to the main menu
      session.stage = 'MAIN_MENU';
      responseMessage = t(lang, 'main_menu');
      break;

    default:
      responseType = 'END';
      responseMessage = t(lang, 'generic_error');
      session.stage = 'WELCOME'; // Reset to start
      break;
  }

  return {
    session: session,
    type: responseType,
    message: responseMessage,
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`USSD webhook server listening on port ${PORT}`);
});
