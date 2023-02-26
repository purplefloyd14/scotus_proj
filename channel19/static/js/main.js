var mapPeers = {};
//       mapPeers is a dict: Key is a peerUsername and the value is a list: [RTCPeerConnection, RTCDataChannel]
//        { 'Paul': [RTCPeerConnection, RTCDataChannel],
//          'George':  [RTCPeerConnection, RTCDataChannel],
//        }
var peerTrack = {};
var peerTrackDirectConnection = {};
var currentBaseUrl = 'https://5c90-45-85-144-68.ngrok.io'

var labelUsername = document.querySelector("#label-username");
var usernameInput = document.querySelector("#username");
var userCount = document.getElementById("connected-user-count-db");
var userCountJS = document.getElementById("connected-user-count-js")
var userCountJS2 = document.getElementById("connected-user-count-js-2")
var homeBtn = document.getElementById('home-btn');
var userCountDC = document.getElementById("connected-user-count-dc")
var roomName = document.getElementById('room-name');
var expiryOG = document.getElementById("original-expiry");
var newEntrantAlert = document.getElementById("alert-input");
var currentRoomUuid = window.location.href.slice(-6);
var talkingNow = false;
var sendingActively = false; 
var newPeerSignalButton = document.getElementById('new-peer-button');
var newPeerSound = document.getElementById("new-peer-joining-sound");
var disconnectBtn = document.getElementById("btn-disconnect");
var mainLogoImage = document.getElementById('main-logo-image');
var timeElement = document.getElementById("time-now");
var difference = document.getElementById("diff-now");
var toggleChatInput = document.getElementById("toggle-chat-input");
var chatItself = document.getElementById("chat-main");
const notificationSound = document.getElementById("notification-sound");
var wholePage = document.getElementById('whole-page');


wholePage.classList.add('no-overflow');

var heartbeatCheckObj = {
    "logging": false,
    "heartbeatFrequency": 1000, //how often to send the pulse | 1000 = 1 second
    "staleThreashold": 4, // after how long w/out pulse are you considered dead? | 3 = 3 seconds
    "updateChecker": 500 //how often are we checking for dead people and removing them 
}

var iceConfig = { 
    
    iceServers: [
    {
        urls: "stun:stun.l.google.com:19302"
    },
    {
        urls: "turn:relay.metered.ca:80",
        username: "b1887ca5572e1e4e59cbf558",
        credential: "ittq9D45Yd+SuGdn"
    }
    ]
  };

var xhttp = new XMLHttpRequest();
var btnGetData = document.querySelector("#btn-get-active")
var username;
var webSocket; 
var secondsToDeath; 
var originalTimeToDeath;
var timeAtPageLoad;



newEntrantAlert.addEventListener('click', toggleAlert);


function toggleChat() {
    console.log('in here')
    chatItself.classList.toggle("hidden");
    chatItself.classList.toggle("showing");
    wholePage.classList.toggle("no-overflow")
}
  
toggleChatInput.addEventListener("click", toggleChat);
toggleChatInput.removeEventListener("click", toggleChat);
toggleChatInput.addEventListener("click", toggleChat);







function toggleAlert(){
    console.log("clicking")
    if (newEntrantAlert.hasAttribute('checked')){
        console.log("has checked")
        newEntrantAlert.removeAttribute('checked');
    } else {
        console.log("not checked")
        newEntrantAlert.setAttribute("checked", 'true');
    }
}

