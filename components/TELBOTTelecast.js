/** Register commands **/

class TELBOTTelecast {
  constructor () {
    console.log("|TELBOT] TELBOTTelecast Ready")
  }

  getTelecastDom(that) {
    var dom = document.createElement("div")
    dom.classList.add("container")
    var anchor = document.createElement("div")
    anchor.id = "EXT-TELBOT_ANCHOR"
    dom.appendChild(anchor)
    if (that.config.telecastHideOverflow) dom.classList.add("telecastHideOverflow")
    for (var c of that.chats) {
      that.appendTelecastChat(dom, c)
    }
    return dom
  }

  appendTelecastChat(that, parent, c) {
    const getImageURL = (id)=>{
      return "/modules/EXT-TelegramBot/cache/" + id
    }
    var anchor = parent.querySelector("#EXT-TELBOT_ANCHOR")
    var chat = document.createElement("div")
    chat.classList.add("chat")
    var from = document.createElement("div")
    from.classList.add("from")
    var profile = document.createElement("div")
    profile.classList.add("profile")
    if (c.from._photo) {
      let profileImage = document.createElement("img")
      profileImage.classList.add("profileImage")
      profileImage.src = getImageURL(c.from._photo)
      profile.appendChild(profileImage)
    } else {
      let altName = ""
      if (c.from.first_name) altName += c.from.first_name.substring(0, 1)
      if (c.from.last_name) altName += c.from.last_name.substring(0, 1)
      if (!altName) altName += c.from.username.substring(0, 2)
      let rr = c.from.id % 360
      var hsl = `hsl(${rr}, 75%, 50%)`
      //profile.style.backgroundColor = "hsl(${rr}, 100%, 50%)"
      profile.style.backgroundColor = hsl
      profile.innerHTML = altName
    }
    from.appendChild(profile)
    chat.appendChild(from)
    var message = document.createElement("div")
    message.classList.add("message")
    var bubble = document.createElement("div")
    bubble.classList.add("bubble")
    //reply
    if (c.chat._photo) {
      var photo = document.createElement("div")
      photo.classList.add("photo")
      var background = document.createElement("div")
      background.classList.add("background")
      background.style.backgroundImage = `url(${getImageURL(c.chat._photo)})`
      photo.appendChild(background)
      var imageContainer = document.createElement("div")
      imageContainer.classList.add("imageContainer")
      var photoImage = document.createElement("img")
      photoImage.classList.add("photoImage")
      photoImage.src = getImageURL(c.chat._photo)
      photoImage.onload = ()=>{
        anchor.scrollIntoView(false)
      }
      imageContainer.appendChild(photoImage)
      photo.appendChild(imageContainer)
      bubble.appendChild(photo)
    }
    if (c.chat._video) {
      var video = document.createElement("video")
      video.classList.add("video")
      video.autoplay = true
      video.loop = true
      video.src = getImageURL(c.chat._video)
      video.addEventListener('loadeddata', () => {
          anchor.scrollIntoView(false)
      }, false)
      video.addEventListener("error", (e) => {
         delete c.chat._video
         c.text = "Video Error!"
         this.updateDom()
      }, false)
      bubble.appendChild(video)
    }

    if (c.text) {
      var text = document.createElement("div")
      text.classList.add("text")
      text.innerHTML = c.text
      bubble.appendChild(text)
    }

    if (c.chat._audio) {
      var text = document.createElement("div")
      text.classList.add("text")
      var audio = new Audio(getImageURL(c.chat._audio))
      audio.volume = 0.6
      audio.play()
      text.innerHTML = c.title ? c.title: (c.caption ? c.caption :"Audio")
      bubble.appendChild(text)
    }

    if (c.chat._voice) {
      var text = document.createElement("div")
      text.classList.add("text")
      var voice = new Audio(getImageURL(c.chat._voice))
      voice.volume = 1.0
      voice.play()
      text.innerHTML = "Voice"
      bubble.appendChild(text)
    }

    message.appendChild(bubble)
    chat.appendChild(message)
    chat.timer = setTimeout(()=>{
      parent.removeChild(chat)
    }, that.config.telecastLife)
    parent.insertBefore(chat, anchor)
  }

  telecast(that, msgObj) {
    if (!that.config.telecast) return
    if (!msgObj.text && !msgObj.photo && !msgObj.sticker && !msgObj.animation && !msgObj.audio && !msgObj.voice) return
    if (that.config.useSoundNotification) that.sound.src = "modules/EXT-TelegramBot/resources/msg_incoming.mp3"
    while (that.chats.length >= that.config.telecastLimit) {
      that.chats.shift()
    }
    that.chats.push(msgObj)
    var dom = document.querySelector("#EXT-TELBOT .container")

    while(dom.childNodes.length >= that.config.telecastLimit + 1) {
      if (dom.firstChild.id !== "EXT-TELBOT_ANCHOR") dom.removeChild(dom.firstChild)
    }
    this.appendTelecastChat(that, dom, msgObj)
    that.sendNotification("EXT-TELBOT_TELECAST", msgObj)
    var dom = document.querySelector("#EXT-TELBOT .container")
    var anchor = document.querySelector("#EXT-TELBOT_ANCHOR")
    anchor.scrollIntoView(false)
  }
}
