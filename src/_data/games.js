const fs = require('fs')
const fetch = require('node-fetch')
const BGG_USERNAME = "nolasia"
const BASE_URL = 'https://bgg-json.azurewebsites.net/'
const CACHE_FILE_PATH = '_cache/games.json'

async function fetchGames() {
  const url = `${BASE_URL}collection/${BGG_USERNAME}`
  const response = await fetch(url)

  if (response.ok) {
    const games = await response.json()
    console.log(`>>> ${games.length} games fetched from ${url}`)
    console.log(games[0]);
    return games
  }

  return null
}

async function fetchGame(id) {
  const url = `${BASE_URL}thing/${id}`
  const response = await fetch(url)

  if (response.ok) {
    const game = await response.json()
    console.log(`>>> ${game.name} data fetched from ${url}`)
    console.log();
    return game
  }

  return null
}

// Determine best number of players based on "playerPollResults": [
function recommendedNumPlayers(playerPollResults) {
  const sortedResults = playerPollResults.sort((a, b) => {
    if (a["best"] > b["best"]) {
      return -1;
    }
    if (a["best"] < b["best"]) {
      return 1;
    }
    // a must be equal to b
    return 0;
  })

  return sortedResults[0]["numPlayers"]
}

function hasValidPollResults(playerPollResults) {
  if (playerPollResults.length <= 0) {
    return false
  }

  // If all the values are zero, then in actuality there is no data
  const first = playerPollResults[0]
  const invalid = first.best == 0 && first.recommended == 0 && first.notRecommended == 0
  return !invalid
}

// Store expansions inside main games
async function mungeGames(games) {
  const baseGames = games.filter(game => !game.isExpansion)
  const myExpansionIds = games.filter(game => game.isExpansion).map(game => game.gameId)

  const detailedGames = await Promise.all(baseGames.map(async (game) => {
    return await fetchGame(game.gameId)
  }))

  return detailedGames.map(game => {
    const { expansions, playerPollResults, ...rest } = game
    let modifiedGame = { ...rest }

    if (expansions) {
      const detailedExpansions = expansions.filter(game => {
        return myExpansionIds.includes(game.gameId)
      })
      if (detailedExpansions.length > 0) {
        modifiedGame.expansions = detailedExpansions
      }
    }

    if (hasValidPollResults(playerPollResults)) {
      modifiedGame.bestNumPlayers = recommendedNumPlayers(game.playerPollResults)
    }

    return modifiedGame
  })
}

// Save games to a data file
function writeToFile(data) {
  const dir = '_cache'
  // create cache folder if it doesnt exist already
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const fileContent = JSON.stringify(data, null, 2)

  // write data to cache json file
  fs.writeFile(CACHE_FILE_PATH, fileContent, err => {
    if (err) throw err
    console.log(`>>> games saved to ${CACHE_FILE_PATH}`)
  })
}

// get cache contents from json file
function readFromCache() {
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const cacheFile = fs.readFileSync(CACHE_FILE_PATH)
    return JSON.parse(cacheFile)
  }

  // no cache found.
  return []
}

module.exports = async function () {
  const cache = readFromCache()

  // Only fetch games in production
  if (process.env.NODE_ENV === 'production') {
    console.log('>>> Checking for games...');
    const games = await fetchGames()

    if (games) {
      const mungedGames = await mungeGames(games)

      writeToFile(mungedGames)
      return mungedGames
    }
  }

  return cache
}
