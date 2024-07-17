const express = require('express');
const bodyParser=require('body-parser');

require("dotenv").config();

const tron = require('./src/controllers/tron');
const utils = require('./src/controllers/utils');
const solana = require('./src/controllers/solana');
const chia = require('./src/controllers/chia');





const port = process.env.PORT;
const app = express();
  
app.listen(port, function() {
    console.log("Server is listening at port:" + port);
});

// Parses the text as url encoded data
app.use(bodyParser.urlencoded({extended: true}));
 
// Parses the text as json
app.use(bodyParser.json());

app.use('/tron', tron);
app.use('/utils', utils);
app.use('/solana', solana);
app.use('/chia', chia);


