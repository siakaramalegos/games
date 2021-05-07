function expansionsList(expansions, name) {
  return expansions.map(game => {
    // Remove the prefix with the original game's name
    return game.name.replace(`${name}: `, "")
  }).join(", ")
}

module.exports = {
  truncate: text => text.length > 300 ? `${text.substring(0, 300)}...` : text,
  expansionsList,
}
