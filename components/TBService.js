/** Catch any errors TelegramBot Service
 *  303 SEE_OTHER
 *  400 BAD_REQUEST
 *  401 UNAUTHORIZED
 *  403 FORBIDDEN
 *  404 NOT_FOUND
 *  406 NOT_ACCEPTABLE
 *  409 MULTI_INSTANCE
 *  420 FLOOD
 *  500 INTERNAL
 *  and others
**/

function TBPooling (that) {
  if (!that.TB) return

  that.TB.on('polling_error', (error) => {
    console.log(error)
    if (!error.response) {
      error = {
        response: {
          body: {
            error_code: "EFATAL",
            description: "No internet ?"
          }
        }
      }
    }
    console.log("[TELBOT] [SERVICE] Error " + error.response.body.error_code, error.response.body.description)
    var msg = {
      type: 'TEXT',
      text: null,
      option: {
        disable_notification: false,
        parse_mode: 'Markdown'
      }
    }
    switch (error.response.body.error_code) {
      case 409:
        if (that.counterInstance >= 3) {
          if (that.TBService) {
            msg.text = "*[WARNING] This instance of TelegramBot is now stopped!*"
            msg.text += "\n\n" + that.config.text["EXT-TELBOT_HELPER_SERVED"]
            that.lib.Messager.say(that, msg, true)
          } else {
            console.log("[TELBOT] [SERVICE] stopPolling...")
          }
          that.TB.stopPolling()
        } else {
          that.counterInstance += 1
          if (that.TBService) {
            msg.text = "*[WARNING] Make sure that only one TelegramBot instance is running!*",
            msg.text += "\n\n" + that.config.text["EXT-TELBOT_HELPER_SERVED"]
            that.lib.Messager.say(that, msg, true)
          }
        }
        break
      case "EFATAL":
      case 401:
      case 420:
        console.log("[TELBOT] [SERVICE] stopPolling and waiting 1 min before retry...")
        that.TB.stopPolling()
        setTimeout(() => {
          that.TB.startPolling()
          console.log("[TELBOT] [SERVICE] startPolling...")
          if (that.TBService) {
            msg.text = "*" + that.config.text["EXT-TELBOT_HELPER_WAKEUP"] + "*\n"
            msg.text += "Error: "+ error.response.body.error_code + "\n"
            msg.text += "Description: " + error.response.body.description
            msg.text += "\n\n" + that.config.text["EXT-TELBOT_HELPER_SERVED"]
            that.lib.Messager.say(that, msg, true)
          }
        } , 1000 * 60)
        break
      default:
        if (that.TBService) {
          msg.text = "*[WARNING] An error has occurred!*\n"
          msg.text += "Error: "+ error.response.body.error_code + "\n"
          msg.text += "Description: " + error.response.body.description
          msg.text += "\n\n" + that.config.text["EXT-TELBOT_HELPER_SERVED"]
          that.lib.Messager.say(that, msg, true)
        }
        break
    }
  })
  that.TB.on('message', (msg) =>{
    that.lib.Messager.processMessage(that,msg)
  })
}
/** end of TelegramBot Service **/

exports.TBPooling= TBPooling
