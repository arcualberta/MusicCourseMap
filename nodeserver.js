var express = require('express');
var app = express();

app.use(express.static(__dirname));

app.listen(process.env.PORT || 8281);

console.log('To test your module use the address http://127.0.0.1:8281/');