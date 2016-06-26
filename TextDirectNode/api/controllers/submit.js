'use strict';

const keys = require('../../config/secrets');
const request = require('request');
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
const util = require('util');

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
  //Updates macros to be those referring to this phone number (change to Shirley's phone number)
  getMacrosSQL(9173400996);
  // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  const cmdArr = req.swagger.params.textMsg.value.trim().split(';').filter(function(str){
    return str != '';
  }).map(function(str) { return str.trim() });

  let cmdJSON = interpret(cmdArr);
  // console.log(`The cmdJSON is ${cmdJSON}`);
  // this sends back a JSON response which is a single string
  res.json(cmdJSON);
  //twilio("something");
}

let home; // Replace global variable with database of users.
let shortcuts = {};

function interpret(cmdArr, fromText = true) {
  const shortcutKeys = shortcuts.keys;

  if (fromText && shortcutKeys) {
    shortcutKeys.find(function(shortcut) {
      cmdArr.forEach(function(cmd) {
        if (cmd.startsWith(shortcut)) {
          cmd.replace(shortcut, shortcuts.shortcut);
        }
      });
    });

    return interpret(cmdArr, false);
  }

  let cmdJSON = {w: [], d: [], b: []};

  cmdArr.forEach(function(cmd) {
    switch (cmd.substring(0,2).toUpperCase()) {
      case 'W-':
        cmdJSON.w.push(cmd.substring(2).trim());
        break;
      case 'N-':
        cmdJSON.d.push(cmd.substring(2).trim());
        break;
      case 'H-': // H- prefix sets home/default address
        home = cmd.substring(2).trim();
        break;
      case 'B-':
        cmdJSON.b.push(cmd.substring(2).trim())
        break;
      case '@=':
        const shortcut = cmd.substring(2).trim().split(/-?/);
        shortcuts[`@${shortcut[0]}`] = shortcut[1];
      case 'T-':
        cmdJSON.t.push(cmd.substring(2).trim());
        break;
      case 'C-':
        cmdJSON.c.push(cmd.substring(2).trim());
        break;
      default:
        console.log('unknown command');
    }
  });


  cmdJSON.d.forEach(function(cmd) { getDirections(cmd) });

  cmdJSON.w.forEach(function(cmd) { getWeatherForecast(cmd )});

  cmdJSON.b.forEach(function(cmd) {
    bank(cmd);
  });

  // console.log(cmdJSON);
  return "";
}

//Twilio API integration
function twilio(messageSent) {
  var accountSid = keys.twilio_account_sid;
  var authToken = keys.twilio_auth_token;

//require the Twilio module and create a REST client
  var client = require('twilio')(accountSid, authToken);

  client.messages.create({
      to: "7813331368",
      from: "+16174407778",
      body: messageSent,
  }, function(err, message) {
      console.log(message.sid);
  });
}

// Direction commands get turn-by-turn directions from Google Maps API;
// "o-" prefix optionally specifies origin address (home address by default)
// "d-" prefix optionally specifies destination address (by default, the command minus any beginning address strings)
function getDirections(cmd) {
  const matchedOrigin = cmd.match(/o-((?!d-).)*/im);

  if (matchedOrigin) {
    var origin = matchedOrigin[0].substring(2);
    var matchedDestination = cmd.match(/d-((?!o-).)*/im);
    var destination = matchedDestination ? matchedDestination[0].substring(2) : cmd.replace(origin, '');
  } else {
    var origin = home;
    var matchedDestination = cmd.match(/d-((?!o-).)*/im);
    var destination = matchedDestination ? matchedDestination[0].substring(2) : cmd;
  }

  request(
    `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&avoid=tolls&key=${keys.google_maps_key}`,
    function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const route = JSON.parse(body).routes[0].legs[0];
        const destination = route.end_address;
        let directions = `${route.distance.text} (${route.duration.text}) from ${route.start_address} to ${destination}\n`;
        directions = route.steps.map(function(step) {
          return `In ${step.distance.text}: ${step.html_instructions.replace(/<\/?(b|div((?!>).)*)>/g, '')}`;
        }).join('\n');
        directions += `\nDestination: ${destination}`;
        twilio(directions);
      }
    }
  );
}

function getTowLocation(cmd) {
  

}

// Bank function queries CapitalOne's Nessie API, returning account information
// associated with a user with a particular account ID which they have set up
// with TextDirect beforehand.

//Also can pair accounts with the Twext service

