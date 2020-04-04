const fetch = require('node-fetch');
const oboe = require("oboe");


module.exports = function(options) {
  let token;
  let urlStub;
  let headersGet;
  let headersPost;
  let handlers;

  (function() {
    options = options || {};
    handlers = options.handlers || {};
    urlStub = options.url || 'https://lichess.org/api';
    token = options.token || '';
    //
    headersGet = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    //
    headersPost = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
  })();

  function start(options) {
    options = options || {};
    handlers = Object.assign(handlers, options.handlers);

    // https://lichess.org/api#operation/apiStreamEvent
    startStreamListener('stream/event');
  }

  function startGameStream(gameId) {
    // https://lichess.org/api#operation/apiStreamEvent
    startStreamListener(`bot/game/stream/${gameId}`, gameId);
  }

  function startStreamListener(endpoint, gameId) {
    console.log(`Starting stream at ${endpoint}`);
    oboe({
        method: "GET",
        url: `${urlStub}/${endpoint}`,
        headers: headersGet
      })
      .node("!", function(data) {
        console.log("STREAM data : " + JSON.stringify(data.type));

        if (handlers[data.type]) {
          let munged = {
            gameId: gameId
          };
          munged = Object.assign(munged, data);
          handlers[data.type](munged);
        }

      })
      .fail(function(errorReport) {
        console.error(`Failure to get ${endpoint}:`);
        console.error(JSON.stringify(errorReport));
        // Retry
        setTimeout(function() {
          startStreamListener(endpoint, gameId);
        }, 10000);
      });
  }

  function fetchGet(endpoint, params) {
    return new Promise((resolve, reject) => {
      fetch(`${urlStub}/${endpoint}`, {
          method: 'get',
          headers: headersGet
        })
        .then(res => res.json())
        .then(json => {
          resolve(json);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  function fetchPost(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      fetch(`${urlStub}/${endpoint}`, {
          method: 'post',
          headers: headersPost,
          body: JSON.stringify(params.body || {})
        })
        .then(res => res.json())
        .then(json => {
          resolve(json);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  //
  // External API
  //
  function getGameList() {
    return fetchGet(`account/playing`);
  }

  function acceptChallenge(challengeId) {
    return fetchPost(`challenge/${challengeId}/accept`);
  }

  function rejectChallenge(challengeId) {
    return fetchPost(`challenge/${challengeId}/decline`);
  }

  function sendMove(gameId, move) {
    return fetchPost(`bot/game/${gameId}/move/${move}`);
  }

  function sendMessage(gameId, msg) {
    return fetchPost(`bot/game/${gameId}/chat`, {
      body: {
        room: 'player',
        text: msg
      }
    });
  }

  function sendResign(gameId) {
    return fetchPost(`bot/game/${gameId}/resign`);
  }

  return {
    start,
    acceptChallenge,
    rejectChallenge,
    startGameStream,
    getGameList,
    sendMove,
    sendMessage,
    sendResign
  }
}