// Dependencies
const http = require('http');
const https = require('https');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');

const config = require('./config');

// Instantiate the HTTP server
const httpServer = http.createServer(function (req, res) {
  unifiedServer(req, res);
});

// Start HTTP server, and have it listen on port
httpServer.listen(config.httpPort, function () {
  console.log(`Server is listening on port ${config.httpPort}`);
});

// Instantiate the HTTPS server
const httpsServerOpts = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};

const httpsServer = https.createServer(httpsServerOpts, function (req, res) {
  unifiedServer(req, res);
});

// Start HTTPS server, and have it listen on port
httpsServer.listen(config.httpsPort, function () {
  console.log(`Server is listening on port ${config.httpsPort}`);
});

// All the server logic for both the http and https
const unifiedServer = function (req, res) {
  // Get URL and parse it
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`, {
    parseQueryString: true,
  });

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = {};
  for (const query of parsedUrl.searchParams) {
    queryStringObject[query[0]] = query[1];
  }

  // Get the HTTP Method
  const method = req.method.toLocaleLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', function () {
    buffer += decoder.end();

    /* Choose the handler this request should go to.
    If one is not found, use the notFound handler */
    const chosenHandler =
      typeof router[trimmedPath] !== 'undefined'
        ? router[trimmedPath]
        : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer,
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, function (statusCode, payload) {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof statusCode == 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to an empty object
      payload = typeof payload == 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log(`Returning this response: ${statusCode} ${payloadString}`);
    });
  });
};

// Define the handlers
let handlers = {};

// Ping handler
handlers.ping = function (data, callback) {
  callback(200);
};

// Not found handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Define a request router
let router = {
  ping: handlers.ping,
};
