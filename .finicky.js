module.exports = {
  defaultBrowser: "Safari",
  handlers: [
    {
      match: [
        /localhost/,
        /meet\.google\.com/,
        /teams\.microsoft\.com/
      ],
      browser: "Google Chrome"
    }
  ]
};
