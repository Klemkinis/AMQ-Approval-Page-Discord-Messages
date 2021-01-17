// ==UserScript==
// @name         AMQ approval discord bot
// @version      0.3.4
// @match        https://animemusicquiz.com/admin/approveVideos
// @match        https://animemusicquiz.com/admin/approveVideos?skipMp3=true
// @run-at: document-end
// ==/UserScript==

var currentAPIKey
var approvedSongEndpoint
var declinedSongEndpoint
setup()

function setup() {
    currentAPIKey = getAPIKey()
    if (currentAPIKey == null) {
        throw "Missing api key configuration!"
        return
    }

    approvedSongEndpoint = getApprovedSongEndpoint()
    if (approvedSongEndpoint == null) {
        throw "Missing endpoint configuration!"
        return
    }

    declinedSongEndpoint = getDeclinedSongEndpoint()
    if (declinedSongEndpoint == null) {
        throw "Missing endpoint configuration!"
        return
    }

    setupDiscordToggle()
    setupReUploadToggle()
    setupApproveConfirmationAction()
    setupDeclineConfirmationAction()
}

function setupApproveConfirmationAction() {
    var approveButton = document.getElementsByClassName('btn btn-default')[7]
    if (approveButton == null) {
        approveButton = document.getElementsByClassName('btn btn-default')[0]
    }

    if ((approveButton == null) || (approveButton.innerHTML != "Approve")) {
        return
    }

    approveButton.onclick = confirmApproval
}

function setupDeclineConfirmationAction() {
    var declineButton = document.getElementsByClassName('btn btn-default')[8]
    if (declineButton == null) {
        declineButton = document.getElementsByClassName('btn btn-default')[1]
    }

    if ((declineButton == null) || (declineButton.innerHTML != "Decline")) {
        return
    }

    declineButton.onclick = declineApproval
}

function setupDiscordToggle() {
    createToggle("discordToggle", "Post on Discord", true)
}

function setupReUploadToggle() {
    createToggle("reUploadToggle", "Is Re-Upload?", false)
}

function createToggle(id, title, isChecked) {
    var toggleContainer = getToggleContainer()
    var toggle = document.createElement("input")
    toggle.id = id
    toggle.type = "checkbox"
    toggle.style.margin = "5px"
    toggle.checked = isChecked

    var label = document.createElement("label")
    label.style.color = "inherit"
    label.innerHTML = title

    toggleContainer.appendChild(toggle)
    toggleContainer.appendChild(label)
}

function getToggleContainer() {
    var toggleContainer = document.getElementById("toggleContainer")
    if (toggleContainer != null) {
        return toggleContainer
    }

    var toggleParent = getVideoPlayer().parentElement
    if (toggleParent.children.length <= 1) {
        toggleParent = toggleParent.parentElement
    }

    toggleContainer = document.createElement("div")
    toggleContainer.id = "toggleContainer"
    toggleContainer.style.textAlign = "center"

    toggleParent.appendChild(toggleContainer)
    return toggleContainer
}

// Button actions
function confirmApproval() {
    var didConfirmApproval = confirm("Approve video??")
    if (didConfirmApproval == false) {
        return false
    }

    sendApprovedSongRequest()
}

function approveSong() {
    window.location = '/admin/approveVideos/approve'
}

function declineApproval() {
    let reason = prompt('Decline Reason?')
    if ((reason == null) || (reason == "")) {
        return
    }

    sendDeclinedSongRequest(reason)
}

function declineSong(reason) {
    window.location = '/admin/approveVideos/decline?reason=' + reason
}

// Requests
function sendDeclinedSongRequest(reason) {
    if (getDiscordToggle().checked == false) {
        declineSong(reason)
        return
    }

    var songLink = getSongLink()
    if (isVideoLinkFromCatbox(songLink) == false) {
        declineSong(reason)
        return
    }

    var requestURL =
        declinedSongEndpoint +
        "?songLink=" + songLink +
        "?apiKey=" + currentAPIKey

    var request = new XMLHttpRequest()
    request.open("POST", requestURL, true)
    request.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) {
            return
        }
        declineSong(reason)
    }

    request.send()
}

function sendApprovedSongRequest() {
    if (getDiscordToggle().checked == false) {
        approveSong()
        return
    }

    var songInfoTableBody = getSongInfoTable().children[0]
    if (songInfoTableBody == null) {
        approveSong()
        throw "Song info table is missing data!"
    }

    var animeTitle = encodeURIComponent(songInfoTableBody.children[0].children[1].innerText)
    var songTitle = encodeURIComponent(songInfoTableBody.children[1].children[1].innerText)
    var artist = encodeURIComponent(songInfoTableBody.children[2].children[1].innerText)
    var songType = encodeURIComponent(songInfoTableBody.children[3].children[1].innerText)
    var songLink = encodeURIComponent(songInfoTableBody.children[4].children[1].innerText)
    var uploader = encodeURIComponent(songInfoTableBody.children[5].children[1].innerText)
    var annId = encodeURIComponent(songInfoTableBody.children[0].children[1].children[0].href.split("php?id=")[1])

    var rescaleType = rescaleTypeFromApprovalsPage()

    var requestURL =
        approvedSongEndpoint +
        "?animeTitle=" + animeTitle +
        "?songTitle=" + songTitle +
        "?artist=" + artist +
        "?songType=" + songType +
        "?songLink=" + songLink +
        "?rescaleType=" + rescaleType +
        "?uploader=" + uploader +
        "?annId=" + annId +
        "?apiKey=" + currentAPIKey

    var request = new XMLHttpRequest()
    request.open("POST", requestURL, true)
    request.onreadystatechange = function() {
        if (this.readyState != 4 || this.status != 200) {
            return
        }
        approveSong()
    }

    request.send()
}

