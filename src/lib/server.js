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
      .catch((err) => {
        setTimeout(pollServer, 1000);
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

  function doGamePlay(game) {
    return new Promise((resolve) => {
      if (game.isMyTurn) {
        console.log(`GAME ${game.gameId} START`);

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
          return backend.sendMove(game.gameId, currentMove);
        })
        .then((res) => {
          if (res.error) {
            // Usually 'piece cannot move' because the engine did something stupid.
            backend.sendMessage(game.gameId, `Sorry - I'm not thinking straight`);
            console.log(`GAME ${game.gameId} BOTERROR ${currentMove}`);
            return getRandomMove(game.gameId, game.color, fen);
          }
          return undefined;
        })
        .then((rndMove) => {
          if (rndMove) { // we trust that the random move is valid
            currentMove = rndMove;
            console.log(`GAME ${game.gameId} BOTRANDOM ${currentMove}`);
            return backend.sendMove(game.gameId, currentMove);
          }
        })
        .then(() => {
          console.log(`GAME ${game.gameId} MOVES ${currentMove} FROM ${fen}`);
          resolve(0); // still playing
        })
        .catch((err) => {
          console.log(`GAME ${game.gameId} BOTERR ${err}`);
          resolve(0);
        });
      } else {
        resolve(1);
      }
    }); //promise
  }

  function doProcessingTick() {
    return new Promise((resolve) => {
      let gamesLeft = 0;
      let gameWaiting = 0;
      let promiseList = [];

      backend.getGameList()
        .then(json => {
          let nowPlaying = json.nowPlaying;
          gamesLeft += nowPlaying.length;

          //console.log(json)
          nowPlaying.forEach((game) => {
            let prom = doGamePlay(game);
            prom
            .then((stillPlaying) => {
              gameWaiting += stillPlaying;
            })
            .catch((err) => {
              console.log(`ERR goGamePlay ${err.message}`);
            });
            promiseList.push(prom);
          });

          // TODO: post this to a 'bots stats page'

          return Promise.all(promiseList);
        })
        .then(() => {
          if (--statsMessageCount < 0) {
            console.log(`INFO Playing: ${gamesLeft}  Waiting for humans: ${gameWaiting}`);
            statsMessageCount = statsMessageCountFrom;
          }
          resolve(gamesLeft)
        })
        .catch((err) => {
          console.log(`ENGINE getGameList failed ${err}`);
          throw new Error(`Could not retrieve games list`);
        });
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
