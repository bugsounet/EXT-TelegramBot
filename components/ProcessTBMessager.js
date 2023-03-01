/** Process TelegramBot Messager **/

var log = (...args) => { /* do nothing */ }

function processMessage (that,msg) {
  if (that.config.debug) log = (...args) => { console.log("[TELBOT] [MESSAGER]", ...args) }
  var time = that.lib.moment.unix(msg.date)
  if (that.startTime.isAfter(time)) return //do nothing
  var commandLike = (msg.text) ? msg.text : ((msg.caption) ? msg.caption : "")
  if (commandLike.indexOf("/") === 0) {
    //commandLike
    if (!that.allowed.has(msg.from.username)) {
      const notAllowedMsg = (messageid, chatid) => {
        var text = that.config.text["EXT-TELBOT_HELPER_NOT_ALLOWED"]
        var msg = {
          type: 'TEXT',
          chat_id: chatid,
          text: text,
          option: {
            reply_to_message_id: messageid,
            disable_notification: false,
            parse_mode: 'Markdown'
          }
        }
        return msg
      }
      this.say(that, notAllowedMsg(msg.message_id, msg.chat.id))
      return
    } else {
      msg.text = commandLike
      that.sendSocketNotification('COMMAND', msg)
    }
  } else {
    // Not commandlike
    if (msg.reply_to_message) {
      var reply = msg.reply_to_message.message_id
      var foundSession = 0
      that.askSession.forEach((s) => {
        if(s.messageId == reply) {
          foundSession = 1
          msg.sessionId = s.sessionId
          that.sendSocketNotification('ANSWER', msg)
          that.askSession.delete(s)
          return
        }
        if (that.lib.moment.unix(s.time).isBefore(that.lib.moment().add(-1, 'hours'))) {
          that.askSession.delete(s)
        }
      })
      if (foundSession == 1) return
      if (msg.reply_to_message.from.is_bot) return // Don't transfer reply for Robot.
    }
    // Not answer for Bot
    if (!that.config.telecast) return
    if (String(that.config.telecast) == String(msg.chat.id) || that.allowed.has(msg.from.username)) {
      this.processTelecast(that,msg)
    }
  }
}

async function cookMsg (that,msg, callback=(retmsg)=>{}) {
  var fromUserId = msg.from.id
  const clearCache = (life)=>{
    return new Promise (resolve=>{
      try {
        log("Clearing old cache data")
        var cacheDir = that.lib.path.resolve(__dirname, "cache")
        var files = that.lib.fs.readdirSync(cacheDir)
        for (var f of files) {
          var p = that.lib.path.join(cacheDir, f)
          var stat = that.lib.fs.statSync(p)
          var now = new Date().getTime()
          var endTime = new Date(stat.ctime).getTime() + life
          if (now > endTime) {
            log("Unlink old cache file:", p)
            that.lib.fs.unlinkSync(p)
          }
        }
        resolve(true)
      } catch (e){
        resolve(e)
      }
    })
  }
  const downloadFile = (url, filepath)=>{
    return new Promise((resolve)=>{
      var f = that.lib.fs.createWriteStream(filepath)
      f.on('finish', () => {
        f.close()
        resolve(filepath)
      })
      const request = that.lib.https.get(url, (response) => {
        response.pipe(f)
      })
    })
  }
  const processProfilePhoto = async ()=>{
    var upp = await that.TB.getUserProfilePhotos(fromUserId, {offset:0, limit:1})
    if (!(upp && upp.total_count)) return null
    var file = that.lib.path.resolve(__dirname, "../cache", String(fromUserId))
    if (that.lib.fs.existsSync(file)) return fromUserId
    var photo = upp.photos[0][0]
    var link = await that.TB.getFileLink(photo.file_id)
    await downloadFile(link, file)
    return fromUserId
  }
  const processChatPhoto = async (fileArray) => {
    var bigger = fileArray.reduce((p, v)=>{
      return (p.file_size > v.file_size ? p : v)
    })
    var fileId = bigger.file_id
    var link = await that.TB.getFileLink(fileId)
    var file = that.lib.path.resolve(__dirname, "../cache", String(bigger.file_unique_id))
    await downloadFile(link, file)
    return bigger.file_unique_id
  }

  const processChatSticker = async (sticker) => {
    var fileId = sticker.thumb.file_id
    var link = await that.TB.getFileLink(fileId)
    var file = that.lib.path.resolve(__dirname, "../cache", String(sticker.thumb.file_unique_id))
    await downloadFile(link, file)
    return sticker.thumb.file_unique_id
  }

  const processChatAnimated = async (animation) => {
    var fileId = animation.file_id
    var link = await that.TB.getFileLink(fileId)
    var file = that.lib.path.resolve(__dirname, "../cache", String(animation.file_unique_id))
    await downloadFile(link, file)
    return animation.file_unique_id
  }

  const processChatAudio = async (audio) => {
    var fileId = audio.file_id
    var link = await that.TB.getFileLink(fileId)
    var file = that.lib.path.resolve(__dirname, "../cache", String(audio.file_unique_id))
    await downloadFile(link, file)
    return audio.file_unique_id
  }

  var r = await clearCache(that.config.telecastLife)
  if (r instanceof Error) log (r)
  var profilePhoto = await processProfilePhoto()
  if (profilePhoto) msg.from["_photo"] = String(profilePhoto)
  if (msg.hasOwnProperty("photo") && Array.isArray(msg.photo)) {
    if (msg.caption) msg.text = msg.caption
    msg.chat["_photo"] = String(await processChatPhoto(msg.photo))
  }
  if (msg.hasOwnProperty("sticker")) { // pass sticker as photo
    msg.chat["_photo"] = String(await processChatSticker(msg.sticker))
  }
  if (msg.hasOwnProperty("animation")) { // pass animation as video
    msg.chat["_video"] = String(await processChatAnimated(msg.animation))
  }
  if (msg.hasOwnProperty("audio")) {
    msg.chat["_audio"] = String(await processChatAudio(msg.audio))
  }

  if (msg.hasOwnProperty("voice")) {
    msg.chat["_voice"] = String(await processChatAudio(msg.voice))
  }

  callback(msg)
}