// Configuration
function getAPIKey() {
    var cookieKey = "apiKey"
    var cookieList = document.cookie.split(";")
    var cookie = cookieList.find(function(cookie) {
        return cookie.includes(cookieKey)
    })

    if (cookie == null) {
        return null
    }

    var cookieValue = cookie.substring(cookieKey.length + 1)
    return cookieValue
}

function getApprovedSongEndpoint() {
    var cookieKey = "approvedSongEndpoint"
    var cookieList = document.cookie.split(";")
    var cookie = cookieList.find(function(cookie) {
        return cookie.includes(cookieKey)
    })

    if (cookie == null) {
        return null
    }

    var cookieValue = cookie.substring(cookieKey.length + 2)
    return cookieValue
}

function getDeclinedSongEndpoint() {
    var cookieKey = "declinedSongEndpoint"
    var cookieList = document.cookie.split(";")
    var cookie = cookieList.find(function(cookie) {
        return cookie.includes(cookieKey)
    })

    if (cookie == null) {
        return null
    }

    var cookieValue = cookie.substring(cookieKey.length + 2)
    return cookieValue
}

// HTML elements
function getVideoPlayer() {
    var videoPlayer = document.getElementById("avVideo")
    if (videoPlayer == null) {
        throw "Video player is missing or not loaded"
    }
    return videoPlayer
}

function getSongLink() {
	var videoPlayer = getVideoPlayer()
    return videoPlayer.src
}

function getSongInfoTable() {
    var songInfoTable = document.getElementsByClassName('table')[0]
    if (songInfoTable == null) {
        throw "Song info table is missing!"
    }
    return songInfoTable
}

function getRescaleTable() {
    var rescaleTable = document.getElementsByClassName('table')[1]
    if (rescaleTable == null) {
        throw "Rescale table is missing!"
    }
    return rescaleTable
}

function getDiscordToggle() {
    var discordToggle = document.getElementById("discordToggle")
    if (discordToggle == null) {
        throw "Discord toggle is missing!"
    }
    return discordToggle
}

function getReUploadToggle() {
    var reUploadToggle = document.getElementById("reUploadToggle")
    if (reUploadToggle == null) {
        throw "Re-Upload toggle is missing!"
    }
    return reUploadToggle
}

// Video resolution
function rescaleTypeFromApprovalsPage() {

    let currentUploadResolution = getSongInfoTable().children[0].children[6].children[1].innerHTML
    var rescaleTableRows = getRescaleTable().children[0]
    var isReUpload = getReUploadToggle().checked

    if (rescaleTableRows.childElementCount == 1) {
        if (isReUpload) {
            return "reUpload"
        } else {
           return "newUpload"
        }
    }

    if (rescaleTableRows.childElementCount == 2) {
        let rescaleResolution = parseInt(rescaleTableRows.children[1].children[0].innerHTML)
        let rescaleLink = rescaleTableRows.children[1].children[1].innerHTML

        if (rescaleResolution == 0) {
            return "wasOnlyMp3"
        }

        if ((rescaleResolution > 720) && (isVideoLinkOpeningsOrAnimethemes(rescaleLink) == false)) {
            return "wasOnly1080"
        }
    }

    if (rescaleTableRows.childElementCount == 3) {
        let firstRescaleResolution = parseInt(rescaleTableRows.children[1].children[0].innerHTML)
        let firstRescaleLink = rescaleTableRows.children[1].children[1].innerHTML

        let secondRescaleResolution = parseInt(rescaleTableRows.children[2].children[0].innerHTML)
        let secondRescaleLink = rescaleTableRows.children[2].children[1].innerHTML

        if ((firstRescaleResolution == 0) && (secondRescaleResolution > 720) && (isVideoLinkOpeningsOrAnimethemes(secondRescaleLink) == false)) {
            return "wasOnlyMp3"
        }

        if ((secondRescaleResolution == 0) && (firstRescaleResolution > 720) && (isVideoLinkOpeningsOrAnimethemes(firstRescaleLink) == false)) {
            return "wasOnlyMp3"
        }
    }

    if (currentUploadResolution == "mp3") {
        return "regularMp3"
    }

    if (parseInt(currentUploadResolution) <= 480) {
        return "regular480"
    }

    return "regular720"
}

// Video link type
function isVideoLinkOpeningsOrAnimethemes(videoLink) {
    return (isVideoLinkFromAnimeThemes(videoLink) || isVideoLinkFromOpeningsMoe(videoLink))
}

function isVideoLinkFromCatbox(videoLink) {
    return (videoLink.indexOf("catbox") != -1)
}

function isVideoLinkFromAnimeThemes(videoLink) {
    return (videoLink.indexOf("animethemes") != -1)
}

function isVideoLinkFromOpeningsMoe(videoLink) {
    return (videoLink.indexOf("openings") == -1)
}
