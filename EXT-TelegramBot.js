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
    this.isAlreadyInitialized = 0
    this.commands = []
    this.customCommandCallbacks = new Map()
    this.askSession = new Set()
    this.commonSession = new Map()
    this.config.text = {
      "EXT-TELBOT_HELPER_ERROR" : this.translate("EXT-TELBOT_HELPER_ERROR"),
      "EXT-TELBOT_HELPER_NOT_ALLOWED" : this.translate("EXT-TELBOT_HELPER_NOT_ALLOWED"),
      "EXT-TELBOT_HELPER_RESTART" : this.translate("EXT-TELBOT_HELPER_RESTART"),
      "EXT-TELBOT_HELPER_WAKEUP" : this.translate("EXT-TELBOT_HELPER_WAKEUP"),
      "EXT-TELBOT_HELPER_MSG_COMING" : this.translate("EXT-TELBOT_HELPER_MSG_COMING"),
      "EXT-TELBOT_HELPER_SERVED": this.translate("EXT-TELBOT_HELP_SERVED", { module: "TelegramBot Service"})
    }
    this.config = configMerge({}, this.defaults, this.config)

    this.TELBOTCmdsParser = new TELBOTCmdsParser()
    this.getCommands(new TelegramBotCommandRegister(this, this.registerCommand.bind(this)))
    if (this.config.telecast) this.TELBOTTelecast = new TELBOTTelecast()

    this.allowed = new Set(this.config.allowedUser)
    this.history = []
    this.chats = []
    /** audio part **/
    if (this.config.useSoundNotification) {
      this.sound = new Audio()
      this.sound.autoplay = true
    }
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
      id: "translations/id.json",
      fr: "translations/fr.json",
      it: "translations/it.json",
      es: "translations/es.json",
      "zh-cn": "translations/zh-cn.json",
      tr: "translations/tr.json"
    }
  },

  getStyles: function() {
    return ["EXT-TelegramBot.css"]
  },

  getScripts: function() {
    return [
      "/modules/EXT-TelegramBot/components/TELBOT_lib.js",
      "/modules/EXT-TelegramBot/components/TELBOTCmdParser.js",
      "/modules/EXT-TelegramBot/components/TELBOTTelecast.js"
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
      case "INITIALIZED":
        if (this.isAlreadyInitialized) return
        else this.isAlreadyInitialized = 1
        MM.getModules().enumerate(m=>{
          if ("EXT-TelegramBot"!==m.name && (m.name.startsWith("EXT-")||"MMM-GoogleAssistant"===m.name) && typeof m.EXT_TELBOTCommands == "function"){
            var tc=m.EXT_TELBOTCommands(new TelegramBotCommandRegister(m,this.registerCommand.bind(this)))
            if (Array.isArray(tc)) {
              tc.forEach(c=>{
                this.registerCommand(m,c)
              })
            }
          }
        })
        this.sendNotification("EXT_HELLO", this.name)
        break
      case 'CHAT':
        this.TELBOTTelecast.telecast(this, payload)
        break
      case 'COMMAND':
        this.TELBOTCmdsParser.parseCommand(this, payload)
        break
      case 'SCREENSHOT_RESULT':
        this.TELBOT_screenshot_result(this, payload.session, payload)
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
      case "GA_READY":
        if (sender.name == "MMM-GoogleAssistant") {
          if (this.isAlreadyInitialized) return
          this.sendSocketNotification('INIT', this.config)
          this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
        }
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
  },

  getCommands: function(Register) {
    var defaultCommands = [
      {
        command: 'help',
        callback: "TELBOT_help",
        description: this.translate("EXT-TELBOT_HELP"),
        args_pattern: [/^[^\s]+/],
        args_mapping: ['command']
      },
      {
        command: 'commands',
        description: this.translate("EXT-TELBOT_COMMANDS"),
        callback: "TELBOT_list_commands"
      },
      {
        command: 'modules',
        description: this.translate("EXT-TELBOT_MODULES"),
        callback: "TELBOT_list_modules"
      },
      {
        command : 'mychatid',
        description: this.translate("EXT-TELBOT_MYCHATID"),
        callback: "TELBOT_mychatid"
      },
      {
        command : 'allowed',
        description: this.translate("EXT-TELBOT_ALLOWED"),
        callback: "TELBOT_allowed"
      },
      {
        command : 'allowuser',
        description: this.translate("EXT-TELBOT_ALLOWUSER"),
        callback: "TELBOT_allowuser",
        args_pattern : [/^[^\s]+/],
        args_mapping : ['username']
      },
      {
        command: 'hideall',
        description: this.translate("EXT-TELBOT_HIDEALL"),
        callback: "TELBOT_hideall"
      },
      {
        command: 'showall',
        description: this.translate("EXT-TELBOT_SHOWALL"),
        callback: "TELBOT_showall",
      },
      {
        command: 'hide',
        description: this.translate("EXT-TELBOT_HIDE"),
        callback: "TELBOT_hide",
      },
      {
        command: 'show',
        description: this.translate("EXT-TELBOT_SHOW"),
        callback: "TELBOT_show",
      },
      {
        command: 'shutdown',
        description: this.translate("EXT-TELBOT_SHUTDOWN"),
        callback: "TELBOT_shutdown",
      },
      {
        command: 'favor',
        callback: "TELBOT_favor",
        description: this.translate("EXT-TELBOT_FAVOR"),
      },
      {
        command: 'recent',
        callback: "TELBOT_recent",
        description: this.translate("EXT-TELBOT_RECENT"),
      },
      {
        command: 'resetkeyboard',
        callback: "TELBOT_reset_keyboard",
        description: this.translate("EXT-TELBOT_RESET_KEYBOARD"),
      },
      {
        command: 'notification',
        callback: "TELBOT_noti",
        description: this.translate("EXT-TELBOT_NOTIFICATION"),
        args_pattern: [/([^\s]+)\s?([^\s]?.*|)$/]
      },
      {
        command: 'screenshot',
        callback: "TELBOT_screenshot",
        description: this.translate("EXT-TELBOT_SCREENSHOT"),
      },
      {
        command: 'telecast',
        callback: "TELBOT_telecast",
        description: this.translate("EXT-TELBOT_TELECAST"),
      },
      {
        command: 'clean',
        callback: "TELBOT_clean",
        description: this.translate("EXT-TELBOT_CLEAN"),
      }
    ]
    defaultCommands.forEach((c) => {
      Register.add(c)
    })
  },

  TELBOT_clean: function(command, handler) {
     if (!this.config.telecast) {
      var text = this.translate("EXT-TELBOT_TELECAST_FALSE")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    this.chats = []
    this.updateDom()
    handler.reply("TEXT", this.translate("EXT-TELBOT_CLEAN_DONE"))
  },

  TELBOT_telecast: function(command, handler) {
    if (!this.config.telecast) {
      var text = this.translate("EXT-TELBOT_TELECAST_FALSE")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    handler.message.text = handler.args
    handler.message.caption = handler.args
    this.sendSocketNotification("FORCE_TELECAST", handler.message)
  },

  TELBOT_screenshot: function(command, handler) {
    var sessionId = Date.now() + "_" + this.commonSession.size
    this.commonSession.set(sessionId, handler)
    this.sendSocketNotification("SCREENSHOT", {session: sessionId})
  },

  TELBOT_screenshot_result (sessionId, ret) {
    var handler = this.commonSession.get(sessionId)
    var text = ""
    if (handler && ret.status) {
      this.commonSession.delete(sessionId)
      text = this.translate("EXT-TELBOT_SCREENSHOT_RESULT") + ret.timestamp
      handler.reply("PHOTO_PATH", ret.path, {caption: text})
    } else {
      text = this.translate("EXT-TELBOT_SCREENSHOT_RESULT_ERROR") + "\n" + ret.result
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
    }
  },

  TELBOT_noti: function(command, handler) {
    var error = null
    if (!handler.args || !handler.args[0]) {
      var text = this.translate("EXT-TELBOT_NOTIFICATION_FAIL")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    var noti = handler.args[0][1]
    var pstr = handler.args[0][2]
    var payload = pstr
    if (pstr.indexOf("{") + pstr.indexOf("[") !== -2) {
      try {
        payload = JSON.parse(pstr)
      } catch (e) {
        var text = this.translate("EXT-TELBOT_NOTIFICATION_PAYLOAD_FAIL")
        text += "\n" + "`" + payload + "`"
        handler.reply("TEXT", text, {parse_mode:"Markdown"})
        return
      }
    }
    this.sendNotification(noti, payload)
    handler.reply("TEXT", this.translate("EXT-TELBOT_NOTIFICATION_RESULT"), {parse_mode:"Markdown"})
  },

  TELBOT_favor: function(command, handler) {
    var text = this.translate("EXT-TELBOT_FAVOR_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [this.config.favourites]
      },
      parse_mode:"Markdown"
    })
  },

  TELBOT_recent: function(command, handler) {
    var text = this.translate("EXT-TELBOT_RECENT_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [this.module.history]
      },
      parse_mode:"Markdown"
    })
  },

  TELBOT_reset_keyboard: function(command, handler) {
    var text = this.translate("EXT-TELBOT_RESET_KEYBOARD_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        remove_keyboard:true,
      },
      parse_mode:"Markdown"
    })
  },

  TELBOT_hideall: function(command, handler) {
    var text = this.translate("EXT-TELBOT_HIDEALL_RESULT")
    MM.getModules().enumerate((m)=> {
      m.hide(500, {lockString:"TB_LOCK"})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_showall: function(command, handler) {
    var text = this.translate("EXT-TELBOT_SHOWALL_RESULT")
    MM.getModules().enumerate((m)=> {
      m.show(500, {lockString:"TB_LOCK"})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_hide: function(command, handler) {
    var found = false
    var unlock = false
    if (handler.args) {
      MM.getModules().enumerate((m)=> {
        if (m.name == handler.args) {
          found = true
          if (m.hidden) return handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_HIDE_ALREADY"))
          if (m.lockStrings.length > 0) {
            m.lockStrings.forEach( lock => {
              if (lock == "TB_LOCK") {
                m.hide(500, {lockString: "TB_LOCK"})
                if (m.lockStrings.length == 0) {
                  unlock = true
                  handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_HIDE_DONE"))
                }
              }
            })
            if (!unlock) return handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_HIDE_LOCKED"))
          }
          else {
            m.hide(500, {lockString: "TB_LOCK"})
            handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_HIDE_DONE"))
          }
        }
      })
      if (!found) handler.reply("TEXT", this.translate("EXT-TELBOT_MODULE_NOTFOUND") + handler.args)
    } else return handler.reply("TEXT", this.translate("EXT-TELBOT_MODULE_NAME"))
  },

  TELBOT_show: function(command, handler) {
    var found = false
    var unlock = false
    if (handler.args) {
      MM.getModules().enumerate((m)=> {
        if (m.name == handler.args) {
          found = true
          if (!m.hidden) return handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_SHOW_ALREADY"))
          if (m.lockStrings.length > 0) {
            m.lockStrings.forEach( lock => {
              if (lock == "TB_LOCK") {
                m.show(500, {lockString: "TB_LOCK"})
                if (m.lockStrings.length == 0) {
                  unlock = true
                  handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_SHOW_DONE"))
                }
              }
            })
            if (!unlock) return handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_SHOW_LOCKED"))
          }
          else {
            m.show(500, {lockString: "TB_LOCK"})
            handler.reply("TEXT", handler.args + this.translate("EXT-TELBOT_SHOW_DONE"))
          }
        }
      })
      if (!found) handler.reply("TEXT", this.translate("EXT-TELBOT_MODULE_NOTFOUND") + handler.args)
    } else return handler.reply("TEXT", this.translate("EXT-TELBOT_MODULE_NAME"))
  },

  TELBOT_allowed: function(command, handler) {
    var text = ""
    for (var username of this.allowed) {
      if (text == "") {
        text += "`" + username + "`"
      } else {
        text += ", `" + username + "`"
      }
    }
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_allowuser: function(command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.translate("EXT-TELBOT_ONLY_ADMIN")
    } else if (handler.args !== null) {
      var user = handler.args['username']
      this.allowed.add(user)
      this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
      text = this.translate("EXT-TELBOT_ALLOWUSER_REGISTERED")
    } else {
      text = this.translate("EXT-TELBOT_ALLOWUSER_ERROR")
    }

    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_reboot: function(command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.translate("EXT-TELBOT_ONLY_ADMIN")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
    } else {
      text = this.translate("EXT-TELBOT_REBOOT_RESPONSE")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
      this.sendSocketNotification('REBOOT')
    }
  },

  TELBOT_shutdown: function(command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.translate("EXT-TELBOT_ONLY_ADMIN")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
    } else {
      text = this.translate("EXT-TELBOT_SHUTDOWN_RESPONSE")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
      this.sendSocketNotification('SHUTDOWN')
    }
  },

  TELBOT_mychatid: function(command, handler) {
    //handler.tell, handler.reply, handler.ask
    var text = this.translate("EXT-TELBOT_MYCHATID_RESULT", {"chatid":handler.message.chat.id})
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_list_modules: function(command, handler) {
    var text = ""
    var hidden = this.translate("EXT-TELBOT_HIDDEN")
    var showing = this.translate("EXT-TELBOT_SHOWING")
    MM.getModules().enumerate((m) => {
      text += "`" + m.name + "` _"
      text += ((m.hidden) ? hidden : showing)
      text += "_\n"
    })
    if (!text) {
      text = this.translate("EXT-TELBOT_MODULES_ERROR")
    }
    handler.reply('TEXT', text, {parse_mode:'Markdown'})
  },

  TELBOT_list_commands: function(command, handler) {
    var text = ""
    this.commands.forEach((c) => {
      var name = c.command
      var description = (c.description) ? c.description : ""
      var bits = description.split(/[\.\n]/)
      text += "*" + name + "* \- _" + bits[0] + "_\n"
    })
    if (!text) {
      text = this.translate("EXT-TELBOT_COMMANDS_ERROR")
    }
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_help: function(command, handler) {
    var target
    var text = ""
    if (handler.args !== null) {
      target = handler.args['command']
      this.commands.forEach((c)=>{
        if (c.command == target) {
          text += "`/" + c.command + "`\n"
          text += (c.description) ? c.description : ""
          text += "\n"
          text += (
            (c.moduleName)
              ? (this.translate("EXT-TELBOT_HELP_SERVED", {"module":c.moduleName}))
              : ""
          )
          text += "\n"
        }
      })
    }
    if (!text) {
      text = this.translate("EXT-TELBOT_HELP_HELP")
    }
    var result = handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  registerCommand: function(module, commandObj) {
    var c = commandObj
    var command = c.command
    var moduleName = module.name
    var callback = ((c.callback) ? (c.callback) : 'notificationReceived')
    if (typeof callback !== "function") {
      if (typeof module[callback] !== 'function') return false
    }
    var isNameUsed = 1
    var idx = 0
    for (var j in this.commands) {
      var sameCommand = this.commands.filter(function(com) {
        if (com.command == command) return com
      })
      if (sameCommand.length > 0) {
        isNameUsed = 1
        command = c.command + idx
        idx++
      } else {
        isNameUsed = 0
      }
    }
    var cObj = {
      command : command,
      execute : c.command,
      moduleName : module.name,
      module : module,
      description: c.description,
      callback : callback,
      argsPattern : c.args_pattern,
      argsMapping : c.args_mapping,
    }
    this.commands.push(cObj)
    return true
  }
})
