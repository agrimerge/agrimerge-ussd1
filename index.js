const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Dummy data
let users = [];
let crops = [
    { id: 1, name: 'Maize', price: 200, quantity: 100, farmer: 'John' },
    { id: 2, name: 'Beans', price: 300, quantity: 50, farmer: 'Mary' },
    { id: 3, name: 'Tomatoes', price: 150, quantity: 200, farmer: 'Paul' }
];
let orders = [];

// Helper Functions
const findUser = (phoneNumber) => users.find(u => u.phoneNumber === phoneNumber);
const listCrops = () => crops.map(c => `${c.id}. ${c.name} - ${c.price} RWF (${c.quantity}kg)`).join('\n');

// USSD Handler
app.post('/ussd', (req, res) => {
    let { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Split the text input by '*'
    let textValue = text.split('*');
    let user = findUser(phoneNumber);

    // Root menu
    if (text === '') {
        let response = `CON Welcome to Agrimerge\n1. Register\n2. Marketplace\n3. My Crops\n4. Orders\n5. Weather & Tips\n6. Support`;
        res.send(response);
        return;
    }

    switch (textValue[0]) {
        case '1': // Register
            if (!user) {
                let response = `CON Enter your name:`;
                if (textValue.length === 2) {
                    users.push({ phoneNumber, name: textValue[1], crops: [], orders: [] });
                    response = `END Registration successful! Welcome, ${textValue[1]}`;
                }
                res.send(response);
            } else {
                res.send('END You are already registered.');
            }
            break;

        case '2': // Marketplace
            if (!user) {
                res.send('END Please register first.');
                break;
            }
            if (textValue.length === 1) {
                let response = `CON Marketplace:\n1. View Crops\n2. Buy Crop`;
                res.send(response);
            } else if (textValue[1] === '1') {
                let response = `END Available Crops:\n${listCrops()}`;
                res.send(response);
            } else if (textValue[1] === '2') {
                if (textValue.length === 2) {
                    let response = `CON Enter Crop ID to buy:`;
                    res.send(response);
                } else if (textValue.length === 3) {
                    let crop = crops.find(c => c.id == textValue[2]);
                    if (!crop) {
                        res.send('END Invalid Crop ID.');
                        break;
                    }
                    orders.push({ buyer: phoneNumber, cropId: crop.id, quantity: 1, status: 'Pending' });
                    res.send(`END Order placed for 1kg of ${crop.name} at ${crop.price} RWF`);
                }
            }
            break;

        case '3': // My Crops
            if (!user) {
                res.send('END Please register first.');
                break;
            }
            if (textValue.length === 1) {
                let response = `CON My Crops:\n1. Add Crop\n2. View My Crops`;
                res.send(response);
            } else if (textValue[1] === '1') {
                if (textValue.length === 2) {
                    res.send('CON Enter crop name:');
                } else if (textValue.length === 3) {
                    res.send('CON Enter price per kg:');
                } else if (textValue.length === 4) {
                    res.send('CON Enter quantity (kg):');
                } else if (textValue.length === 5) {
                    crops.push({ id: crops.length + 1, name: textValue[2], price: parseInt(textValue[3]), quantity: parseInt(textValue[4]), farmer: user.name });
                    res.send(`END Crop ${textValue[2]} added successfully!`);
                }
            } else if (textValue[1] === '2') {
                let myCrops = crops.filter(c => c.farmer === user.name);
                let response = `END My Crops:\n${myCrops.map(c => `${c.name} - ${c.price} RWF (${c.quantity}kg)`).join('\n')}`;
                res.send(response);
            }
            break;

        case '4': // Orders
            if (!user) {
                res.send('END Please register first.');
                break;
            }
            let myOrders = orders.filter(o => o.buyer === phoneNumber);
            if (myOrders.length === 0) {
                res.send('END No orders yet.');
            } else {
                let response = `END My Orders:\n${myOrders.map(o => {
                    let crop = crops.find(c => c.id === o.cropId);
                    return `${crop.name} - ${crop.price} RWF - ${o.status}`;
                }).join('\n')}`;
                res.send(response);
            }
            break;

        case '5': // Weather & Tips
            res.send(`END Weather: Sunny, 25°C\nTip: Plant maize early in the season for better yield.`);
            break;

        case '6': // Support
            res.send('END Contact Agrimerge support at 078xxxxxxx');
            break;

        default:
            res.send('END Invalid option.');
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Agrimerge USSD running on port ${PORT}`));


