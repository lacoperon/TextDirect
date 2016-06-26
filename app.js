'use strict';
//
// var SwaggerExpress = require('swagger-express-mw');
// var app = require('express')();
// module.exports = app; // for testing
//
// var config = {
//   appRoot: __dirname // required config
// };
//
// SwaggerExpress.create(config, function(err, swaggerExpress) {
//   if (err) { throw err; }
//
//   // install middleware
//   swaggerExpress.register(app);
//
//   var port = process.env.PORT || 10010;
//   app.listen(port);
//
//   if (swaggerExpress.runner.swagger.paths['/hello']) {
//     console.log('try this:\ncurl http://127.0.0.1:' + port + '/hello?name=Scott');
//   }
// });

var twilio = require('twilio'),
    http = require('http');
    port = process.env.VCAP_APP_PORT || 10010;

http.createServer(function (req, res) {
    // Create a TwiML response
    console.log(req);
    console.log(res);
    var resp = new twilio.TwimlResponse();
    console.log(resp);

    // The TwiML response object will have functions on it that correspond
    // to TwiML "verbs" and "nouns". This example uses the "Say" verb.
    // Passing in a string argument sets the content of the XML tag.
    // Passing in an object literal sets attributes on the XML tag.
    // resp.say();

    //Render the TwiML document using "toString"
    res.writeHead(200, {
        'Content-Type':'text/xml'
    });
    res.end(resp.toString());

}).listen(port);
