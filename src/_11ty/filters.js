module.exports = {
  truncate: text => text.length > 300 ? `${text.substring(0, 300)}...` : text,
}
