class TELBOTCmds {
  constructor () {
    console.log("[TELBOT] TELBOTCmds Ready")
  }

  getCommands (TB, Register) {
    var defaultCommands = [
      {
        command: 'help',
        callback : this.TELBOT_help,
        description : TB.translate("EXT-TELBOT_HELP"),
        args_pattern : [/^[^\s]+/],
        args_mapping : ['command']
      },
      {
        command: 'commands',
        description: TB.translate("EXT-TELBOT_COMMANDS"),
        callback : this.TELBOT_list_commands
      },
      {
        command: 'modules',
        description: TB.translate("EXT-TELBOT_MODULES"),
        callback : this.TELBOT_list_modules
      },
      {
        command : 'mychatid',
        description: TB.translate("EXT-TELBOT_MYCHATID"),
        callback : this.TELBOT_mychatid
      },
      {
        command : 'allowed',
        description: TB.translate("EXT-TELBOT_ALLOWED"),
        callback : this.TELBOT_allowed
      },
      {
        command : 'allowuser',
        description: TB.translate("EXT-TELBOT_ALLOWUSER"),
        callback : this.TELBOT_allowuser,
        args_pattern : [/^[^\s]+/],
        args_mapping : ['username']
      },
      {
        command: 'hideall',
        description : TB.translate("EXT-TELBOT_HIDEALL"),
        callback : this.TELBOT_hideall
      },
      {
        command: 'showall',
        description : TB.translate("EXT-TELBOT_SHOWALL"),
        callback : this.TELBOT_showall,
      },
      {
        command: 'hide',
        description : TB.translate("EXT-TELBOT_HIDE"),
        callback : this.TELBOT_hide,
      },
      {
        command: 'show',
        description : TB.translate("EXT-TELBOT_SHOW"),
        callback : this.TELBOT_show,
      },
      {
        command: 'shutdown',
        description : TB.translate("EXT-TELBOT_SHUTDOWN"),
        callback : this.TELBOT_shutdown,
      },
      {
        command: 'favor',
        callback : this.TELBOT_favor,
        description : TB.translate("EXT-TELBOT_FAVOR"),
      },
      {
        command: 'recent',
        callback : this.TELBOT_recent,
        description : TB.translate("EXT-TELBOT_RECENT"),
      },
      {
        command: 'resetkeyboard',
        callback : this.TELBOT_reset_keyboard,
        description : TB.translate("EXT-TELBOT_RESET_KEYBOARD"),
      },
      {
        command: 'notification',
        callback: this.TELBOT_noti,
        description: TB.translate("EXT-TELBOT_NOTIFICATION"),
        args_pattern: [/([^\s]+)\s?([^\s]?.*|)$/]
      },
      {
        command: 'screenshot',
        callback: this.TELBOT_screenshot,
        description: TB.translate("EXT-TELBOT_SCREENSHOT"),
      },
      {
        command: 'telecast',
        callback: this.TELBOT_telecast,
        description: TB.translate("EXT-TELBOT_TELECAST"),
      },
      {
        command: 'clean',
        callback: this.TELBOT_clean,
        description: TB.translate("EXT-TELBOT_CLEAN"),
      }
    ]
    defaultCommands.forEach((c) => {
      Register.add(c)
    })
  }