function webSocketOnMessage(event){
    // console.log('in on messsage');
    var parsedData = JSON.parse(event.data);
    var peerUsername = parsedData['peer']; //who is the message from 
    var action = parsedData['action']; //what is the action at issue
    

    //this message is relayed to every peer on the group, so we end up receiving our own messages
    //in order to account for this, we return if we are the peer in the message (we are receiving our own letter)
    //in practice, this should really be handled on the back end, TODO 
    //see tutorial at 1:06:00
    if(username == peerUsername){
        console.log(`We (${username}) sent out: ${action} and we are receiving our own message echoed back`);
        return;
    }
    
    var receiverChannelName = parsedData['message']['receiver_channel_name'];
    console.log(`${username}'s Receiver Channel Name is: ${receiverChannelName}`);

    if(action=='new-peer'){ //everyone sends this when they show up. received by oldies when newbie arrives 
        console.log(`We (${username}) just got a message with Action: ${action} From: ${peerUsername} - we are going to create an Offer`);
        createOfferer(peerUsername, receiverChannelName);
        return;
    }

    if(action == 'new-offer'){ //received by newbie from oldie
        console.log(`We (${username}) just got a message with Action: ${action} From: ${peerUsername} - we are going to create an Answer`);
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiverChannelName);
        getCreatedDate(); //when you are an answerer you should go fetch the time from the DB again (handles case where user navigated away and then pressed 'back' on browser)
        return;
    }

    if(action=='new-answer'){ //received by oldie, a response from the newbie they invited 
        console.log(`We (${username}) just got a message with Action: ${action} From: ${peerUsername} - we are going to set a Remote Description for them.`);
        var answer = parsedData['message']['sdp'];
        var connectionToPeer = mapPeers[peerUsername][0]; //give us the rtcConnection object associated with the sender's username
        connectionToPeer.setRemoteDescription(answer);
        console.log(`Offerer: ${username} has set a remote description for Answerer:${peerUsername}. Next Stop: Connection open.`);
        return;
    }

    if(action=='heartbeat'){ //Websockets heartbeat: depricated in favor of RTC heartbeat (p2p is cheaper)
        peerTrack[peerUsername] = parsedData['message']['time']; 
        //update peertrack dict with username as key and current time as value
        //probably not going to be used if I can get it to work p2p instead (saves server calls)
        return;
    }


}

function calculateCountdown(seconds) {
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    if (hours > 0) { 
        minutes -= 60*hours;
    }
    var secs = seconds % 60;
    var paddedHours = hours.toString().padStart(2, "0");
    var paddedMinutes = minutes.toString().padStart(2, "0");
    var paddedSecs = secs.toString().padStart(2, "0");
    return `${paddedHours}:${paddedMinutes}:${paddedSecs}`; 
}


function getCreatedDate(){ //this is fired once at the beginning by createConnectedTalker
    expiryClock = document.getElementById('expiry_clock');
    xhttp.open('GET', `${currentBaseUrl}/cb/${currentRoomUuid}/get_seconds_to_expiry`, false);
    xhttp.send();
    var response = JSON.parse(xhttp.responseText);
    timeAtPageLoad =  Math.floor(Date.now()/1000); //Date.now returns milliseconds, so /1000 to get seconds
    secondsToDeath = response.seconds_to_expiry; //this is coming from the DB, time remaining in room at the time we connected to it
    originalTimeToDeath = response.seconds_to_expiry; // we set original time to death because this is how we know how long it has been since the page loaded
    t3=setInterval(updateCountdown, 1000);
}

function updateCountdown(){
    var timeRightNow =  Math.floor(Date.now()/1000); //Date.now returns milliseconds, so div by 1000 to get seconds
    var timeElapsed = Math.abs(timeAtPageLoad-timeRightNow); //find elapsed time by comparing time.now to time.now when script loaded
    secondsToDeath = originalTimeToDeath - timeElapsed; //seconds left in timer. Calculated by original amount (from DB at page load) - time elapsed (from clock difference)
    properTime = calculateCountdown(secondsToDeath); //get the time remaining formated like: 00:00:00
    expiryClock.innerHTML = properTime; 
    if (secondsToDeath === 0){
        window.location.reload();
    }
}


