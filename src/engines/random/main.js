const {
  Chess
} = require('chess.js')

module.exports = function(/*options*/) {
let backend;

  (function() {
  })();

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


  function getMove(gameId, color, fen) {
    return new Promise((resolve) => {
      const game = new Chess(fen);
      const moves = game.moves({
        verbose: true
      });
      const move = moves[Math.floor(Math.random() * moves.length)];

      resolve(`${move.from}${move.to}`);
    });
  }

  return {
    startEngine,
    onChallenge,
    getMove,
  }
}
