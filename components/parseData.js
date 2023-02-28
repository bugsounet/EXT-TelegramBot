/** parse data from MagicMirror **/
var _load = require("../components/loadLibraries.js")

async function init(that) {
  that.lib = { error: 0 }
  that.config = {}
  that.commands = []
  that.callsigns = []
  that.adminChatId = undefined
  that.askSession = new Set()
  that.allowed = new Set()
  that.TB = null
  that.counterInstance = 0
  that.TBService = true
}

async function parse(that,data) {
  let bugsounet = await _load.libraries(that)
  if (bugsounet) {
    console.error("[TELBOT] Warning:", bugsounet, "needed library not loaded !")
    return
  }
  that.startTime = that.lib.moment()
  that.TBService = that.config.TelegramBotServiceAlerte
  
  if (typeof that.config.adminChatId !== 'undefined') {
    that.adminChatId = that.config.adminChatId
  }

  if (typeof that.config.telegramAPIKey !== 'undefined') {
    try {
      var option = Object.assign({polling:true}, that.config.detailOption)
      that.TB = new that.lib.TelegramBot(that.config.telegramAPIKey, option)
      var me = that.TB.getMe()
    } catch (err) {
      return console.log("[TELBOT]", err)
    }

    that.lib.TBService.TBPooling(that)
    console.log("[TELBOT] Ready!")

    if (that.adminChatId && that.config.useWelcomeMessage) {
      that.say(that.welcomeMsg())
    }
  } else { // inform with EXT-Alert
    console.log("[TELBOT] Configuration fails.")
  }
}

exports.init = init
exports.parse = parse