//queries the database for active talkers in a given room, takes the response, and populates userCount field with it 
function updateActiveTalkers(){
    xhttp.open('GET', `${currentBaseUrl}/cb/${currentRoomUuid}/get_active`, false);
    xhttp.send();
    numUsersConnected = JSON.parse(xhttp.responseText);
    userCount.innerHTML = numUsersConnected.talker_count;
}
setInterval(updateActiveTalkers, 1000);


function monitorMapPeers(){
    numConnectedUsers = Object.keys(mapPeers).length + 1;
    userCountJS.innerHTML = numConnectedUsers;
}
setInterval(monitorMapPeers, 2000);




function monitorPeerTrackDirectConnection(){
    //this function monitors the peerTrackDirectConnection dict, removing entries older than X seconds (as determined by heartbeatCheckObj['staleThreashold'])
    for (let user in peerTrackDirectConnection) {
        if (peerTrackDirectConnection[user] > secondsToDeath + heartbeatCheckObj['staleThreashold']) { //if more than X seconds have passed since the heartbeat was sent from that user
            timeSincePulse = Math.abs(peerTrackDirectConnection[user] - secondsToDeath);
            console.log(`Removing user ${user} for staleness. The difference is: ${timeSincePulse} seconds`);
            delete peerTrackDirectConnection[user]; //delete that user 
            handleListItems(user, 'delete');
            console.log("Say goodbye to: " + user);
        } else {
            handleListItems(user, 'create');
        }
    }
    numConnectedUsers = Object.keys(peerTrackDirectConnection).length + 1; //add one to count self
    userCountDC.innerHTML = numConnectedUsers;
}

function handleListItems(user_with_salt, action){
    var user_for_display = user_with_salt.slice(0, -6);

    if (action === 'delete'){
        userListItem = document.getElementById(`${user_for_display}-li-active`);
        if (userListItem) {
            userListItem.remove();
        }
    }
    if (action === 'create'){
        if (!document.getElementById(`${user_for_display}-li-active`)){ //if a list element for this user does not exist 
            newUserLi = document.createElement('li');
            newUserLi.id = `${user_for_display}-li-active`;
            newUserLi.innerHTML=user_for_display;
            if(mapPeers[user_with_salt][2]==="self=offerer" && !document.getElementById(`${user_for_display}-li-active`) && newEntrantAlert.hasAttribute('checked')){
                console.log("playing it");
                newPeerSound.play();
            }
            listOfConnectedUsers = document.getElementById('connected-peer-list');
            listOfConnectedUsers.appendChild(newUserLi);
        }
    }
}


// var t1=setInterval(updateActiveTalkers,1000);
var t4=setInterval(monitorPeerTrackDirectConnection, heartbeatCheckObj['updateChecker']); //check the peerTrack dict and remove those who arent pinging us 


// do everything when the page loads, as opposed to when the user clicks on the join button 
//in this case, I have attached the method to the room name element. Can and probably should be changed 
// roomName.addEventListener("load", createConnectedTalker);

function getNewPublicUsername(roomID){
    xhttp.open('GET', `${currentBaseUrl}/cb/${roomID}/get_available_username`, false);
    xhttp.send();
    dataFromDB = JSON.parse(xhttp.responseText);
    var labelUsername = document.querySelector('#user-username');
    recommendedName = dataFromDB.recommended_name
    labelUsername.innerHTML = recommendedName;
    return dataFromDB.recommended_name;
}

//******************************************************************************************************************************************************
//******************************************************************************************************************************************************
//******************************************************************************************************************************************************
var localStream = new MediaStream();
const constraints = {
    audio: {
      volume: 0.8,
      autoGainControl: false,
      noiseSuppression: true,
      echoCancellation: true
    }, 
    video:false
  };
const localAudio = document.getElementById('local-audio');
const btnToggleAudio = document.querySelector('#btn-toggle-audio');



