'use strict'
/* Magic Mirror
 * Module: EXT-TelegramBot
 *
 * By eouia & @bugsounet
 */

Module.register("EXT-TelegramBot", {
  defaults: {
    debug: false,
    telegramAPIKey: null,
    adminChatId: null,
    allowedUser: [],
    commandAllowed: { // If set, only specific user can use these commands, other even in allowedUser cannot. These members should be allowed by allowedUser first.
      //"telecast": ["eouia", "someone"],
      //"mychatid": ["eouia"]
    },
    useWelcomeMessage: true,
    useSoundNotification: true,
    TelegramBotServiceAlerte: true,
    detailOption: {},
    //if you want this module to work behind local proxy, try this. (experimental)
    /*
    detailOption: {
      request: {
        proxy: "https://someone:somepassword@local.proxy.addr:1234",
      }
    }
    */
    favourites:["/commands", "/modules", "/hideall", "/showall"],
    telecast: null, // true or chat_id
    telecastLife: 1000 * 60 * 60 * 6,
    telecastLimit: 5,
    telecastHideOverflow: true,
    telecastContainer: 300,
    dateFormat: "DD-MM-YYYY HH:mm:ss"
  },

  start: function() {
    new TELBOTConfig(this)
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
      id: "translations/id.json",
      fr: "translations/fr.json",
      it: "translations/it.json",
      es: "translations/es.json"
    }
  },

  getStyles: function() {
    return ["EXT-TelegramBot.css"]
  },

  getScripts: function() {
    return [
      "/modules/EXT-TelegramBot/components/TELBOTConfig.js",
      "/modules/EXT-TelegramBot/components/TELBOT_lib.js",
      "/modules/EXT-TelegramBot/components/TELBOTCmds.js",
      "/modules/EXT-TelegramBot/components/TELBOTRegister.js",
      "/modules/EXT-TelegramBot/components/TELBOTCmdParser.js",
      "/modules/EXT-TelegramBot/components/TELBOTTelecast.js",
      "/modules/EXT-TelegramBot/components/TELBOTInit-min.js"
    ]
  },

  getDom: function() {
    var dom = document.createElement("div")
    dom.id = "EXT-TELBOT"
    if ((isNaN(this.config.telecastContainer)) || this.config.telecastContainer < 200 || this.config.telecastContainer > 1000) {
      /** Wrong setting go to default **/
      this.config.telecastContainer = this.defaults.telecastContainer
    }
    if (this.config.telecast) {
      dom.setAttribute('style', "--container-width:" + this.config.telecastContainer + "px;")
      dom.appendChild(this.TELBOTTelecast.getTelecastDom(this))
    }
    else {
      dom.style.display = 'none'
    }
    return dom
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'CHAT':
        this.TELBOTTelecast.telecast(this, payload)
        break
      case 'COMMAND':
        this.TELBOTCmdsParser.parseCommand(this, payload)
        break
      case 'SCREENSHOT_RESULT':
        this.TELBOT_screenshot_result(payload.session, payload)
        break
      case 'ANSWER':
        this.askSession.forEach((s)=> {
          if (s.session_id == payload.sessionId) {
            var callbacks = {
              reply: this.TELBOTCmdsParser.reply.bind(this),
              ask: this.TELBOTCmdsParser.ask.bind(this),
              say: this.TELBOTCmdsParser.say.bind(this)
            }
            var handler = new TelegramBotMessageHandler( payload, payload.text, callbacks )
            s.callback("ANSWER_FOR_ASK", handler)
            this.askSession.delete(s)
            return
          }
          if (moment.unix(s.time).isBefore(moment().add(-1, 'hours'))) {
            this.askSession.delete(s)
          }
        })
      break
    }
  },

  notificationReceived: function (notification, payload, sender) {
    switch(notification) {
      case "GAv4_READY":
      case "GAv5_READY":
        if (sender.name == "MMM-GoogleAssistant") this.sendNotification("EXT_HELLO", this.name)
        break
      case 'ALL_MODULES_STARTED':
        if (this.isAlreadyInitialized) return
        else this.isAlreadyInitialized = 1
        this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
        this.TELBOTInit.init(this)
        break
      case 'EXT_TELBOT-REGISTER_COMMAND':
        this.TELBOTCmds.registerCommand(sender, payload)
        break
      case 'EXT_TELBOT-TELL_ADMIN':
        if (typeof payload == 'string') {
          payload += "\n" + this.translate("EXT-TELBOT_HELP_SERVED" , {module: sender.name})
          var r = {
            chat_id : null,
            type : 'TEXT',
            text : payload,
            option : {parse_mode:'Markdown'}
          }
          this.TELBOTCmdsParser.adminSay(this, r)
        } else if (typeof payload == "object") {
          var r = Object.assign({}, payload, {chat_id:null})
          this.TELBOTCmdsParser.adminSay(this, r)
        }
        break
    }
  }
})