function say(that, r, adminMode=false) {
  var chatId = (adminMode) ? that.adminChatId : r.chat_id
  if (!that.TB.isPolling() || !chatId) return
  switch(r.type) {
    case 'VOICE_PATH':
      var data = that.lib.fs.readFileSync(r.path);
      that.TB.sendVoice(chatId, data, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'VOICE_URL':
      that.TB.sendVoice(chatId, r.path, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'VIDEO_PATH':
      var data = that.lib.fs.readFileSync(r.path);
      that.TB.sendVideo(chatId, data, r.option).catch((e) => {this.onError(that, e, r)})
      break;
    case 'VIDEO_URL':
      that.TB.sendVideo(chatId, r.path, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'DOCUMENT_PATH':
      var data = that.lib.fs.readFileSync(r.path);
      that.TB.sendDocument(chatId, data, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'DOCUMENT_URL':
      that.TB.sendDocument(chatId, r.path, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'PHOTO_PATH':
      var data = that.lib.fs.readFileSync(r.path);
      that.TB.sendPhoto(chatId, data, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'PHOTO_URL':
      that.TB.sendPhoto(chatId, r.path, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'AUDIO_PATH':
      var data = that.lib.fs.readFileSync(r.path);
      that.TB.sendAudio(chatId, data, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'AUDIO_URL':
      that.TB.sendAudio(chatId, r.path, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'LOCATION':
      that.TB.sendLocation(chatId, r.latitude, r.longitude, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'VENUE':
      that.TB.sendVenue(chatId, r.latitude, r.longitude, r.title, r.address, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'CONTACT':
      that.TB.sendContact(chatId, r.phoneNumber, r.firstName, r.option).catch((e) => {this.onError(that, e, r)})
      break
    case 'TEXT':
    default:
      that.TB.sendMessage(chatId, r.text, r.option).catch((e) => {this.onError(that, e, r)})
      break
  }
}

function ask(that, r, adminMode=false) {
  var chatId = (adminMode) ? that.adminChatId : r.chat_id
  var sessionId = r.askSession.session_id

  switch(r.type) {
    case 'TEXT':
      that.TB.sendMessage(chatId, r.text, r.option)
        .then((ret)=> {
          that.askSession.add({
            sessionId: sessionId,
            messageId: ret.message_id,
            time: that.lib.moment().format('X')
          })
        })
        .catch((e) => {this.onError(that, e, r)})
      break
  }
}

function welcomeMsg(that) {
  var text = "*" + that.config.text["EXT-TELBOT_HELPER_WAKEUP"] + "*\n"
    + that.config.text["EXT-TELBOT_HELPER_RESTART"]
    + "\n`" + that.startTime.format(that.config.dateFormat) + "`\n"
  var msg = {
    type: 'TEXT',
    chat_id: that.adminChatId,
    text: text,
    option: {
      disable_notification: false,
      parse_mode: 'Markdown'
    }
  }
  return msg
}

function onError(that, err, response) {
  if (!that.TB.isPolling()) return
  if (typeof err.response !== 'undefined') {
    console.log("[TELBOT] ERROR" , err.response.body)
  } else {
    console.log("[TELBOT] ERROR", err.code)
  }

  if (err.code !== 'EFATAL') {
    var text = '`ERROR`\n'
      + "```\n"
      + ((err.response) ? err.response.body.description : "??")
      + "\n```\n"
      + "at\n"
      + "```\n"
      + JSON.stringify(response)
      + "\n```"
    var msg = {
      type: 'TEXT',
      text: text,
      option: {
        disable_notification: false,
        parse_mode: 'Markdown'
      }
    }
    this.say(that, msg, true)
  }
}

function shell(that, command) {
  log("SHELL:", command)
  that.lib.child_process.exec(command, (error, stdout, stderr) => {
    var result = stdout
    if (error) { result = error.message }
    log("SHELL RESULT:", result)
  })
}

function processTelecast (that,msg) {
  this.cookMsg(that, msg, (message)=>{
    that.sendSocketNotification("CHAT", message)
  })
}

exports.processMessage = processMessage
exports.cookMsg = cookMsg
exports.say = say
exports.ask = ask
exports.welcomeMsg = welcomeMsg
exports.onError = onError
exports.shell = shell
exports.processTelecast = processTelecast