//this function is almost a direct copy of the joinBtn on click method that used to be here 
function createConnectedTalker(){

    getCreatedDate(); //grab the date from the backend and display the countdown timer

    currentRoomUuid = window.location.href.slice(-6);
    username = getNewPublicUsername(currentRoomUuid);
    var salt = Math.floor(100000 + Math.random() * 900000)
    username = username + salt
    console.log(`A new user is being born: ${username}`);
    
    //get room name from last 6 digits of url. can also get it 
    //from roomName.innerHTML, but one day roomName might not be displayed on the page 

    var loc = window.location;
    var wsStart = 'wss://';

    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localAudio.srcObject = localStream;
        localAudio.muted = true;
        console.log(`Creating Media Stream for: ${username}`);
        var audioTracks = localStream.getAudioTracks();

        audioTracks[0].enabled = true;

        // addTrackToConnections(audioTracks[0]);

        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;

            if(audioTracks[0].enabled){
                btnToggleAudio.innerHTML = "Mute Mic";
                mainLogoImage.src='../static/img/logo_white-min.png'
                return;
            }
            btnToggleAudio.innerHTML = "Unmute";
            mainLogoImage.src='../static/img/logo_white-red-min.png'
        });
    })
    .catch(error => {
        console.log('Error accessing media devices!', error);
    }).then(() =>{
        //go into the signaling stuff only after you have permissioned the media 
        var endPoint = wsStart + loc.host + loc.pathname + '/' + username;
        console.log("Websocket endpoint: ", endPoint);
        webSocket = new WebSocket(endPoint);

        webSocket.addEventListener('open', (e) => {
            console.log(`${username} <--> Server - Websocket Connection Opened!`); 
            sendSignal('new-peer', {}); //hey everybody - I am a new peer (this is the websockets implimentation which has been depricated)
        //     setInterval( function() { sendSignal("heartbeat", {
        //         'time': secondsToDeath, //send heartbeat signal from every peer every half second
        //     }); 
        // }, 500 );
        });
        webSocket.addEventListener('message', webSocketOnMessage);
        webSocket.addEventListener('close', (e) => {
            console.log('Connection Closed!'); 
        });
        webSocket.addEventListener('error', (e) => {
            console.log('Error Occurred!'); 
        });

        function sendNewPeerSignal(){ //just for fun. Obviously going to be changed. 
            sendSignal('new-peer', {});
        }

        newPeerSignalButton.addEventListener('click',sendNewPeerSignal);
        });

}




// const btnToggleVideo = document.querySelector('#btn-toggle-video');


 
var btnSendMsg = document.querySelector('#btn-send-msg');

var messageList = document.querySelector('#message-list');
var messageInput = document.querySelector('#msg');


btnSendMsg.addEventListener('click', sendMsgOnClick);

messageInput.addEventListener("keyup", function(e) {
    e = window.event;
    var keyCode = e.keyCode || e.which;
    if(keyCode==13) {
        e.preventDefault();
        btnSendMsg.click();
    }
});


btnCopyMsg = document.getElementById('btn-copy-msg');

btnCopyMsg.addEventListener("click", copyPortalInput);

function copyPortalInput(){
    var dummy = document.createElement('input');
    text = document.getElementById("message-content-text").value;
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
}

function isOpen(ws) { return ws.readyState === ws.OPEN }

function sendSignal(action, message){
    // console.log(`Self: ${username} Sending Websockets Signal. Action: ${action}  Message: ${JSON.stringify(message)}`);
    //this is how you send something to all peers via websockets (server side)

    var jsonStr = JSON.stringify({
        'peer': username, 
        'action': action, 
        'message': message, 
    });
    if (isOpen(webSocket)){
        if (action==='disconnect'){
            webSocket.close();
        }
        if (action === 'heartbeat'){
            console.log("sending Heartbeat through websockets");
        }
        webSocket.send(jsonStr);
    }
}

function sendHeartBeatIfNeeded(sender){
    console.log(`Starting Heartbeat signal stream from ${sender}: ${username}`);
    if (!sendingActively){
        setInterval( function() { sendDirectChannelSignal("heartbeat_over_direct_channel") } , heartbeatCheckObj['heartbeatFrequency'] );
        sendingActively = true;
    }
}


