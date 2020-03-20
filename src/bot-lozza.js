const lichess = require('./backends/lichess')({
  token: process.env.TOKEN
});

const engine = require(`./engines/lozza/main`)();

const botServer = require('./lib/server')( {
  backend: lichess,
  engine: engine
});

botServer.start();
