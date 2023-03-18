'use strict'

var parseData = require("./components/parseData.js")
var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start: function () {
    parseData.init(this)
  },

  initialize: function(config) {
    this.config = config
    console.log("[TELBOT] EXT-TelegramBot Version:",  require('./package.json').version, "rev:", require('./package.json').rev)

    parseData.parse(this)
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
  }
})
