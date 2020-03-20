# LichessBots
NodeJS library and samples to play chess on lichess.org

# How to run a bot

Simple clone this git repo, and npm install. You will then have the code necessary to run two basic chess bots: one that plays random moves, and one using the Lozza engine.

```
git clone https://github.com/MarquisdeGeek/LichessBots.git

npm install
```

To interface with Lichess you will need a token so:
  - Create a lichess account
  - Play 0 games (yep - zero, none, nada!)
  - Upgrade your account to a bot account, via 

   https://lichess.org/api#operation/botAccountUpgrade

The acquire an API token, via 

   https://lichess.org/account/oauth/token

Running it on a server is simply a case of running the appropriate script. e.g.

```
TOKEN=abcdefgh node bot-random.js
```
If you're using pm2, it'd be wither:

```
TOKEN=abcdefgh pm2 start bot-random.js --update-env
```
or
```
TOKEN=abcdefgh pm2 restart bot-random.js --update-env
```

# Play the bot in action

https://lichess.org/@/Lozza-Bot

# Links

https://github.com/op12no2/lozza
