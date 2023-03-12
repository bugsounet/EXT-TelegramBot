
class TELBOTConfig {
  constructor(that) {
    that.isAlreadyInitialized = 0
    that.commands = []
    that.customCommandCallbacks = new Map()
    that.askSession = new Set()
    that.commonSession = new Map()
    that.config.text = {
      "EXT-TELBOT_HELPER_ERROR" : that.translate("EXT-TELBOT_HELPER_ERROR"),
      "EXT-TELBOT_HELPER_NOT_ALLOWED" : that.translate("EXT-TELBOT_HELPER_NOT_ALLOWED"),
      "EXT-TELBOT_HELPER_RESTART" : that.translate("EXT-TELBOT_HELPER_RESTART"),
      "EXT-TELBOT_HELPER_WAKEUP" : that.translate("EXT-TELBOT_HELPER_WAKEUP"),
      "EXT-TELBOT_HELPER_MSG_COMING" : that.translate("EXT-TELBOT_HELPER_MSG_COMING"),
      "EXT-TELBOT_HELPER_SERVED": that.translate("EXT-TELBOT_HELP_SERVED", { module: "TelegramBot Service"})
    }
    that.config = configMerge({}, that.defaults, that.config)
    that.sendSocketNotification('INIT', that.config)

    that.TELBOTInit = new TELBOTInit()
    that.TELBOTCmds = new TELBOTCmds()
    that.TELBOTRegister = new TELBOTRegister()
    that.TELBOTCmdsParser = new TELBOTCmdsParser()
    that.TELBOTCmds.getCommands(that, new TelegramBotCommandRegister(that, that.TELBOTRegister.registerCommand.bind(that)))
    if (that.config.telecast) {
      that.TELBOTTelecast = new TELBOTTelecast()
    }

    that.allowed = new Set(that.config.allowedUser)
    that.history = []
    that.chats = []
    /** audio part **/
    if (that.config.useSoundNotification) {
      that.sound = new Audio()
      that.sound.autoplay = true
    }
    console.log("[TELBOT] TELBOTConfig Ready")
  }
}
