"use strict";

var log = (...args) => { /* do nothing */ };
var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start () {
    process.env.NTBA_FIX_350 = 1;
    this.lib = { error: 0 };
    this.config = {};
    this.commands = [];
    this.callsigns = [];
    this.adminChatId = undefined;
    this.askSession = new Set();
    this.allowed = new Set();
    this.TB = null;
    this.counterInstance = 0;
    this.TBService = true;
  },

  async initialize (config) {
    this.config = config;
    console.log("[TELBOT] EXT-TelegramBot Version:",  require("./package.json").version, "rev:", require("./package.json").rev);
    if (this.config.debug) log = (...args) => { console.log("[TELBOT]", ...args); };
    let bugsounet = await this.libraries();
    if (bugsounet) {
      console.error(`[TELBOT] [DATA] Warning: ${bugsounet} needed library not loaded!`);
      return;
    }
    this.startTime = this.lib.moment();
    this.TBService = this.config.TelegramBotServiceAlerte;

    if (typeof this.config.adminChatId !== "undefined") {
      this.adminChatId = this.config.adminChatId;
    }

    if (typeof this.config.telegramAPIKey !== "undefined") {
      try {
        var option = Object.assign({ polling:true }, this.config.detailOption);
        this.TB = new this.lib.TelegramBot(this.config.telegramAPIKey, option);
        var me = this.TB.getMe();
      } catch (err) {
        return console.log("[TELBOT] [DATA]", err);
      }

      this.TBPooling();
      console.log("[TELBOT] [DATA] Ready!");
      this.sendSocketNotification("INITIALIZED");

      if (this.adminChatId && this.config.useWelcomeMessage) {
        this.say(this.welcomeMsg());
      }
    } else {
      console.error("[TELBOT] [DATA] telegramAPIKey missing!");
    }
  },

  socketNotificationReceived (notification, payload) {
    switch(notification) {
      case "INIT":
        if (this.TB === null) this.initialize(payload);
        else console.log("[TELBOT] Already running!");
        break;
      case "REPLY":
      case "SAY":
        if (this.TB) this.say(payload);
        break;
      case "SAY_ADMIN":
        if (this.TB) this.say(payload, true);
        break;
      case "ASK":
        if (this.TB) this.ask(payload);
        break;
      case "ALLOWEDUSER":
        this.allowed = new Set(payload);
        break;
      case "SHUTDOWN":
        if (this.TB) this.shell("sudo shutdown now");
        break;
      case "SCREENSHOT":
        if (this.TB) this.screenshot(payload.session);
        break;
      case "FORCE_TELECAST":
        if (this.TB) this.processTelecast(payload);
        break;
    }
  },

  libraries () {
    let libraries= [
      // { "library to load" : "store library name" }
      { moment: "moment" },
      { "node-telegram-bot-api": "TelegramBot" },
      { fs: "fs" },
      { child_process: "child_process" },
      { path: "path" },
      { https: "https" }
    ];
    let errors = 0;
    return new Promise((resolve) => {
      libraries.forEach((library) => {
        for (const [name, configValues] of Object.entries(library)) {
          let libraryToLoad = name;
          let libraryName = configValues;

          try {
            if (!this.lib[libraryName]) {
              this.lib[libraryName] = require(libraryToLoad);
              log(`[LIBRARY] Loaded: ${libraryToLoad} --> this.lib.${libraryName}`);
            }
          } catch (e) {
            console.error(`[TELBOT] [LIBRARY] ${libraryToLoad} Loading error!` , e.toString());
            this.sendSocketNotification("WARNING" , { library: libraryToLoad });
            errors++;
            this.lib.error = errors;
          }
        }
      });
      if (!errors) console.log("[TELBOT] [LIBRARY] All libraries loaded!");
      resolve(errors);
    });
  },

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

  TBPooling () {
    if (!this.TB) return;

    this.TB.on("polling_error", (error) => {
      if (this.config.debug) console.error("[TELBOT] [SERVICE] Error", error);
      /* eslint-disable no-param-reassign */
      if (!error.response) {
        error = {
          response: {
            body: {
              error_code: "EFATAL",
              description: "No internet ?"
            }
          }
        };
      }
      /* eslint-enable no-param-reassign */
      console.log(`[TELBOT] [SERVICE] Error ${error.response.body.error_code}`, error.response.body.description);
      var msg = {
        type: "TEXT",
        text: null,
        option: {
          disable_notification: false,
          parse_mode: "Markdown"
        }
      };
      switch (error.response.body.error_code) {
        case 409:
          if (this.counterInstance >= 3) {
            if (this.TBService) {
              msg.text = "*[WARNING] This instance of TelegramBot is now stopped!*";
              msg.text += `\n\n${this.config.text["EXT-TELBOT_HELPER_SERVED"]}`;
              this.say(msg, true);
            } else {
              console.log("[TELBOT] [SERVICE] stopPolling...");
            }
            this.TB.stopPolling();
          } else {
            this.counterInstance += 1;
            if (this.TBService) {
              msg.text = "*[WARNING] Make sure this only one TelegramBot instance is running!*",
              msg.text += `\n\n${this.config.text["EXT-TELBOT_HELPER_SERVED"]}`;
              this.say(msg, true);
            }
          }
          break;
        case "EFATAL":
        case 401:
        case 420:
          console.log("[TELBOT] [SERVICE] stopPolling and waiting 1 min before retry...");
          this.TB.stopPolling();
          setTimeout(() => {
            this.TB.startPolling();
            console.log("[TELBOT] [SERVICE] startPolling...");
            if (this.TBService) {
              msg.text = `*${  this.config.text["EXT-TELBOT_HELPER_WAKEUP"]  }*\n`;
              msg.text += `Error: ${error.response.body.error_code}\n`;
              msg.text += `Description: ${error.response.body.description}`;
              msg.text += `\n\n${this.config.text["EXT-TELBOT_HELPER_SERVED"]}`;
              this.say(msg, true);
            }
          } , 1000 * 60);
          break;
        default:
          if (this.TBService) {
            msg.text = "*[WARNING] An error has occurred!*\n";
            msg.text += `Error: ${error.response.body.error_code}\n`;
            msg.text += `Description: ${error.response.body.description}`;
            msg.text += `\n\n${this.config.text["EXT-TELBOT_HELPER_SERVED"]}`;
            this.say(msg, true);
          }
          break;
      }
    });
    this.TB.on("message", (msg) =>{
      this.processMessage(msg);
    });
  },

  screenshot (sessionId = null, callback=null) {
    var shotDir = this.lib.path.resolve(__dirname, "./screenshot");
    var timestamp = this.timeStamp();
    var filePath = `${shotDir}/screenshot_${timestamp}.png`;
    var t = new this.lib.moment();
    var command = `scrot -o -q 100 ${filePath}`;
    var retObj = {
      session: sessionId,
      timestamp: t.format(this.config.dateFormat),
      path: filePath,
      result: "",
      status: false
    };
    /* eslint-disable no-param-reassign */
    if (callback === null) {
      callback = (ret, session) => {
        if (ret.length > 3000) {
          ret = `${ret.slice(0, 3000)} ...`;
        }
        retObj.ret = ret;
        this.sendSocketNotification("SCREENSHOT_RESULT", retObj);
      };
    }
    /* eslint-enable no-param-reassign */
    log("[SCREENSHOT] SCREENSHOT:", command);
    this.lib.child_process.exec(command, (error, stdout, stderr) => {
      var result = stdout;
      if (error) {
        retObj.result = error.message;
        result = error.message;
        log("[SCREENSHOT] SCREENSHOT RESULT:", error.message);
      } else {
        retObj.status = true;
        log("[SCREENSHOT] SCREENSHOT RESULT: Ok");
      }
      callback(result, sessionId);
    });
  },

  timeStamp () {
    var now = new Date(Date.now());
    var date = [ now.getFullYear(), now.getMonth() + 1, now.getDate() ];
    var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
    for (var i = 0; i < 3; i++ ) {
      if (time[i] < 10) {
        time[i] = `0${time[i]}`;
      }
      if (date[i] < 10) {
        date[i] = `0${date[i]}`;
      }
    }
    return `${date.join("")}-${time.join(":")}`;
  },

  processMessage (msg) {
    var time = this.lib.moment.unix(msg.date);
    if (this.startTime.isAfter(time)) return; //do nothing
    var commandLike = (msg.text) ? msg.text : ((msg.caption) ? msg.caption : "");
    if (commandLike.indexOf("/") === 0) {
      //commandLike
      if (!this.allowed.has(msg.from.username)) {
        const notAllowedMsg = (messageid, chatid) => {
          var text = this.config.text["EXT-TELBOT_HELPER_NOT_ALLOWED"];
          var msg = {
            type: "TEXT",
            chat_id: chatid,
            text: text,
            option: {
              reply_to_message_id: messageid,
              disable_notification: false,
              parse_mode: "Markdown"
            }
          };
          return msg;
        };
        this.say(notAllowedMsg(msg.message_id, msg.chat.id));
        
      } else {
        msg.text = commandLike;
        this.sendSocketNotification("COMMAND", msg);
      }
    } else {
      // Not commandlike
      if (msg.reply_to_message) {
        var reply = msg.reply_to_message.message_id;
        var foundSession = 0;
        this.askSession.forEach((s) => {
          if(s.messageId === reply) {
            foundSession = 1;
            msg.sessionId = s.sessionId;
            this.sendSocketNotification("ANSWER", msg);
            this.askSession.delete(s);
            return;
          }
          if (this.lib.moment.unix(s.time).isBefore(this.lib.moment().add(-1, "hours"))) {
            this.askSession.delete(s);
          }
        });
        if (foundSession === 1) return;
        if (msg.reply_to_message.from.is_bot) return; // Don't transfer reply for Robot.
      }
      // Not answer for Bot
      if (!this.config.telecast) return;
      if (String(this.config.telecast) === String(msg.chat.id) || this.allowed.has(msg.from.username)) {
        this.processTelecast(msg);
      }
    }
  },

  async cookMsg (msg, callback=(retmsg)=>{}) {
    var fromUserId = msg.from.id;
    const clearCache = (life)=>{
      return new Promise ((resolve)=>{
        try {
          log("[MESSAGER] Clearing old cache data");
          var cacheDir = this.lib.path.resolve(__dirname, "./cache");
          var files = this.lib.fs.readdirSync(cacheDir);
          for (var f of files) {
            var p = this.lib.path.join(cacheDir, f);
            var stat = this.lib.fs.statSync(p);
            var now = new Date(Date.now()).getTime();
            var endTime = new Date(stat.ctime).getTime() + life;
            if (now > endTime) {
              log("[MESSAGER] Unlink old cache file:", p);
              this.lib.fs.unlinkSync(p);
            }
          }
          resolve(true);
        } catch (e){
          resolve(e);
        }
      });
    };
    const downloadFile = (url, filepath)=>{
      return new Promise((resolve)=>{
        var f = this.lib.fs.createWriteStream(filepath);
        f.on("finish", () => {
          f.close();
          resolve(filepath);
        });
        const request = this.lib.https.get(url, (response) => {
          response.pipe(f);
        });
      });
    };
    const processProfilePhoto = async ()=>{
      var upp = await this.TB.getUserProfilePhotos(fromUserId, { offset:0, limit:1 });
      if (!(upp && upp.total_count)) return null;
      var file = this.lib.path.resolve(__dirname, "./cache", String(fromUserId));
      if (this.lib.fs.existsSync(file)) return fromUserId;
      var photo = upp.photos[0][0];
      var link = await this.TB.getFileLink(photo.file_id);
      await downloadFile(link, file);
      return fromUserId;
    };
    const processChatPhoto = async (fileArray) => {
      var bigger = fileArray.reduce((p, v)=>{
        return (p.file_size > v.file_size ? p : v);
      });
      var fileId = bigger.file_id;
      var link = await this.TB.getFileLink(fileId);
      var file = this.lib.path.resolve(__dirname, "./cache", String(bigger.file_unique_id));
      await downloadFile(link, file);
      return bigger.file_unique_id;
    };

    const processChatSticker = async (sticker) => {
      var fileId = sticker.thumb.file_id;
      var link = await this.TB.getFileLink(fileId);
      var file = this.lib.path.resolve(__dirname, "./cache", String(sticker.thumb.file_unique_id));
      await downloadFile(link, file);
      return sticker.thumb.file_unique_id;
    };

    const processChatAnimated = async (animation) => {
      var fileId = animation.file_id;
      var link = await this.TB.getFileLink(fileId);
      var file = this.lib.path.resolve(__dirname, "./cache", String(animation.file_unique_id));
      await downloadFile(link, file);
      return animation.file_unique_id;
    };

    const processChatAudio = async (audio) => {
      var fileId = audio.file_id;
      var link = await this.TB.getFileLink(fileId);
      var file = this.lib.path.resolve(__dirname, "./cache", String(audio.file_unique_id));
      await downloadFile(link, file);
      return audio.file_unique_id;
    };

    var r = await clearCache(this.config.telecastLife);
    if (r instanceof Error) log ("[MESSAGER]", r);
    var profilePhoto = await processProfilePhoto();
    if (profilePhoto) msg.from["_photo"] = String(profilePhoto);
    if (msg.hasOwnProperty("photo") && Array.isArray(msg.photo)) {
      if (msg.caption) msg.text = msg.caption;
      msg.chat["_photo"] = String(await processChatPhoto(msg.photo));
    }
    if (msg.hasOwnProperty("sticker")) { // pass sticker as photo
      msg.chat["_photo"] = String(await processChatSticker(msg.sticker));
    }
    if (msg.hasOwnProperty("animation")) { // pass animation as video
      msg.chat["_video"] = String(await processChatAnimated(msg.animation));
    }
    if (msg.hasOwnProperty("audio")) {
      msg.chat["_audio"] = String(await processChatAudio(msg.audio));
    }

    if (msg.hasOwnProperty("voice")) {
      msg.chat["_voice"] = String(await processChatAudio(msg.voice));
    }

    callback(msg);
  },

  say (r, adminMode=false) {
    var chatId = (adminMode) ? this.adminChatId : r.chat_id;
    if (!this.TB.isPolling() || !chatId) return;
    switch(r.type) {
      case "VOICE_PATH":
        var data = this.lib.fs.readFileSync(r.path);
        this.TB.sendVoice(chatId, data, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "VOICE_URL":
        this.TB.sendVoice(chatId, r.path, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "VIDEO_PATH":
        var data = this.lib.fs.readFileSync(r.path);
        this.TB.sendVideo(chatId, data, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "VIDEO_URL":
        this.TB.sendVideo(chatId, r.path, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "DOCUMENT_PATH":
        var data = this.lib.fs.readFileSync(r.path);
        this.TB.sendDocument(chatId, data, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "DOCUMENT_URL":
        this.TB.sendDocument(chatId, r.path, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "PHOTO_PATH":
        var data = this.lib.fs.readFileSync(r.path);
        this.TB.sendPhoto(chatId, data, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "PHOTO_URL":
        this.TB.sendPhoto(chatId, r.path, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "AUDIO_PATH":
        var data = this.lib.fs.readFileSync(r.path);
        this.TB.sendAudio(chatId, data, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "AUDIO_URL":
        this.TB.sendAudio(chatId, r.path, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "LOCATION":
        this.TB.sendLocation(chatId, r.latitude, r.longitude, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "VENUE":
        this.TB.sendVenue(chatId, r.latitude, r.longitude, r.title, r.address, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "CONTACT":
        this.TB.sendContact(chatId, r.phoneNumber, r.firstName, r.option).catch((e) => {this.onError(e, r);});
        break;
      case "TEXT":
      default:
        this.TB.sendMessage(chatId, r.text, r.option).catch((e) => {this.onError(e, r);});
        break;
    }
  },

  ask (r, adminMode=false) {
    var chatId = (adminMode) ? this.adminChatId : r.chat_id;
    var sessionId = r.askSession.session_id;

    switch(r.type) {
      case "TEXT":
        this.TB.sendMessage(chatId, r.text, r.option)
          .then((ret)=> {
            this.askSession.add({
              sessionId: sessionId,
              messageId: ret.message_id,
              time: this.lib.moment().format("X")
            });
          })
          .catch((e) => {this.onError(e, r);});
        break;
    }
  },

  welcomeMsg () {
    var text = `*${  this.config.text["EXT-TELBOT_HELPER_WAKEUP"]  }*\n${
      this.config.text["EXT-TELBOT_HELPER_RESTART"]
    }\n\`${  this.startTime.format(this.config.dateFormat)  }\`\n`;
    var msg = {
      type: "TEXT",
      chat_id: this.adminChatId,
      text: text,
      option: {
        disable_notification: false,
        parse_mode: "Markdown"
      }
    };
    return msg;
  },

  onError (err, response) {
    if (!this.TB.isPolling()) return;
    if (typeof err.response !== "undefined") {
      console.log("[TELBOT] ERROR" , err.response.body);
    } else {
      console.log("[TELBOT] ERROR", err.code);
    }

    if (err.code !== "EFATAL") {
      var text = "`ERROR`\n"
        + `\`\`\`\n${
          (err.response) ? err.response.body.description : "??"
        }\n\`\`\`\n`
        + "at\n"
        + `\`\`\`\n${
          JSON.stringify(response)
        }\n\`\`\``;
      var msg = {
        type: "TEXT",
        text: text,
        option: {
          disable_notification: false,
          parse_mode: "Markdown"
        }
      };
      this.say(msg, true);
    }
  },

  shell (command) {
    log("SHELL:", command);
    this.lib.child_process.exec(command, (error, stdout, stderr) => {
      var result = stdout;
      if (error) { result = error.message; }
      log("SHELL RESULT:", result);
    });
  },

  processTelecast (msg) {
    this.cookMsg(msg, (message)=>{
      this.sendSocketNotification("CHAT", message);
    });
  }
});
