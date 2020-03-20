// Engine from https://github.com/op12no2/lozza
const lozza = require('./lozza.js')();

// TODO: Make this data persistent
let gameSettings = {};

module.exports = function( /*options*/ ) {
  const ENGINE_NAME = 'Lozza-Bot';
  const PARAM_LEVEL = 'level';
  const PARAM_DEBUG = 'debug';
  let backend;

  (function() {})();

  function startEngine(backendServer) {
    backend = backendServer;
  }

  function onChallenge(data) {
    /*
    e.g.
      {"type":"challenge","challenge":{"id":"1HtiC950","status":"created","challenger":{"id":"marquisdegeek","name":"MarquisdeGeek","title":null,"rating":1500,"provisional":true,"online":true,"lag":4},"destUser":{"id":"zx-chess","name":"ZX-Chess","title":"BOT","rating":1500,"provisional":true,"online":true,"lag":4},"variant":{"key":"standard","name":"Standard","short":"Std"},"rated":false,"speed":"correspondence","timeControl":{"type":"unlimited"},"color":"random","perf":{"icon":";","name":"Correspondence"}}}
    */
    backend.acceptChallenge(data.challenge.id);
  }

  function gameStart(data) {
    backend.startGameStream(data.game.id);
    backend.sendMessage(data.game.id, `Let's begin! Type 'help' in the chat at any time`);
  }

  function chatLine(data) {
    /*
    e.g.
      { type: 'chatLine', room: 'player', username: 'MarquisdeGeek', text: 'one' }
      We've added data.gameId ourselves, because lichess doesn't supply it
    */
    if (data.username === ENGINE_NAME) {
      return;
    }
    let tokens = data.text.toLowerCase().split(' ');
    let reply;

    switch (tokens[0]) {
      case 'help':
        switch (tokens[1]) {
          case 'level':
            reply = `This controls my difficultly level. So say 'level 1' for easy, up to 'level 10' for less easy`;
            break;
          default:
            reply = `I support the commands 'hello' and 'level'`;
            break;
        }
        break;
      case 'hello':
        reply = `Hello, ${data.username}`;
        break;
      case 'level':
        let level = parseInt(tokens[1]);
        level = Math.min(10, Math.max(level, 1));
        reply = `Level now set to ${level}`;
        setParameter(data.gameId, PARAM_LEVEL, level);
        break;
      case 'debug':
        setParameter(data.gameId, PARAM_DEBUG, true);
        //nobreak
      default:
        reply = `That's not something I understand, but please yourself! Write 'help' to learn more.`;
        break;
    }

    if (reply) {
      backend.sendMessage(data.gameId, reply);
    }
  }

  function setParameter(gameId, name, value) {
    gameSettings[gameId] = gameSettings[gameId] || {};
    gameSettings[gameId][name] = value;
  }

  function getParameter(gameId, name, defaultValue) {
    gameSettings[gameId] = gameSettings[gameId] || {};
    return gameSettings[gameId][name] || defaultValue;
  }

  function getMove(gameId, color, fen) {
    return new Promise((resolve) => {
      let resolved = false;

      Math.seedrandom();

      lozza.setHandler(function(msg) {
        if (getParameter(gameId, PARAM_DEBUG, false)) {
          backend.sendMessage(gameId, msg);
        }
        let data = msg.split(' ');
        switch (data[0]) {
          case 'bestmove':
            resolved = true;
            resolve(data[1]);
            break;
        }
      });

      let level = getParameter(gameId, PARAM_LEVEL, 3);

      lozza.postMessage(`ucinewgame`);
      lozza.postMessage(`position ${fen}`);
      lozza.postMessage(`go depth ${level}`);
      lozza.postMessage(`quit`); // a nop
    });
  }

  return {
    startEngine,
    onChallenge,
    getMove,
    gameStart,
    chatLine
  }
}