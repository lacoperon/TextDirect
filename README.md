# Twext

**TextDirect** (or Twext) is a cloud-based SMS platform that allows those without internet access to have access to internet-based resources (Google Maps, Capital One Banking, Gmail, Weather, Store Information... the list goes on). 

We utilize our own proprietary command-line syntax, and lex and parse the commands that users type in, allowing the users almost boundless flexibility in their using of our platform. Additionally, we allow for recursive user macros to be defined, so a user can get access to the information they most commonly need, through a much shorter SMS than otherwise would be necessary.

### Tech

Twext uses a number of projects, platforms and APIs to work properly:

* [**node.js**] - evented I/O for the backend
* [**Express**] - fast node.js network app framework [@tjholowaychuk]
* [**Swagger**] - quick, and definitionally accurate API documentation generation, in real time as the API changes.
* [**Gmail**] - Email API
* [**Google Maps**] - duh
* [**CapitalOne's Nessie**] - API Access to Bank Accounts
* [**Microsoft's Azure**] - Platform on which we deployed our application. We used the in-built MS SQL support, to allow us to store relevant user and account data.
* [**Regex**] - Command Parsing

And of course Dillinger itself is open source with a [public repository][dill]
 on GitHub.

### Installation

Twext requires [Node.js](https://nodejs.org/) v4+ to run. All of the other package dependencies are contained in the relevant json file. A simple *npm install* command should be enough to install all of your package dependencies for the server to be runnable. From that point, just type in *swagger project --start*.
