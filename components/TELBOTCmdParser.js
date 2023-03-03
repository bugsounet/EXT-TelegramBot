 
class TELBOTCmdsParser {
  constructor () {
    console.log("|TELBOT] TELBOTCmdsParser")
  }

  parseCommand(that, msg) {
    const createHandler = (msg, args) => {
      var callbacks = {
        reply: this.reply.bind(that),
        ask: this.ask.bind(that),
        say: this.say.bind(that)
      }
      return new TelegramBotMessageHandler(msg, args, callbacks)
    }
    var args = null
    var response = null
    var chatId = msg.chat.id
    if (typeof msg.text == 'undefined') return
    var msgText = msg.text
    if (msgText.indexOf("/") !== 0) return
    var matched = msgText.match(new RegExp("^\/([0-9a-zA-Z-_]+)\s?(.*)$"))
    var matchedCommands = []
    if (matched) {
      matchedCommands = that.commands.filter((c)=>{
        if (c.command.indexOf(matched[1]) == 0) return true
        return false
      })
      if (matchedCommands.length > 1) {
        var exact = matchedCommands.filter((c)=>{
          if (c.command == matched[1]) return true
          return false
        })
        if (exact.length == 1) {
          matchedCommands = exact
        }
      }
    }
    if (matchedCommands.length == 1) {
      //proper
      var c = matchedCommands[0]
      if (that.config.commandAllowed.hasOwnProperty(c.command)) {
        var allowedUser = that.config.commandAllowed[c.command]
        if (Array.isArray(allowedUser) && allowedUser.length > 0) {
          if (!allowedUser.includes(msg.from.username)) {
            var handler = createHandler(msg, null)
            var text = that.translate("EXT-TELBOT_NOT_ALLOWED_COMMAND")
            handler.reply("TEXT", text, {parse_mode:"Markdown"})
            return
          }
        }
      }
      var restText = matched[2].trim()
      if (restText == '') {
        args = null
      } else {
        if (c.argsPattern && Array.isArray(c.argsPattern)) {
          args = []
          for(var j = 0; j < c.argsPattern.length; j++) {
            var p = c.argsPattern[j]
            if (p instanceof RegExp) {
              //do nothing.
            } else {
              if (typeof p == 'string') {
                p = p.toRegExp()
              } else {
                p = /.*/
              }
            }
            var result = p.exec(restText.trim())
            if (c.argsMapping && Array.isArray(c.argsMapping)) {
              if (typeof c.argsMapping[j] !== 'undefined') {
                if (result && result.length == 1) {
                  args[c.argsMapping[j]] = result[0]
                } else {
                  args[c.argsMapping[j]] = result
                }
              } else {
                if (result && result.length == 1) {
                  args.push(result[0])
                } else {
                  args.push(result)
                }
              }
            } else {
              if (result && result.length == 1) {
                args.push(result[0])
              } else {
                args.push(result)
              }
            }
          }
        } else {
          args = restText
        }
      }
      if (msg.chat.id == that.config.adminChatId) {
        msg.admin = 'admin'
      }
      if (c.callback !== 'notificationReceived') {
        var handler = createHandler(msg, args)
        if (typeof c.callback == "function") {
          c.callback(c.execute, handler, c.module)
        } else {
          c.module[c.callback].bind(c.module)
          c.module[c.callback](c.execute, handler, c.module)
        }
      } else {
        c.module[c.callback].bind(c.module)
        c.module[c.callback](c.execute, args)
      }
      that.history.push(msg.text)
      while(that.history.length > 5) {
        that.history.shift()
      }
    } else {
      //0 or multi
      var handler = createHandler(msg, null)
      var text = that.translate("EXT-TELBOT_NOT_REGISTERED_COMMAND")
      if (matchedCommands.length > 1) {
        text = that.translate("EXT-TELBOT_FOUND_SEVERAL_COMMANDS")
        for (var tc of matchedCommands) {
          text += `*/${tc.command}*\n`
        }
      }
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
    }
  }

  reply (response) {
    this.sendSocketNotification('REPLY', response)
  }

  ask (response, sessionId, callback) {
    if (sessionId == null) return false
    var session = {
      session_id : sessionId,
      callback:callback,
      time:moment().format('X')
    }
    this.askSession.add(session)
    response.askSession = session
    this.sendSocketNotification('ASK', response)
  }

  say (response, adminMode=false) {
    if (adminMode) this.sendSocketNotification('SAY_ADMIN', response)
    else this.sendSocketNotification('SAY', response)
  }

  adminSay (that, response) {
    that.sendSocketNotification('SAY_ADMIN', response)
  }
}
