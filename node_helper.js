'use strict'

var log = (...args) => { /* do nothing */ }
var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start: function () {
    process.env.NTBA_FIX_350 = 1
    this.lib = { error: 0 }
    this.config = {}
    this.commands = []
    this.callsigns = []
    this.adminChatId = undefined
    this.askSession = new Set()
    this.allowed = new Set()
    this.TB = null
    this.counterInstance = 0
    this.TBService = true
  },

  initialize: async function(config) {
    this.config = config
    console.log("[TELBOT] EXT-TelegramBot Version:",  require('./package.json').version, "rev:", require('./package.json').rev)
    if (this.config.debug) log = (...args) => { console.log("[TELBOT]", ...args) }
    let bugsounet = await this.libraries()
    if (bugsounet) {
      console.error(`[TELBOT] [DATA] Warning: ${bugsounet} needed library not loaded!`)
      return
    }
    this.startTime = this.lib.moment()
    this.TBService = this.config.TelegramBotServiceAlerte
    
    if (typeof this.config.adminChatId !== 'undefined') {
      this.adminChatId = this.config.adminChatId
    }
  
    if (typeof this.config.telegramAPIKey !== 'undefined') {
      try {
        var option = Object.assign({polling:true}, this.config.detailOption)
        this.TB = new this.lib.TelegramBot(this.config.telegramAPIKey, option)
        var me = this.TB.getMe()
      } catch (err) {
        return console.log("[TELBOT] [DATA]", err)
      }
  
      this.lib.TBService.TBPooling(this)
      console.log("[TELBOT] [DATA] Ready!")
      this.sendSocketNotification("INITIALIZED")
  
      if (this.adminChatId && this.config.useWelcomeMessage) {
        this.lib.Messager.say(this, this.lib.Messager.welcomeMsg(this))
      }
    } else { // inform with EXT-Alert
      console.error("[TELBOT] [DATA] telegramAPIKey missing!")
    }
  },

  socketNotificationReceived: function (notification, payload) {
    switch(notification) {
      case 'INIT':
        if (this.TB === null) this.initialize(payload)
        else console.log("[TELBOT] Already running!")
        break
      case 'REPLY':
      case 'SAY':
        if (this.TB) this.lib.Messager.say(this,payload)
        break
      case 'SAY_ADMIN':
        if (this.TB) this.lib.Messager.say(this,payload, true)
        break
      case 'ASK':
        if (this.TB) this.lib.Messager.ask(this,payload)
        break
      case 'ALLOWEDUSER':
        this.allowed = new Set(payload)
        break
      case 'SHUTDOWN':
        if (this.TB) this.lib.Messager.shell(this, 'sudo shutdown now')
        break
      case 'SCREENSHOT':
        if (this.TB) this.lib.screenshot.scrot(this,payload.session)
        break
      case 'FORCE_TELECAST':
        if (this.TB) this.lib.Messager.processTelecast(this,payload)
        break
    }
  },

  libraries: function() {
    let libraries= [
      // { "library to load" : "store library name" }
      { "moment": "moment" },
      { "node-telegram-bot-api": "TelegramBot" },
      { "fs": "fs" },
      { "child_process": "child_process" },
      { "path": "path" },
      { "https": "https" },
      { "./components/screenshot": "screenshot" },
      { "./components/TBService": "TBService" },
      { "./components/ProcessTBMessager": "Messager" }
    ]
    let errors = 0
    return new Promise(resolve => {
      libraries.forEach(library => {
        for (const [name, configValues] of Object.entries(library)) {
          let libraryToLoad = name
          let libraryName = configValues
  
          try {
            if (!this.lib[libraryName]) {
              this.lib[libraryName] = require(libraryToLoad)
              log(`[LIBRARY] Loaded: ${libraryToLoad} --> this.lib.${libraryName}`)
            }
          } catch (e) {
            console.error(`[TELBOT] [LIBRARY] ${libraryToLoad} Loading error!` , e.toString())
            this.sendSocketNotification("WARNING" , {library: libraryToLoad })
            errors++
            this.lib.error = errors
          }
        }
      })
      if (!errors) console.log("[TELBOT] [LIBRARY] All libraries loaded!")
      resolve(errors)
    })
  }
})