function sendDirectChannelSignal(action){
    //this is how you send something to all peers via WebRTC DirectChannel (no server needed)
    var dataChannels = getDataChannels(); //get the DataChannel objects that relate to each peer in the mesh 
    var message = JSON.stringify({ //construct a message object 
        'user': username,
        'action': action,
        'time': secondsToDeath,
        'talking': talkingNow,
        'peers': Object.keys(peerTrackDirectConnection).length,
    })
    for (index in dataChannels){ //iterate through datachannels belonging to peers in mesh
        if (dataChannels[index].readyState === 'open') {
            if(heartbeatCheckObj['logging']===true && action==='heartbeat_over_direct_channel'){
                console.log("we are sending a heartbeat from: " + username + " where seconds to death is: " + secondsToDeath);
            }
            dataChannels[index].send(message); //send each peer the message object 
        }
    }
}

function disconnectUser(){
    sendSignal('disconnect', {}); //send disconnect signal to websockets 
    sendDirectChannelSignal('disconnect');
    for (peer in mapPeers){ //close each peer connection 1 by 1 
        conn = mapPeers[peer][0]
        conn.close();
    }
    homeBtn.click();
}



function createOfferer(peerUsername, receiverChannelName){
    console.log(`Creating an Offerer. From: ${username} To: ${peerUsername}`);
    //see video at 1:08
    var connectionToPeer = new RTCPeerConnection(iceConfig); 
    data_channel = connectionToPeer.createDataChannel('channel');
    data_channel.addEventListener('open', () =>{
        console.log(`Offer From: ${username} To: ${peerUsername} - Connection Opened For Data Channel!`);
        sendHeartBeatIfNeeded("Offerer");
    });
    data_channel.addEventListener('message', onMessageDirectConnection); //whenever we get a message through this data channel it is going to call this function 
    var remoteAudio = createAudio(peerUsername); //1:10:00 in video 
    setOnTrack(connectionToPeer, remoteAudio, peerUsername, 'Offerer');
    addLocalTracks(connectionToPeer, peerUsername, "Offerer");
    // if (!peerUsername in mapPeers){
    // debugger;
    // }
    mapPeers[peerUsername] = [connectionToPeer, data_channel, 'self=offerer'];

    //used to remove video when a peer leaves the room 
    connectionToPeer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = connectionToPeer.iceConnectionState;
        console.log("ICE Connection State Changed to: " + iceConnectionState);
        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log(`Deleting Peer: ${peerUsername} due to RTCPeerConnection state change.`);
            delete mapPeers[peerUsername];
            if(iceConnectionState != 'closed'){
                connectionToPeer.close();
            }
            removeAudio(remoteAudio);
        }
    });
    connectionToPeer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("IP details leaked from ICE candidate in Offerer: " + event.candidate.candidate.split(" ")[4]);
            // console.log(`Offerer ${username} has a new ICE Candidate`)
            // console.log("New ICE candidate: ", JSON.stringify(connectionToPeer.localDescription));
            return; //when gathering is finished, the event.candidate object will be null. in that case we send offer
        }
        sendSignal('new-offer', {
            'sdp': connectionToPeer.localDescription, 
            'receiver_channel_name': receiverChannelName, //send it only to the peer that sent the new peer signal 
        });
    });

    const offerOptions = {
        offerToReceiveAudio: true,
    };

    connectionToPeer.createOffer(offerOptions)
        .then(offer => connectionToPeer.setLocalDescription(offer))
        .then(() =>{
            console.log(`Offerer ${username}: - Local description for Self: Set Successfully!`);
        });
    //summary of what we have just done at 1:24

}


