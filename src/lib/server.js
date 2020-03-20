const {
  Chess
} = require('chess.js')


module.exports = function(options) {
  let engine;
  let backend;
  let statsMessageCountFrom = 10;
  let statsMessageCount = 1;

  (function() {
    options = options || {};
    backend = options.backend || {};
    engine = options.engine || {};
  })();

  function start() {
    engine.startEngine(backend);

    backend.start({
      handlers: {
        challenge: onChallenge,
        gameStart: gameStart,
        chatLine: chatLine
      }
    });
    pollServer();
  }


  function pollServer() {
    doProcessingTick()
      .then((gamesLeft) => {
        if (gamesLeft) {
          setTimeout(pollServer, 1000 / 20); // No more than 20 API calls per second
        } else {
          setTimeout(pollServer, 10000);
        }
      })
  }

  function onChallenge(data) {
    engine.onChallenge && engine.onChallenge(data);
  }

  function gameStart(data) {
    engine.startGameStream && engine.startGameStream(data);
  }

  function chatLine(data) {
    engine.chatLine && engine.chatLine(data);
  }

  function doProcessingTick() {
    return new Promise((resolve) => {
      let gamesLeft = 0;
      let gameWaiting = 0;
      // TODO: queue all moves, so resolve only starts again once everyone has moved

      backend.getGameList()
        .then(json => {
          let nowPlaying = json.nowPlaying;
          gamesLeft += nowPlaying.length;
          //console.log(json)
          nowPlaying.forEach((game) => {
            if (game.isMyTurn) {
              let fen = game.fen;

              // Lichess (our only current backend) does not provide a full FEN.
              // Therefore, we fake the rest. It means our AI will never play en passant
              // or castling, but that can be implemented by the engines themselves.
              if (game.color === "white") {
                fen += ' w';
              } else {
                fen += ' b';
              }
              fen += ' - - 0 1';

              let currentMove;
              engine.getMove(game.gameId, game.color, fen)
              .then((move) => {
                currentMove = move;
                return backend.sendMove(game.gameId, move);
              })
              .then((res) => {
                if (res.error) {
                  // Usually 'piece cannot move' because the engine did something stupid.
                  backend.sendMessage(game.gameId, `Sorry - I'm not thinking straight`);
                  return getRandomMove(game.gameId, game.color, fen);
                }
              })
              .then((rndMove) => {
                console.log(`PLAY ${game.gameId} MOVES ${currentMove || rndMove} FROM ${fen} ${rndMove?'BOT error':''}`);
              });
            } else {
              ++gameWaiting;
            }
          });

          // TODO: post this to a 'bots stats page'
        })
        .then(() => {
          if (--statsMessageCount < 0) {
            console.log(`INFO Playing: ${gamesLeft}  Waiting for humans: ${gameWaiting}`);
            statsMessageCount = statsMessageCountFrom;
          }
          resolve(gamesLeft)
        })
    });
  }

  function getRandomMove(gameId, color, fen) {
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
    start
  }
}
