'use strict';

let keys = require('../../config/secrets.js');
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
var util = require('util');

/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
  parse: parse
};

/*
  Functions in a127 controllers used for operations should take two parameters:

  Param 1: a handle to the request object
  Param 2: a handle to the response object
 */
function parse(req, res) {
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}

  let cmdArr = req.swagger.params.textMsg.value.trim().split(';').filter(function(str){
    return str != '';
  }).map(function(str) { return str.trim() });

  let cmdJSON = interpret(cmdArr);
  console.log(`The cmdJSON is ${cmdJSON}`);
  // this sends back a JSON response which is a single string
  res.json(cmdJSON);
}

function interpret(cmdArr) {
  var cmdJSON = {"w": [], "d": [], "b": []};
  cmdArr.forEach(function(cmd) {
    switch (cmd.substring(0,2).toUpperCase()) {
      case 'W-':
        cmdJSON.w.push(cmd.substring(2).trim())
        break;
      case 'D-':
        cmdJSON.d.push(cmd.substring(2).trim())
        break;
      case 'B-':
        cmdJSON.b.push(cmd.substring(2).trim())
        break;
      default:
        console.log('unknown command');
    }
  });

  cmdJSON.b.forEach(function(cmd) {
    bank(cmd);
  });

  console.log(cmdJSON);
  return "";
}

// Bank function queries CapitalOne's Nessie API, returning account information
// associated with a user with a particular account ID which they have set up
// with TextDirect beforehand

function bank(cmd) {
  var bankCmdArr = cmd.trim().split(" ");
  var bankInfo = {};
  switch (bankCmdArr[0]) {
    case 'bal' :
      var accountName = bankCmdArr[bankCmdArr.length - 1];
      console.log(accountName);
      var request = require('request');
      var accountID = '576f0d970733d0184021f516';
      request(`http://api.reimaginebanking.com/accounts/${accountID}?key=${keys.reimagine_banking_key}`, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          bankInfo = JSON.parse(body);
          console.log(`The balance of ${bankInfo.nickname} is $${bankInfo.balance}`);
        }
      });
      break;
    case 'pair' :
      var custID = bankCmdArr[bankCmdArr.length - 1];
      var options = {
        uri: `http://api.reimaginebanking.com/customers/${custID}/accounts?key=${keys.reimagine_banking_key}`,
        method: 'POST',
        json: {
          "type": "TESTER",
          "nickname": "TESTER",
          "rewards": 0,
          "balance": 18.32
        }
      };
      break;

  }
}