function bank(cmd) {
  var bankCmdArr = cmd.trim().split(" ");
  var bankInfo = {};
  switch (bankCmdArr[0]) {
    //Example twilio message: b- bal Savings
    case 'bal' :
      var accountName = bankCmdArr[bankCmdArr.length - 1];
      console.log(accountName);
      var request = require('request');
      var accountID = '576f0d970733d0184021f516';
      request(`http://api.reimaginebanking.com/accounts/${accountID}?key=${keys.reimagine_banking_key}`, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          bankInfo = JSON.parse(body);
          twilio(`The balance of ${bankInfo.nickname} is $${bankInfo.balance}`);
        }
      });

      break;
    //Example twilio message: b- pair Savings 576f0d970733d0184021f516
    case 'pair' :
      console.log(bankCmdArr);
      var custID = bankCmdArr[bankCmdArr.length - 1];
      console.log(custID);
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
      //Request pairing doesn't work, isn't important because doesn't actually
      //do anything concrete
      var request = require('request');
      request(options, function (error, response, body) {
        console.log("CapitalOne account paired");
      }).end();
      break;
  }
}

//Weather stuff (Should be in separate file, but fuck it atm)


var http = require('http');
var accuweather_key = keys.accuweather_key;
var week = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var params = {};
function onErr(err) {
  console.log(err);
  return 1;
}
function getLocation(response) {
  var str = '';

  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
  var locationObject = JSON.parse( str );
  params.key = locationObject[0]['Key'];
  var options = {
    host: 'dataservice.accuweather.com',
    path: '/forecasts/v1/' + params['forecast'] + '/' + params['type'][params['forecast']] + '/' + params['key'] + '?apikey='
      + accuweather_key
  };
  http.request(options, getForecast).end();
  });
}

function getForecast(response) {
  var str = '';
  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
  var forecastObject = JSON.parse( str );
  var output = '';
  if (params['forecast'] == 'daily') {
    for (var i in forecastObject['DailyForecasts']) {
      var d = new Date(forecastObject['DailyForecasts'][i]['Date']);
      output += week[d.getDay()] + ': '
        + forecastObject['DailyForecasts'][i]['Day']['IconPhrase'] + '. '
        + 'High: ' + forecastObject['DailyForecasts'][i]['Temperature']['Maximum']['Value'] + ', '
        + 'Low: ' + forecastObject['DailyForecasts'][i]['Temperature']['Minimum']['Value'] + '.\n';
    }
  } else {
    for (var i in forecastObject) {
      var d = new Date(forecastObject[i]['DateTime']);
      output += d.getHours() + ': '
        + forecastObject[i]['Temperature']['Value'] + ' and '
        + forecastObject[i]['IconPhrase'] + ', ' + forecastObject[i]['PrecipitationProbability'] + '% precip.\n';
    }
  }
  twilio(output);
  });
}


function getWeatherForecast(cmd) {
  console.log(cmd);
  var input = cmd.split(' ');
  if (input.length >= 3) {
    params = {
      forecast: input.shift(),
      administrative_area: input.pop(),
      query: input.join('%20'),
      type: {
        'daily':'5day',
        'hourly':'12hour'
      }
    }
    var options = {
      host: 'dataservice.accuweather.com',
      path: '/locations/v1/us/' + params['administrative_area'] + '/search?apikey=' + accuweather_key + '&q='
        + params['query']
    };

    // console.log(options);

    http.request(options, getLocation).end();
  } else {
    onErr(err);
  }

};

// ~~~ SQL FUNCTION TIME ~~~
//Array of macros!
var macroArr = [];
function getMacrosSQL(phoneNumber) {

  var util = require('util');
  var Connection = require('tedious').Connection;
  var Request = require('tedious').Request;
  var TYPES = require('tedious').TYPES;


  //Azure Configuration Settings
  var config = {
    userName: 'BDNFMaker',
    password: 'Hello654',
    server: 'bdnfactorysql.database.windows.net',
    // When you connect to Azure SQL Database, you need these next options.
    options: {encrypt: true, database: 'BDNFactory'}
  };
  //Creates New Connection to Database
  var connection = new Connection(config);
  connection.on('connect', function(err) {
    if (err) return console.error(err);
    console.log("SQLRequest to MacroDB");
    executeStatement();
  });

  //Executes SQL Statement Using Tedious Request
  //(Phone number is not variable, because twilio doesn't allow for multiple
  // Numbers in the trial)
  function executeStatement() {
    var request = new Request(
      `SELECT * from dbo.Macro WHERE Phone = '${phoneNumber}'`, function(err) {
      if (err) {
        console.log(err);
      }
    });
    //Each Row Returned is added to the QueryResult response
    request.on('row', function(columns) {
      var macroAdd = {};
      macroAdd.number = columns[0].value;
      macroAdd.shortcut = columns[1].value;
      macroAdd.commands = columns[2].value;
      // console.log(macroAdd);
      macroArr.push(macroAdd);
      // console.log(`MacroArr: ${macroArr}`)
      console.log(macroArr);
      // console.log(macroAdd);

    });
    //'doneProc' event is fired when the SQL Server is done returning values
    request.on('doneProc', function() {
        return macroArr;
    });
    connection.execSql(request);
  }
}

