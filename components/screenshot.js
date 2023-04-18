/** take a shoot **/
var log = (...args) => { /* do nothing */ }

function scrot(that, sessionId = null, callback=null) {
  if (that.config.debug) log = (...args) => { console.log("[TELBOT] [SCREENSHOT]", ...args) }
  var shotDir = that.lib.path.resolve(__dirname, "../screenshot")
  var command = "scrot -o " + shotDir + "/screenshot.png"
  var t = new that.lib.moment()
  var retObj = {
    session: sessionId,
    timestamp: t.format(that.config.dateFormat),
    path: shotDir + "/screenshot.png",
    result: "",
    status: false
  }
  if (callback == null) {
    callback = (ret, session) => {
      if (ret.length > 3000) {
        ret = ret.slice(0, 3000) + " ..."
      }
      retObj.ret = ret
      that.sendSocketNotification("SCREENSHOT_RESULT", retObj)
    }
  }
  log("SCREENSHOT:", command)
  that.lib.child_process.exec(command, (error, stdout, stderr) => {
    var result = stdout
    if (error) {
      retObj.result = error.message
      result = error.message
      log("SCREENSHOT RESULT:", error.message)
    } else {
      retObj.status = true
      log("SCREENSHOT RESULT: Ok")
    }
    callback(result, sessionId)
  })
}

exports.scrot = scrot
