const fs = require("fs");

module.exports = function(eleventyConfig) {
  // // Filters
  // Object.keys(filters).forEach(filterName => {
  //   eleventyConfig.addFilter(filterName, filters[filterName])
  // })

  // // Shortcodes
  // Object.keys(shortcodes).forEach(shortcodeName => {
  //   eleventyConfig.addShortcode(shortcodeName, shortcodes[shortcodeName])
  // })

  // eleventyConfig.addPassthroughCopy("src/img");
  // eleventyConfig.addPassthroughCopy("src/css");
  // eleventyConfig.addPassthroughCopy("src/css/fonts");
  // eleventyConfig.addPassthroughCopy("src/javascript");

  /* Markdown Plugins */
  // let markdownIt = require("markdown-it");
  // let markdownItAnchor = require("markdown-it-anchor");
  // let options = {
  //   html: true,
  //   breaks: true,
  //   linkify: true
  // };
  // let opts = {
  //   permalink: true,
  //   permalinkClass: "direct-link",
  //   permalinkSymbol: "#"
  // };

  // eleventyConfig.setLibrary("md", markdownIt(options)
  //   .use(markdownItAnchor, opts)
  // );

  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function(err, browserSync) {
        const content_404 = fs.readFileSync('_site/404.html');

        browserSync.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.write(content_404);
          res.end();
        });
      }
    }
  });

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