//Function which adds a macro to the SQL database
// var testMacro = {
//   number: 9173400996,
//   shortcut: '-y',
//   commands: '-b bal savings'
// };
// addMacroSQL(testMacro);

function addMacroSQL(macro) {
  console.log(macro);
  var util = require('util');
  var Connection = require('tedious').Connection;
  var Request = require('tedious').Request;
  var TYPES = require('tedious').TYPES;

  var QueryResult = [];


  //Azure Configuration Settings
  var config = {
    userName: 'BDNFMaker',
    password: 'Hello654',
    server: 'bdnfactorysql.database.windows.net',
    // When you connect to Azure SQL Database, you need these next options.
    options: {encrypt: true, database: 'BDNFactory'}
  };
  //Creates New Connection to Database
  var connection = new Connection(config);
  connection.on('connect', function(err) {
    if (err) return console.error(err);
    console.log("SQLRequest to MacroDB");
    executeStatement();
  });

  //Executes SQL Statement Using Tedious Request
  //(Phone number is not variable, because twilio doesn't allow for multiple
  // Numbers in the trial)
  function executeStatement() {
    var request = new Request(
      `
      INSERT INTO dbo.Macro
      VALUES(${macro.number},'${macro.shortcut}','${macro.commands}');

      `, function(err) {
      if (err) {
        console.log(err);
      }
    });
    connection.execSql(request);
  }
}

~~~ LOCATION SQL TIME ~~~

var locArr = [];


// Function to get all of the saved locations associated with a phone number
function getLocSQL(phoneNumber) {

  var util = require('util');
  var Connection = require('tedious').Connection;
  var Request = require('tedious').Request;
  var TYPES = require('tedious').TYPES;


  //Azure Configuration Settings
  var config = {
    userName: 'BDNFMaker',
    password: 'Hello654',
    server: 'bdnfactorysql.database.windows.net',
    // When you connect to Azure SQL Database, you need these next options.
    options: {encrypt: true, database: 'BDNFactory'}
  };
  //Creates New Connection to Database
  var connection = new Connection(config);
  connection.on('connect', function(err) {
    if (err) return console.error(err);
    console.log("SQLRequest to LocDB");
    executeStatement();
  });

  //Executes SQL Statement Using Tedious Request
  //(Phone number is not variable, because twilio doesn't allow for multiple
  // Numbers in the trial)
  function executeStatement() {
    var request = new Request(
      `SELECT * from dbo.LocData WHERE Number = '${phoneNumber}'`, function(err) {
      if (err) {
        console.log(err);
      }
    });
    //Each Row Returned is added to the QueryResult response
    request.on('row', function(columns) {
      var locAdd = {};
      locAdd.number = columns[0].value;
      locAdd.location = columns[1].value;
      macroArr.push(macroAdd);
      // console.log(`MacroArr: ${macroArr}`)
      // console.log(macroArr);
      // console.log(macroAdd);

    });
    //'doneProc' event is fired when the SQL Server is done returning values
    request.on('doneProc', function() {
        return macroArr;
    });
    connection.execSql(request);
  }
}

//Adds location data to the SQL database
function addLocSQL(locAdd) {
  console.log(macro);
  var util = require('util');
  var Connection = require('tedious').Connection;
  var Request = require('tedious').Request;
  var TYPES = require('tedious').TYPES;

  var QueryResult = [];


  //Azure Configuration Settings
  var config = {
    userName: 'BDNFMaker',
    password: 'Hello654',
    server: 'bdnfactorysql.database.windows.net',
    // When you connect to Azure SQL Database, you need these next options.
    options: {encrypt: true, database: 'BDNFactory'}
  };
  //Creates New Connection to Database
  var connection = new Connection(config);
  connection.on('connect', function(err) {
    if (err) return console.error(err);
    console.log("SQLRequest to MacroDB");
    executeStatement();
  });

  //Executes SQL Statement Using Tedious Request
  //(Phone number is not variable, because twilio doesn't allow for multiple
  // Numbers in the trial)
  function executeStatement() {
    var request = new Request(
      `
      INSERT INTO dbo.LocData
      VALUES(${locAdd.number},'${locAdd.location}'');

      `, function(err) {
      if (err) {
        console.log(err);
      }
    });
    connection.execSql(request);
  }
}
