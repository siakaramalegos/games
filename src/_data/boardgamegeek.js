const fs = require('fs')
const fetch = require('node-fetch')
const BGG_USERNAME = "nolasia"
const BASE_URL = 'https://bgg-json.azurewebsites.net/collection/'
const API_URL = `${BASE_URL}${BGG_USERNAME}`
const DATA_FILE_PATH = 'src/_data/games.json'

async function fetchGames() {
  const response = await fetch(API_URL)
  if (response.ok) {
    const games = await response.json()
    console.log(`>>> ${games.length} games fetched from ${API_URL}`)
    console.log(games[0]);
    return games
  }

  return null
}

// Save games to a data file
function writeToFile(data) {
  const dir = '_data'
  const fileContent = JSON.stringify(data, null, 2)
  // write data to cache json file
  fs.writeFile(DATA_FILE_PATH, fileContent, err => {
    if (err) throw err
    console.log(`>>> games saved to ${DATA_FILE_PATH}`)
  })
}

module.exports = async function () {
  // Only fetch new mentions in production
  if (process.env.NODE_ENV === 'production') {
    console.log('>>> Checking for games...');
    const games = await fetchGames()
    if (games) {
      writeToFile(games)
      return games
    }
  }
}
