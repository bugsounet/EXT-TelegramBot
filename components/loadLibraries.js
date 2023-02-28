/** Load sensible library without black screen **/
var log = (...args) => { /* do nothing */ }

function libraries(that) {
  if (that.config.debug) log = (...args) => { console.log("[TELBOT] [LIB]", ...args) }
  let libraries= [
    // { "library to load" : "store library name" }
    { "moment": "moment" },
    { "node-telegram-bot-api": "TelegramBot" },
    { "fs": "fs" },
    { "child_process": "child_process" },
    { "path": "path" },
    { "https": "https" },
    { "../components/screenshot": "screenshot" },
    { "../components/TBService": "TBService" }
  ]
  let errors = 0
  return new Promise(resolve => {
    libraries.forEach(library => {
      for (const [name, configValues] of Object.entries(library)) {
        let libraryToLoad = name
        let libraryName = configValues

        try {
          if (!that.lib[libraryName]) {
            that.lib[libraryName] = require(libraryToLoad)
            log("Loaded:", libraryToLoad, "->", "this.lib."+libraryName)
          }
        } catch (e) {
          console.error("[TELBOT] [LIB]", libraryToLoad, "Loading error!" , e.toString(), e)
          that.sendSocketNotification("WARNING" , {library: libraryToLoad })
          errors++
          that.lib.error = errors
        }
      }
    })
    resolve(errors)
    console.log("[TELBOT] [LIB] All libraries loaded!")
  })
}

exports.libraries = libraries
