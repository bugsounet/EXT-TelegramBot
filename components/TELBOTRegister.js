/** Register commands **/

class TELBOTRegister {
  constructor () {
    console.log("|TELBOT] TELBOTRegister Ready")
  }

  registerCommand(module, commandObj) {
    var c = commandObj
    var command = c.command
    var moduleName = module.name
    var callback = ((c.callback) ? (c.callback) : 'notificationReceived')
    if (typeof callback !== "function") {
      if (typeof module[callback] !== 'function') return false
    }
    var isNameUsed = 1
    var idx = 0
    for (var j in this.commands) {
      var sameCommand = this.commands.filter(function(com) {
        if (com.command == command) return com
      })
      if (sameCommand.length > 0) {
        isNameUsed = 1
        command = c.command + idx
        idx++
      } else {
        isNameUsed = 0
      }
    }
    var cObj = {
      command : command,
      execute : c.command,
      moduleName : module.name,
      module : module,
      description: c.description,
      callback : callback,
      argsPattern : c.args_pattern,
      argsMapping : c.args_mapping,
    }
    this.commands.push(cObj)
    return true
  }
}
  