function createAnswerer(offer, peerUsername, receiverChannelName){ // 1:26
    console.log(`Creating an Answerer. We are: ${username} - Responding To: ${peerUsername}`);
    var connectionToPeer = new RTCPeerConnection(iceConfig);
    var remoteAudio = createAudio(peerUsername);
    addLocalTracks(connectionToPeer, peerUsername, "Answerer");
    setOnTrack(connectionToPeer, remoteAudio, peerUsername, 'Answerer');    

    connectionToPeer.addEventListener('datachannel', (e) => {
        connectionToPeer.dataChannel = e.channel; //gives us the data channel that was created by the offerer 
        connectionToPeer.dataChannel.addEventListener('open', () =>{
            // setOnTrack(connectionToPeer, remoteAudio, peerUsername, 'Answerer');
            console.log(`We are Answerer: ${username} - Connection Opened For Data Channel with Offerer: ${peerUsername}`);
            sendHeartBeatIfNeeded("Answerer");
            
        })
        connectionToPeer.dataChannel.addEventListener('message', onMessageDirectConnection);
        mapPeers[peerUsername] = [connectionToPeer, connectionToPeer.dataChannel, "self=answerer"];
    });

    //used to remove video when a peer leaves the room 
    connectionToPeer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = connectionToPeer.iceConnectionState;
        console.log(`Answerer here. We are ${username} - ICE Connection State Changed to: ${iceConnectionState}`);
        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log(`We are Answerer: ${username} - Deleting a peer: ${peerUsername} due to connection state: ${iceConnectionState}`);
            delete mapPeers[peerUsername];
            if(iceConnectionState != 'closed'){
                connectionToPeer.close();
            }

            removeAudio(remoteAudio);
        }
    });
    
    connectionToPeer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("IP details leaked from ICE candidate in Answerer: " + event.candidate.candidate.split(" ")[4]);
            // console.log("New ICE candidate: ", JSON.stringify(connectionToPeer.localDescription));
            // console.log(`Answerer ${username} has a new ICE Candidate`);
            return;
        }
        sendSignal('new-answer', {
            'sdp': connectionToPeer.localDescription, 
            'receiver_channel_name': receiverChannelName, //send it only to the peer that sent the new peer signal 
        });

    });


    connectionToPeer.setRemoteDescription(offer)
        .then(()=> {
            // console.log(`We are Answerer: ${username} - Remote description set successfully for ${peerUsername}`);
            return connectionToPeer.createAnswer();
        })
        .then(a =>{
            // console.log(`We Answerer: ${username}, have Successfully created an answer. Setting Local Discription for self`);
            connectionToPeer.setLocalDescription(a); 
        })
}

function addLocalTracks(connectionToPeer, peerUsername, role){
    // console.log(`We are: ${username}, Playing role: ${role}. ADDING LOCAL TRACKS to Connection with: ${peerUsername}`);
    //this is how we add our own audio and video to the stream
    localStream.getTracks().forEach(track => {
        console.log(`${role}: (${username}) are adding a local track`)
        connectionToPeer.addTrack(track, localStream);
    }); 
    return;
}

function updateMessageValue(sender, message){
    console.log("here")
    var messageContent = document.getElementById('message-content-text');
    var senderIdentity = document.getElementById('sender-title');
    if(sender==='Me'){
        sender="Me123456";
    }
    senderIdentity.innerHTML= ("-"+sender.slice(0, -6));
    messageContent.value = (message);
}
    