  TELBOT_clean (command, handler) {
     if (!this.module.config.telecast) {
      var text = this.module.translate("EXT-TELBOT_TELECAST_FALSE")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    this.module.chats = []
    this.module.updateDom()
    handler.reply("TEXT", this.module.translate("EXT-TELBOT_CLEAN_DONE"))
  }

  TELBOT_telecast (command, handler) {
    if (!this.module.config.telecast) {
      var text = this.module.translate("EXT-TELBOT_TELECAST_FALSE")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    handler.message.text = handler.args
    handler.message.caption = handler.args
    this.module.sendSocketNotification("FORCE_TELECAST", handler.message)
  }

  TELBOT_screenshot (command, handler) {
    var sessionId = Date.now() + "_" + this.module.commonSession.size
    this.module.commonSession.set(sessionId, handler)
    this.module.sendSocketNotification("SCREENSHOT", {session: sessionId})
  }

  TELBOT_screenshot_result (sessionId, ret) {
    var handler = this.module.commonSession.get(sessionId)
    var text = ""
    if (handler && ret.status) {
      this.module.commonSession.delete(sessionId)
      text = this.module.translate("EXT-TELBOT_SCREENSHOT_RESULT") + ret.timestamp
      handler.reply("PHOTO_PATH", ret.path, {caption: text})
    } else {
      text = this.module.translate("EXT-TELBOT_SCREENSHOT_RESULT_ERROR") + "\n" + ret.result
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
    }
  }

  TELBOT_noti (command, handler) {
    var error = null
    if (!handler.args || !handler.args[0]) {
      var text = this.module.translate("EXT-TELBOT_NOTIFICATION_FAIL")
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
        var text = this.module.translate("EXT-TELBOT_NOTIFICATION_PAYLOAD_FAIL")
        text += "\n" + "`" + payload + "`"
        handler.reply("TEXT", text, {parse_mode:"Markdown"})
        return
      }
    }
    this.module.sendNotification(noti, payload)
    handler.reply("TEXT", this.module.translate("EXT-TELBOT_NOTIFICATION_RESULT"), {parse_mode:"Markdown"})
  }

  TELBOT_favor (command, handler) {
    var text = this.module.translate("EXT-TELBOT_FAVOR_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [this.module.config.favourites]
      },
      parse_mode:"Markdown"
    })
  }

  TELBOT_recent (command, handler) {
    var text = this.module.translate("EXT-TELBOT_RECENT_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [this.module.history]
      },
      parse_mode:"Markdown"
    })
  }

  TELBOT_reset_keyboard (command, handler) {
    var text = this.module.translate("EXT-TELBOT_RESET_KEYBOARD_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        remove_keyboard:true,
      },
      parse_mode:"Markdown"
    })
  }

  TELBOT_hideall (command, handler) {
    var text = this.module.translate("EXT-TELBOT_HIDEALL_RESULT")
    var lockString = this.module.name
    MM.getModules().enumerate((m)=> {
      m.hide(500, {lockString:"TB_LOCK"})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }

  TELBOT_showall (command, handler) {
    var text = this.module.translate("EXT-TELBOT_SHOWALL_RESULT")
    var lockString = this.module.name
    MM.getModules().enumerate((m)=> {
      m.show(500, {lockString:"TB_LOCK"})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }

  TELBOT_hide (command, handler) {
    var found = false
    var unlock = false
    if (handler.args) {
      MM.getModules().enumerate((m)=> {
        if (m.name == handler.args) {
          found = true
          if (m.hidden) return handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_HIDE_ALREADY"))
          if (m.lockStrings.length > 0) {
            m.lockStrings.forEach( lock => {
              if (lock == "TB_LOCK") {
                m.hide(500, {lockString: "TB_LOCK"})
                if (m.lockStrings.length == 0) {
                  unlock = true
                  handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_HIDE_DONE"))
                }
              }
            })
            if (!unlock) return handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_HIDE_LOCKED"))
          }
          else {
            m.hide(500, {lockString: "TB_LOCK"})
            handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_HIDE_DONE"))
          }
        }
      })
      if (!found) handler.reply("TEXT", this.module.translate("EXT-TELBOT_MODULE_NOTFOUND") + handler.args)
    } else return handler.reply("TEXT", this.module.translate("EXT-TELBOT_MODULE_NAME"))
  }

  TELBOT_show (command, handler) {
    var found = false
    var unlock = false
    if (handler.args) {
      MM.getModules().enumerate((m)=> {
        if (m.name == handler.args) {
          found = true
          if (!m.hidden) return handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_SHOW_ALREADY"))
          if (m.lockStrings.length > 0) {
            m.lockStrings.forEach( lock => {
              if (lock == "TB_LOCK") {
                m.show(500, {lockString: "TB_LOCK"})
                if (m.lockStrings.length == 0) {
                  unlock = true
                  handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_SHOW_DONE"))
                }
              }
            })
            if (!unlock) return handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_SHOW_LOCKED"))
          }
          else {
            m.show(500, {lockString: "TB_LOCK"})
            handler.reply("TEXT", handler.args + this.module.translate("EXT-TELBOT_SHOW_DONE"))
          }
        }
      })
      if (!found) handler.reply("TEXT", this.module.translate("EXT-TELBOT_MODULE_NOTFOUND") + handler.args)
    } else return handler.reply("TEXT", this.module.translate("EXT-TELBOT_MODULE_NAME"))
  }

  TELBOT_allowed (command, handler) {
    var text = ""
    for (var username of this.module.allowed) {
      if (text == "") {
        text += "`" + username + "`"
      } else {
        text += ", `" + username + "`"
      }
    }
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }

  TELBOT_allowuser (command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.module.translate("EXT-TELBOT_ONLY_ADMIN")
    } else if (handler.args !== null) {
      var user = handler.args['username']
      this.module.allowed.add(user)
      this.module.sendSocketNotification('ALLOWEDUSER', [...this.module.allowed])
      text = this.module.translate("EXT-TELBOT_ALLOWUSER_REGISTERED")
    } else {
      text = this.module.translate("EXT-TELBOT_ALLOWUSER_ERROR")
    }

    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }

  TELBOT_reboot (command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.module.translate("EXT-TELBOT_ONLY_ADMIN")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
    } else {
      text = this.module.translate("EXT-TELBOT_REBOOT_RESPONSE")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
      this.module.sendSocketNotification('REBOOT')
    }
  }

  TELBOT_shutdown (command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.module.translate("EXT-TELBOT_ONLY_ADMIN")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
    } else {
      text = this.module.translate("EXT-TELBOT_SHUTDOWN_RESPONSE")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
      this.module.sendSocketNotification('SHUTDOWN')
    }
  }

  TELBOT_mychatid (command, handler) {
    //handler.tell, handler.reply, handler.ask
    var text = this.module.translate("EXT-TELBOT_MYCHATID_RESULT", {"chatid":handler.message.chat.id})
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }

  TELBOT_list_modules (command, handler) {
    var text = ""
    var hidden = this.module.translate("EXT-TELBOT_HIDDEN")
    var showing = this.module.translate("EXT-TELBOT_SHOWING")
    MM.getModules().enumerate((m) => {
      text += "`" + m.name + "` _"
      text += ((m.hidden) ? hidden : showing)
      text += "_\n"
    })
    if (!text) {
      text = this.module.translate("EXT-TELBOT_MODULES_ERROR")
    }
    handler.reply('TEXT', text, {parse_mode:'Markdown'})
  }

  TELBOT_list_commands (command, handler) {
    var text = ""
    this.module.commands.forEach((c) => {
      var name = c.command
      var description = (c.description) ? c.description : ""
      var bits = description.split(/[\.\n]/)
      text += "*" + name + "* \- _" + bits[0] + "_\n"
    })
    if (!text) {
      text = this.module.translate("EXT-TELBOT_COMMANDS_ERROR")
    }
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }

  TELBOT_help (command, handler) {
    var target
    var text = ""
    if (handler.args !== null) {
      target = handler.args['command']
      this.module.commands.forEach((c)=>{
        if (c.command == target) {
          text += "`/" + c.command + "`\n"
          text += (c.description) ? c.description : ""
          text += "\n"
          text += (
            (c.moduleName)
              ? (this.module.translate("EXT-TELBOT_HELP_SERVED", {"module":c.moduleName}))
              : ""
          )
          text += "\n"
        }
      })
    }
    if (!text) {
      text = this.module.translate("EXT-TELBOT_HELP_HELP")
    }
    var result = handler.reply("TEXT", text, {parse_mode:'Markdown'})
  }
}
