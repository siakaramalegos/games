const fs = require('fs')
const fetch = require('node-fetch')
const puppeteer = require('puppeteer');
const BGG_USERNAME = "nolasia"
const BASE_URL = 'https://bgg-json.azurewebsites.net/'

async function fetchGames() {
  const url = `${BASE_URL}collection/${BGG_USERNAME}`
  const response = await fetch(url)

  if (response.ok) {
    const games = await response.json()

    console.log(`>>> ${games.length} games fetched from ${url}`)
    return games
  }

  return null
}

async function fetchGame(game) {
  const { gameId, complexityRating } = game
  const url = `${BASE_URL}thing/${gameId}`
  const response = await fetch(url)

  if (response.ok) {
    const data = await response.json()
    data.complexityRating = complexityRating

    if (hasValidPollResults(data.playerPollResults)) {
      data.bestNumPlayers = recommendedNumPlayers(data.playerPollResults)
    }

    console.log(`>>>> ${data.name} data fetched from ${url}`)
    return data
  }

  console.error({gameId, status: response.status});
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

function getRating(complexities, id) {
  const item = complexities.find(game => game.gameId === id)
  return item ? item.complexity : "Unavailable"
}

// Store expansions inside main games
async function mungeGames(cachedGames, currentBasicGames, addedIds, deletedIds, complexities) {
  // Remove deleted games
  const updatedCache = cachedGames.filter(game => !deletedIds.has(game.gameId))
  // Add complexity ratings
  const currentBasicGamesWithComplexities = currentBasicGames.map(game => {
    return {
      ...game,
      complexityRating: getRating(complexities, game.gameId)
    }
  })
  const addedBaseGames = currentBasicGamesWithComplexities.filter(game => !game.isExpansion && addedIds.has(game.gameId))
  console.log(`Adding ${addedBaseGames.length} base games...`);
  const addedDetailedBaseGames = await getDetailedGames(addedBaseGames)
  // Merge base games, and filter out any games with bad responses
  const newDetailedBaseGames = [
    ...updatedCache.map(game => {
      return {
        ...game,
        complexityRating: getRating(complexities, game.gameId)
      }
    }),
    ...addedDetailedBaseGames.filter(game => !!game),
  ]

  // No need to check for added since we already get all the data available when requesting the collection in currentBasicGamesWithComplexities
  const myExpansionIds = currentBasicGamesWithComplexities.filter(game => game.isExpansion).map(game => game.gameId)

  const mungedWithExpansions =  newDetailedBaseGames.map(game => {
    const { expansions, playerPollResults, ...rest } = game
    let modifiedGame = { ...rest, expansions }

    if (expansions) {
      const myBasicExpansions = expansions.filter(game => {
        return myExpansionIds.includes(game.gameId)
      })
      if (myBasicExpansions.length > 0) {
        modifiedGame.myExpansions = myBasicExpansions.map(expansion => {
          return currentBasicGamesWithComplexities.find(element => element.gameId === expansion.gameId)
        })
      }
    }

    return modifiedGame
  })

  // Sort from highest complexity to lowest
  return mungedWithExpansions.sort((a, b) => {
    if (a["complexityRating"] > b["complexityRating"]) {
      return -1;
    }
    if (a["complexityRating"] < b["complexityRating"]) {
      return 1;
    }
    // a must be equal to b
    return 0;
  })
}

// Save data to a file
function writeToFile(filePath, data) {
  const dir = '_cache'
  // create cache folder if it doesnt exist already
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const fileContent = JSON.stringify(data, null, 2)

  // write data to cache json file
  fs.writeFile(filePath, fileContent, err => {
    if (err) throw err
    console.log(`>>> games saved to ${filePath}`)
  })
}

// get cache contents from json file
function readFromCache(filePath) {
  if (fs.existsSync(filePath)) {
    const cacheFile = fs.readFileSync(filePath)
    return JSON.parse(cacheFile)
  }

  // no cache found.
  return []
}

function checkDifferences(cached, current) {
  const currentIds = new Set(current.map(game => game.gameId))

  if (cached.length === 0) {
    return {
      addedIds: currentIds,
      deletedIds: [],
    }
  }

  const cachedIds = new Set(cached.map(game => game.gameId))
  const addedIds = new Set([...currentIds].filter(x => !cachedIds.has(x)));
  const deletedIds = new Set([...cachedIds].filter(x => !currentIds.has(x)));

  return {
    addedIds,
    deletedIds,
  }
}

async function getDetailedGames(games) {
  return await Promise.all(games.map(async (game) => {
    return await fetchGame(game)
  }))
}

async function scrapeForRatings(addedIds) {
  const IGNORED_ASSETS = ["font", "image", "style"]
  console.log(">>> Beginning to scrape for complexity ratings");
  console.log({addedIds});

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
  });

  const complexities = await Promise.all(addedIds.map(async (id) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (IGNORED_ASSETS.includes(req.resourceType())){
        req.abort();
      }
      else {
        req.continue();
      }
    });
    await page.goto(`https://boardgamegeek.com/boardgame/${id}`);
    // Wait for the target node to render
    await page.waitForSelector("[item-poll-button=boardgameweight] span")
    const complexity = await page.evaluate(() => {
      return document.querySelector("[item-poll-button=boardgameweight] span").innerText
    })
    console.log(`>>> ${id} scraped complexity is ${complexity}`)
    return {
      gameId: id,
      complexity,
    }
  }))
  await browser.close()

  console.log({complexities});
  return complexities
}

async function getComplexities(cachedComplexities, currentBasicGames) {
  // Don't care about deleted ones
  const differences = checkDifferences(cachedComplexities, currentBasicGames)
  const addedIds = Array.from(differences.addedIds)

  if (addedIds.length === 0) {
    return cachedComplexities
  }

  const LIMIT = 10
  const addedRatings = await scrapeForRatings(addedIds.slice(0, LIMIT))
  return [
    ...cachedComplexities,
    ...addedRatings,
  ]
}


module.exports = async function () {
  const cachedGames = readFromCache("_cache/games.json")
  // Use cached games
  if (process.env.NODE_ENV !== 'production') {
    return cachedGames
  }

  // Only fetch games in production
  console.log('>>> Checking for games...');
  const currentBasicGames = await fetchGames()

  if (!currentBasicGames) {
    console.log("No games found.");
    return cachedGames
  }

  // Read complexity ratings and fetch any unscraped ones
  const cachedComplexities = readFromCache("_cache/complexities.json")
  const newComplexities = await getComplexities(cachedComplexities, currentBasicGames)
  writeToFile("_cache/complexities.json", newComplexities)

  // Can ignore expansions since no additional requests will be needed to populate them
  const {addedIds, deletedIds} = checkDifferences(cachedGames, currentBasicGames.filter(game => !game.isExpansion))
  console.log({addedIds, deletedIds});

  const mungedGames = await mungeGames(cachedGames, currentBasicGames, addedIds, deletedIds, newComplexities)
  writeToFile("_cache/games.json", mungedGames)

  console.log("Done!");

  return mungedGames
}
