module.exports = function(eleventyConfig) {
  // // Filters
  // Object.keys(filters).forEach(filterName => {
  //   eleventyConfig.addFilter(filterName, filters[filterName])
  // })

  // // Shortcodes
  // Object.keys(shortcodes).forEach(shortcodeName => {
  //   eleventyConfig.addShortcode(shortcodeName, shortcodes[shortcodeName])
  // })

  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/style.css");


  // Input directory: src
  // Output directory: _site
  return {
    templateFormats: [
      "md",
      "njk",
      "html",
      // "liquid"
    ],

    // If your site lives in a different subdirectory, change this.
    // Leading or trailing slashes are all normalized away, so don’t worry about it.
    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for URLs (it does not affect your file structure)
    pathPrefix: "/",

    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    passthroughFileCopy: true,
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