function sendMsgOnClick(){
    console.log("in here!!")
    var msgText = messageInput.value;
    console.log(`msg text = ${msgText}`);
    updateMessageValue("Me", msgText); //update message portal for my own screen 
    var dataChannels = getDataChannels();

    message = JSON.stringify({
        'action': 'message',
        'content': msgText,
        'user': username,
    });
    console.log('Sending message: '+ msgText + " from user: " + username);
    for (index in dataChannels){
        if (dataChannels[index].readyState === 'open') {
            dataChannels[index].send(message); //send each peer the message object so they can get it 
        }
    };

    messageInput.value = '';
}

 
function onMessageDirectConnection(event){
    //when the message event is triggered on the data channel and it executes this function, the eventListener will pass to this function a dictionary 
    //as the parameter 'event'
    var message = JSON.parse(event.data);
    if (message.action==='disconnect'){
        console.log(`Deleting ${message.user} as a result of manual disconnect.`);
        delete peerTrackDirectConnection[message.user]
        handleListItems(message.user, 'delete');
    }
    if (message.action === 'message'){
        updateMessageValue(message.user, message.content);
    }
    if (message.action === 'heartbeat_over_direct_channel'){
        peerTrackDirectConnection[message.user] = message.time;
        if(heartbeatCheckObj['logging']==true){
            console.log("we got a heartbeat from: " + message.user + " at time: " + message.time);
        }
    }
}

function createAudio(peerUsername){
    var audioContainer = document.querySelector('.audio-container');
    var remoteAudio = document.createElement('audio');
    remoteAudio.id = peerUsername + '-audio';
    remoteAudio.autoplay = true;
    audioContainer.appendChild(remoteAudio);
    return remoteAudio;
}


function setOnTrack(connectionToPeer, remoteAudio, peerUsername, role){
    var remoteStream = new MediaStream();
    remoteAudio.srcObject = remoteStream;
    connectionToPeer.ontrack = (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    };
    if (remoteStream.getAudioTracks()[0]){
        debugger;
    }
}

// const audioTrack = remoteStream.getAudioTracks()[0];
// const audioSender = connectionToPeer.getSenders().find(sender => sender.track === audioTrack);

// // Check if the connection is being routed through a TURN server
// const isTurn = audioSender.transport.iceTransport.selectedCandidatePair.remoteCandidate.protocol === "relay";

// // If the connection is being routed through a TURN server, throttle the audio bitrate to 24kb/s
// if (isTurn) {
//     const parameters = audioSender.getParameters();
//     parameters.encodings[0].maxBitrate = 24000;
//     audioSender.setParameters(parameters);
// }

function removeAudio(audio){
    var audioWrapper = audio.parentNode;
    audioWrapper.removeChild(audio);
}

function getDataChannels(){
    var dataChannels = [];
    for (peerUsername in mapPeers){
        var dataChannel = mapPeers[peerUsername][1];
        dataChannels.push(dataChannel);
    }
    return dataChannels;
}

btnCopyLink = document.getElementById('btn-copy-link');
btnCopyLink.addEventListener('click', copyURLtoClipboard);

function copyURLtoClipboard(){
    var dummy = document.createElement('input'),
    text = window.location.href;

    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
}

createConnectedTalker();


// function boolTalking() {
//     threasholdVol = .2;
//     connectionToPeer.getStats(null).then((stats) => {
//         var talking_div =document.getElementById("talking-test");
//         stats.forEach((report) => {
//             Object.keys(report).forEach((statName) => {
//             if (statName === "audioLevel") {
//                 if (report[statName]>threasholdVol){
//                     console.log("here: " + report[statName]);
//                     talking_div.innerHTML="TALKING";
//                 } else {
//                     console.log("there: " + report[statName]);
//                     talking_div.innerHTML="NOT";
//                 }
//             }
//             });
//         });
//     });
//     }
// statsInterval = setInterval(boolTalking, 100);




// THIS CODE RETURNS TRUE IF CONN IS USING TURN, FALSE IF NOT:
//FIRST YOU MUST DEFINE CONN IE: conn = mapPeers['Paul'][0]

// const stats = await conn.getStats()
//     let selectedLocalCandidate
//     for (const {type, state, localCandidateId} of stats.values())
//         if (type === 'candidate-pair' && state === 'succeeded' && localCandidateId) {
//             selectedLocalCandidate = localCandidateId
//             break
//         }
//     return (!!selectedLocalCandidate && stats.get(selectedLocalCandidate)?.candidateType === 'relay')