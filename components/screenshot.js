/** take a shoot **/
var log = (...args) => { /* do nothing */ }

function scrot(that, sessionId = null, callback=null) {
  var shotDir = path.resolve(__dirname, "screenshot")
  var command = "scrot -o " + shotDir + "/screenshot.png"
  var t = new moment()
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
  exec(command, function(error, stdout, stderr){
    var result = stdout
    if (error) {
      retObj.result = error.message
      result = error.message
    } else {
      retObj.status = true
    }
    log("SCREENSHOT RESULT:", result)
    callback(result, sessionId)
  })
}

exports.scrot = scrot
