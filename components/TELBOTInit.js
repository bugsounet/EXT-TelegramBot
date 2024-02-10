class TELBOTInit {
  constructor(){
    console.log("[TELBOT] TELBOTInit Ready")
  }

  init(that){
    MM.getModules().enumerate(m=>{
      if ("EXT-TelegramBot"!==m.name && (m.name.startsWith("EXT-")||"MMM-GoogleAssistant"===m.name) && typeof m.EXT_TELBOTCommands == "function"){
        var tc=m.EXT_TELBOTCommands(new TelegramBotCommandRegister(m,that.TELBOTRegister.registerCommand.bind(that)));
        Array.isArray(tc)&&tc.forEach(c=>{
          that.TELBOTCmds.registerCommand(m,c)
        })
      }
    })
  }
}
