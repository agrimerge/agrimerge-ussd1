// Simplified example
const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const redis = new Redis('redis://default:AUDOAAIncDJiNTljNTUyMGEyZTQ0ZTk5YWI3MzViOWVlMTNiY2FmMHAyMTY1OTA@normal-hen-16590.upstash.io:6379', { tls: {} });

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Required for some gateways that send form data

app.post('/api/ussd/webhook', async (req, res) => {
  try {
    // 1. Extract parameters from the gateway's request
    const { sessionId, phoneNumber, text, serviceCode } = req.body;

    // 2. Retrieve the user's session from Redis, or create a new one
    let session = JSON.parse(await redis.get(`session:${sessionId}`) || 'null');
    if (!session) {
      session = { phone: phoneNumber, stage: 'LANG', data: {} };
    }

    // 3. Parse user input. Gateways send the full string, so we get the last entry.
    const input = text.split('*').pop();

    let responseMessage = '';
    let responseType = 'CON'; // Default to 'CON' to continue the session

    // 4. Main menu logic based on the session stage
    switch (session.stage) {
      case 'LANG':
        // This is the very first screen the user sees
        if (input === '') {
          responseMessage = 'Welcome to AGRIMERGE\n1. Kinyarwanda\n2. English\n3. Français';
        } else {
          // User has selected a language
          if (input === '1') session.data.lang = 'rw';
          if (input === '2') session.data.lang = 'en';
          if (input === '3') session.data.lang = 'fr';
          session.stage = 'MAIN_MENU';
          // Fall through to the main menu stage immediately
          responseMessage = 'Main Menu\n1. Sell produce\n2. Buy produce\n3. Market prices\n4. Wallet & Payments\n5. Advice & Tips\n6. My orders\n7. Agent / Market Center\n8. Support\n9. Settings\n0. Exit';
        }
        break;

      case 'MAIN_MENU':
        switch (input) {
          case '1': // Sell produce
            session.stage = 'SELL_CROP';
            responseMessage = 'Select crop:\n1. Maize\n2. Beans\n3. Irish Potatoes';
            break;
          case '2': // Buy produce
            session.stage = 'BUY_CROP';
            responseMessage = 'What crop do you want to buy?\n1. Maize\n2. Beans\n3. Irish Potatoes';
            break;
          case '3': // Market prices
            session.stage = 'PRICES_CROP';
            responseMessage = 'Select crop for market prices:\n1. Maize\n2. Beans\n3. Irish Potatoes';
            break;
          case '4': // Wallet & Payments
            session.stage = 'WALLET_MENU';
            responseMessage = 'Wallet & Payments:\n1. Check balance\n2. Top-up (mobile money)\n3. Withdraw (agent)';
            break;
          case '5': // Advice & Tips
            session.stage = 'ADVICE_MENU';
            responseMessage = 'Advice & Tips:\n1. Ask a question\n2. Get a random tip';
            break;
          case '6': // My orders
            session.stage = 'ORDERS_MENU';
            responseMessage = 'My Orders:\n1. View recent orders';
            break;
          case '7': // Agent / Market Center
            session.stage = 'AGENT_LOGIN';
            responseMessage = 'Agent Login: Enter your Agent PIN:';
            break;
          case '8': // Support
            session.stage = 'SUPPORT_MENU';
            responseMessage = 'Support:\n1. Report an issue\n2. Request a callback\n3. FAQs';
            break;
          case '9': // Settings
            session.stage = 'SETTINGS_MENU';
            responseMessage = 'Settings:\n1. Change Language\n2. View Profile';
            break;
          case '0': // Exit
            responseType = 'END';
            responseMessage = 'Thank you for using AGRIMERGE.';
            break;
          default:
            responseMessage = 'Invalid option.\nMain Menu\n1. Sell produce\n2. Buy produce\n3. Market prices\n4. Wallet & Payments\n5. Advice & Tips\n6. My orders\n7. Agent / Market Center\n8. Support\n9. Settings\n0. Exit';
            break;
        }
        break;

      case 'SELL_CROP':
        // In a real app, you'd look up the crop from the DB based on the input
        const crops = { '1': 'Maize', '2': 'Beans', '3': 'Irish Potatoes' };
        if (crops[input]) {
          session.data.sell_crop = crops[input];
          session.stage = 'SELL_QUANTITY';
          responseMessage = 'Enter quantity (in kg):';
        } else {
          responseMessage = 'Invalid crop selection. Please try again.\n1. Maize\n2. Beans\n3. Irish Potatoes';
        }
        break;

      case 'SELL_QUANTITY':
        // Basic validation to ensure it's a number
        if (!isNaN(input) && Number(input) > 0) {
          session.data.sell_quantity = Number(input);
          session.stage = 'SELL_PRICE';
          responseMessage = 'Enter unit price (RWF per kg):';
        } else {
          responseMessage = 'Invalid quantity. Please enter a valid number (e.g., 50).';
        }
        break;

      case 'SELL_PRICE':
        if (!isNaN(input) && Number(input) > 0) {
          session.data.sell_price = Number(input);
          session.stage = 'SELL_AVAILABILITY';
          responseMessage = 'Select availability:\n1. Today\n2. Within 3 days';
        } else {
          responseMessage = 'Invalid price. Please enter a valid number (e.g., 250).';
        }
        break;

      case 'SELL_AVAILABILITY':
        const availability = { '1': 'Today', '2': 'Within 3 days' };
        if (availability[input]) {
          session.data.sell_availability = availability[input];
          session.stage = 'SELL_CONFIRM';
          // Prepare confirmation message
          const { sell_crop, sell_quantity, sell_price } = session.data;
          responseMessage = `Confirm Listing:\nCrop: ${sell_crop}\nQty: ${sell_quantity} kg\nPrice: ${sell_price} RWF/kg\n\n1. Confirm\n2. Cancel`;
        } else {
          responseMessage = 'Invalid selection. Please try again.\n1. Today\n2. Within 3 days';
        }
        break;

      case 'SELL_CONFIRM':
        if (input === '1') {
          // TODO: Save the listing to the database here
          // For now, we just confirm to the user
          responseType = 'END';
          responseMessage = `Your listing for ${session.data.sell_quantity}kg of ${session.data.sell_crop} has been posted. Listing ID: MOCK123.`;
          // Clear session data after successful listing
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else if (input === '2') {
          responseType = 'END';
          responseMessage = 'Listing cancelled. Thank you.';
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else {
          // Invalid input, ask for confirmation again
          const { sell_crop, sell_quantity, sell_price } = session.data;
          responseMessage = `Invalid option. Please confirm.\nCrop: ${sell_crop}\nQty: ${sell_quantity} kg\nPrice: ${sell_price} RWF/kg\n\n1. Confirm\n2. Cancel`;
        }
        break;

      case 'BUY_CROP':
        const buy_crops = { '1': 'Maize', '2': 'Beans', '3': 'Irish Potatoes' };
        if (buy_crops[input]) {
          session.data.buy_crop = buy_crops[input];
          session.stage = 'BUY_LIST_OFFERS';
          const mockOffers = `Offers for ${session.data.buy_crop}:\n1. ID: M1, 250 RWF/kg\n2. ID: M2, 255 RWF/kg\n3. ID: M3, 260 RWF/kg\nEnter Offer Number:`;
          responseMessage = mockOffers;
        } else {
          responseMessage = 'Invalid crop selection. Please try again.\n1. Maize\n2. Beans\n3. Irish Potatoes';
        }
        break;

      case 'BUY_LIST_OFFERS':
        // Mocked offer details
        const offers = { '1': { id: 'M1', price: 250 }, '2': { id: 'M2', price: 255 }, '3': { id: 'M3', price: 260 } };
        if (offers[input]) {
          session.data.buy_offer = offers[input];
          session.stage = 'BUY_QUANTITY';
          responseMessage = `You selected offer ${offers[input].id}.\nEnter quantity to buy (in kg):`;
        } else {
          responseMessage = 'Invalid offer selection. Please try again.';
        }
        break;

      case 'BUY_QUANTITY':
        if (!isNaN(input) && Number(input) > 0) {
          session.data.buy_quantity = Number(input);
          session.stage = 'BUY_CONFIRM_ORDER';
          const { buy_offer, buy_quantity } = session.data;
          const totalPrice = buy_offer.price * buy_quantity;
          session.data.buy_total_price = totalPrice;
          responseMessage = `Confirm Order:\n${buy_quantity}kg of ${session.data.buy_crop} for ${totalPrice} RWF.\n\n1. Confirm\n2. Cancel`;
        } else {
          responseMessage = 'Invalid quantity. Please enter a valid number.';
        }
        break;

      case 'BUY_CONFIRM_ORDER':
        if (input === '1') {
          session.stage = 'BUY_PAYMENT_CHOICE';
          responseMessage = 'Choose payment method:\n1. Pay with Wallet\n2. Pay with Mobile Money';
        } else if (input === '2') {
          responseType = 'END';
          responseMessage = 'Order cancelled.';
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else {
          responseMessage = 'Invalid option. Please confirm or cancel.';
        }
        break;

      case 'BUY_PAYMENT_CHOICE':
        if (input === '1') {
          // Mocked mobile money flow
          responseType = 'END';
          responseMessage = 'A mobile money payment prompt will be sent to your phone to complete the payment. Order ID: MOCKORD456';
          // TODO: Initiate payment via gateway API
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else if (input === '2') {
          responseType = 'END';
          responseMessage = 'Order placed successfully. Please pay cash on delivery. Order ID: MOCKORD457';
          // TODO: Save order to DB with \'cash\' payment method
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else {
          responseMessage = 'Invalid payment option. Please try again.';
        }
        break;

      case 'PRICES_CROP':
        const prices_crops = { '1': 'Maize', '2': 'Beans', '3': 'Irish Potatoes' };
        if (prices_crops[input]) {
          session.data.prices_crop = prices_crops[input];
          session.stage = 'PRICES_SUBSCRIBE';
          // Mocked price data
          const medianPrice = 255; // Mocked
          responseMessage = `Median price for ${session.data.prices_crop}: ${medianPrice} RWF/kg.\nTop markets: Kigali, Musanze.\n\nSubscribe to price alerts?\n1. Yes\n2. No`;
        } else {
          responseMessage = 'Invalid crop selection. Please try again.';
        }
        break;

      case 'PRICES_SUBSCRIBE':
        if (input === '1') {
          // TODO: Save subscription to DB
          responseType = 'END';
          responseMessage = `You have been subscribed to price alerts for ${session.data.prices_crop}.`;
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else if (input === '2') {
          responseType = 'END';
          responseMessage = 'You have not been subscribed. Thank you.';
          session.data = {};
          session.stage = 'MAIN_MENU';
        } else {
          responseMessage = 'Invalid option. Please select 1 for Yes or 2 for No.';
        }
        break;

      case 'WALLET_MENU':
        switch (input) {
          case '1': // Check balance
            // Mocked balance
            const balance = 5000; // In a real app, fetch from DB
            responseType = 'END';
            responseMessage = `Your wallet balance is ${balance} RWF.`;
            session.stage = 'MAIN_MENU';
            break;
          case '2': // Top-up
            session.stage = 'WALLET_TOPUP';
            responseMessage = 'Enter amount to top-up (RWF):';
            break;
          case '3': // Withdraw
            session.stage = 'WALLET_WITHDRAW';
            responseMessage = 'Enter amount to withdraw (RWF):';
            break;
          default:
            responseMessage = 'Invalid option. Please try again.';
            break;
        }
        break;

      case 'WALLET_TOPUP':
        if (!isNaN(input) && Number(input) > 0) {
          const topupAmount = Number(input);
          // Mocked mobile money flow
          responseType = 'END';
          responseMessage = `A mobile money prompt for ${topupAmount} RWF will be sent to your phone.`;
          // TODO: Initiate payment from gateway
          session.stage = 'MAIN_MENU';
        } else {
          responseMessage = 'Invalid amount. Please enter a valid number.';
        }
        break;

      case 'WALLET_WITHDRAW':
        if (!isNaN(input) && Number(input) > 0) {
          const withdrawAmount = Number(input);
          // Mocked withdrawal flow
          responseType = 'END';
          responseMessage = `Visit your nearest agent to withdraw ${withdrawAmount} RWF. Your withdrawal code is MOCKWID123.`;
          // TODO: Generate code, save to DB, and await agent confirmation
          session.stage = 'MAIN_MENU';
        } else {
          responseMessage = 'Invalid amount. Please enter a valid number.';
        }
        break;

      case 'ADVICE_MENU':
        switch (input) {
          case '1': // Ask a question
            session.stage = 'ADVICE_QUESTION';
            responseMessage = 'Please type your question:'; // Note: USSD text input is limited
            break;
          case '2': // Get a random tip
            // Mocked tip
            responseType = 'END';
            responseMessage = 'AGRI-TIP: Ensure proper spacing between your maize plants to maximize yield.';
            session.stage = 'MAIN_MENU';
            break;
          default:
            responseMessage = 'Invalid option. Please try again.';
            break;
        }
        break;

      case 'ADVICE_QUESTION':
        // In a real app, you would save this question to a 'tickets' or 'questions' table
        const question = input;
        responseType = 'END';
        responseMessage = 'Thank you for your question. You will receive an SMS with an answer shortly.';
        // TODO: Save question to DB
        session.stage = 'MAIN_MENU';
        break;

      case 'ORDERS_MENU':
        if (input === '1') {
          session.stage = 'ORDERS_VIEW';
          // Mocked order data
          const mockOrders = `Your Orders:\n1. ORD456 (Maize) - Delivered\n2. ORD457 (Beans) - Pending\n\n0. Back`;
          responseMessage = mockOrders;
        } else {
          responseMessage = 'Invalid option.';
        }
        break;

      case 'ORDERS_VIEW':
        if (input === '0') {
          session.stage = 'MAIN_MENU';
          responseMessage = 'Main Menu\n1. Sell produce\n2. Buy produce\n3. Market prices\n4. Wallet & Payments\n5. Advice & Tips\n6. My orders\n7. Agent / Market Center\n8. Support\n9. Settings\n0. Exit';
        } else {
          // In a real app, you could show details for a selected order
          responseType = 'END';
          responseMessage = 'Thank you for checking your orders.';
          session.stage = 'MAIN_MENU';
        }
        break;
        
      case 'SUPPORT_MENU':
        switch (input) {
          case '1': // Report an issue
            session.stage = 'SUPPORT_ISSUE';
            responseMessage = 'Please describe your issue briefly:';
            break;
          case '2': // Request a callback
            session.stage = 'SUPPORT_CALLBACK';
            responseMessage = 'Enter your preferred callback time (e.g., 2pm):';
            break;
          case '3': // FAQs
            responseType = 'END';
            responseMessage = 'FAQs:\nQ: How do I sell?\nA: Go to Main Menu > Sell Produce.\nQ: How do I track my order?\nA: Go to Main Menu > My Orders.';
            session.stage = 'MAIN_MENU';
            break;
          default:
            responseMessage = 'Invalid option. Please try again.';
            break;
        }
        break;

      case 'SUPPORT_ISSUE':
        responseType = 'END';
        responseMessage = 'Thank you for your report. We will look into it.';
        session.stage = 'MAIN_MENU';
        break;

      case 'SUPPORT_CALLBACK':
        responseType = 'END';
        responseMessage = 'Thank you. We will call you back shortly.';
        session.stage = 'MAIN_MENU';
        break;

      case 'SETTINGS_MENU':
        switch (input) {
          case '1': // Change Language
            session.stage = 'SETTINGS_LANGUAGE';
            responseMessage = 'Select new language:\n1. Kinyarwanda\n2. English\n3. Français';
            break;
          case '2': // View Profile
            // Mocked profile data
            const userProfile = { name: 'Jean', district: 'Gasabo' }; // Fetch from DB
            responseType = 'END';
            responseMessage = `Your Profile:\nName: ${userProfile.name}\nDistrict: ${userProfile.district}\nPhone: ${phoneNumber}`;
            session.stage = 'MAIN_MENU';
            break;
          default:
            responseMessage = 'Invalid option. Please try again.';
            break;
        }
        break;

      case 'SETTINGS_LANGUAGE':
        if (input === '1') session.data.lang = 'rw';
        if (input === '2') session.data.lang = 'en';
        if (input === '3') session.data.lang = 'fr';
        // TODO: Save language preference to user profile in DB
        responseType = 'END';
        responseMessage = 'Your language has been updated.';
        session.stage = 'MAIN_MENU';
        break;

      case 'AGENT_LOGIN':
        // In a real app, you would verify the PIN against the user's role and PIN in the DB
        if (input === '1234') { // Mock PIN
          session.stage = 'AGENT_MENU';
          responseMessage = 'Agent Menu:\n1. Confirm Delivery\n2. Release Escrow';
        } else {
          responseType = 'END';
          responseMessage = 'Invalid Agent PIN. Please try again.';
          session.stage = 'MAIN_MENU';
        }
        break;

      case 'AGENT_MENU':
        if (input === '1') {
          session.stage = 'AGENT_CONFIRM_DELIVERY';
          responseMessage = 'Enter the Order ID to confirm delivery:';
        } else {
          responseType = 'END';
          responseMessage = 'This service is not yet available.';
          session.stage = 'MAIN_MENU';
        }
        break;

      case 'AGENT_CONFIRM_DELIVERY':
        const orderId = input;
        // TODO: Update order deliveryStatus to 'delivered' in DB
        // TODO: Trigger escrow release
        responseType = 'END';
        responseMessage = `Delivery for order ${orderId} has been confirmed. Escrow will be released to the seller.`;
        session.stage = 'MAIN_MENU';
        break;

      default:
        responseType = 'END';
        responseMessage = 'An error occurred. Please try again.';
        session.stage = 'MAIN_MENU';
        break;
    }

    // 5. Save the updated session to Redis with a 3-minute expiry
    await redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', 180);

    // 6. Send the response back to the USSD gateway
    // Gateways expect a specific format, often plain text.
    // Using a format like `CON message` or `END message`
    res.set('Content-Type', 'text/plain');
    res.send(`${responseType} ${responseMessage}`);

  } catch (error) {
    console.error('Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`USSD webhook server listening on port ${PORT}`);
});