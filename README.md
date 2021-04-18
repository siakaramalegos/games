# Sia's Boardgames Site

This is a re-implementation of my [previous boardgame site](https://projects.sia.codes/boardgames/) but uses the BoardGameGeek API to pull in more info. It uses an unofficial, not professional JSON implementation of it though: [https://bgg-json.azurewebsites.net/]. My site is built with Eleventy so the API is only pinged on new production builds to minimize requests. It also caches the previous results so that if the request fails, you still have your old data.

I'd love to improve this, so if you have suggestions, let me know!
