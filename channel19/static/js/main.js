var mapPeers = {};
//       mapPeers is a dict: Key is a peerUsername and the value is a list: [RTCPeerConnection, RTCDataChannel]
//        { 'Paul': [RTCPeerConnection, RTCDataChannel],
//          'George':  [RTCPeerConnection, RTCDataChannel],
//        }
var peerTrack = {};
var peerTrackDirectConnection = {};
var currentBaseUrl = 'https://b472-73-129-90-73.ngrok.io'

var labelUsername = document.querySelector("#label-username");
var usernameInput = document.querySelector("#username");
var userCount = document.getElementById("connected-user-count-db");
var userCountJS = document.getElementById("connected-user-count-js")
var userCountJS2 = document.getElementById("connected-user-count-js-2")
var userCountDC = document.getElementById("connected-user-count-dc")
var roomName = document.getElementById('room-name');
var expiryOG = document.getElementById("original-expiry");
var currentRoomUuid = window.location.href.slice(-6);
var talkingNow = false;
var sendingActively = false; 
var newPeerSignalButton = document.getElementById('new-peer-button');
var mainLogoImage = document.getElementById('main-logo-image');
var timeElement = document.getElementById("time-now");
var difference = document.getElementById("diff-now");

var iceConfig = { 
    iceServers: [
    {
        urls: "stun:stun.l.google.com:19302"
    },
    // {
    //   urls: "turn:relay.metered.ca:80",
    //   username: "ef5589e9789a32dcd988dd3b",
    //   credential: "3WfeszWRhZ9QOyiz"
    // },
    // {
    //     urls: "turn:relay.metered.ca:443",
    //     username: "ef5589e9789a32dcd988dd3b",
    //     credential: "3WfeszWRhZ9QOyiz"
    //   }
    ]
  };

var xhttp = new XMLHttpRequest();
var btnGetData = document.querySelector("#btn-get-active")
var username;
var webSocket; 
var secondsToDeath; 
var originalTimeToDeath;
var originalClock;



function    webSocketOnMessage(event){
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
        return;
    }

    if(action=='new-answer'){ //received by oldie, a response from the newbie they invited 
        console.log(`We (${username}) just got a message with Action: ${action} From: ${peerUsername} - we are going to set a Remote Description for them.`);
        var answer = parsedData['message']['sdp'];
        var connectionToPeer = mapPeers[peerUsername][0]; //give us the websocketPeer object associated with the sender's username
        connectionToPeer.setRemoteDescription(answer);
        return;
    }

    if(action=='heartbeat'){
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
    var secondsToExpiry = response.seconds_to_expiry;
    originalClock =  Math.floor(Date.now()/1000);
    secondsToDeath = secondsToExpiry;
    originalTimeToDeath = secondsToExpiry;
    t3=setInterval(updateCountdown, 1000);
}

function updateCountdown(){
    // console.log("Running Countdown. Seconds to Death: " + secondsToDeath);
    var currentClock =  Math.floor(Date.now()/1000); //find elapsed time by comparing time.now to time.now when script loaded
    var timeElapsed = Math.abs(originalClock-currentClock);
    secondsToDeath = originalTimeToDeath - timeElapsed; 
    properTime = calculateCountdown(secondsToDeath);
    expiryClock.innerHTML = properTime; 
    timeElement.innerHTML = currentClock;
    difference.innerHTML = secondsToDeath - currentClock;
    if (secondsToDeath === 0){
        window.location.reload();
    }
}


//queries the database for active talkers in a given room, takes the response, and populates userCount field with it 
function updateActiveTalkers(){
    // console.log("in update active talker")
    xhttp.open('GET', `${currentBaseUrl}/cb/${currentRoomUuid}/get_active`, false);
    xhttp.send();
    numUsersConnected = JSON.parse(xhttp.responseText);
    userCount.innerHTML = numUsersConnected.talker_count;
    // console.log("number of users here: " + numUsersConnected.talker_count);
}


function monitorMapPeers(){
    numConnectedUsers = Object.keys(mapPeers).length + 1;
    userCountJS.innerHTML = numConnectedUsers;
}


setInterval(monitorMapPeers, 2000);


function monitorPeerTrackDirectConnection(){
    //this function monitors the peerTrackDirectConnection dict, removing entries older than 2 seconds 
    for (let user in peerTrackDirectConnection) {
        
        if (peerTrackDirectConnection[user] > secondsToDeath + 10) { //if more than 2 seconds have passed since the heartbeat was sent from that user
            // console.log(`here we have ${secondsToDeath} seconds to Death. And dict[user] is ${peerTrackDirectConnection[user]}`);
            console.log(`In Monitor functiono: We have ${secondsToDeath} seconds to Death. And dict[user] is ${peerTrackDirectConnection[user]}. The difference is: ${peerTrackDirectConnection[user] - secondsToDeath} seconds`);
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

function handleListItems(user, action){
    if (action === 'delete'){
        userListItem = document.getElementById(`${user}-li-active`);
        if (userListItem) {
            userListItem.remove();
        }
    }
    if (action === 'create'){
        connectedUserLi = document.getElementById(`${user}-li-active`);
        if (!connectedUserLi){ //if a list element for this user does not exist 
            newUserLi = document.createElement('li');
            newUserLi.id = `${user}-li-active`;
            newUserLi.innerHTML=user;
            listOfConnectedUsers = document.getElementById('connected-peer-list');
            listOfConnectedUsers.appendChild(newUserLi);
        }
    }
}

var t1=setInterval(updateActiveTalkers,1000);
var t4=setInterval(monitorPeerTrackDirectConnection, 1000); //check the peerTrack dict and remove those who arent pinging us 


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

// var loadingUserLi = document.getElementById('loading-user-li');
// loadingUserLi.addEventListener('load', (event) => {
//     changeToNone();
// });

window.onload = function(){ 
    if(document.getElementById('loading-user-li')){
      setTimeout(changeToNone, 1000);
    }
   } 

function changeToNone(){
    setTimeout(function() {
        var loadingUserH3= document.getElementById('loading-user-h3');
        loadingUserH3.innerHTML = "None"; 
      }, 1000);
}



//this function is almost a direct copy of the joinBtn on click method that used to be here 
function createConnectedTalker(){

    getCreatedDate(); //grab the date from the backend and display the countdown timer

    currentRoomUuid = window.location.href.slice(-6);
    username = getNewPublicUsername(currentRoomUuid);
    console.log(`A new user is being born: ${username}`);
    
    //get room name from last 6 digits of url. can also get it 
    //from roomName.innerHTML, but one day roomName might not be displayed on the page 

    var loc = window.location;
    var wsStart = 'wss://';

    if(loc.protocol == 'https'){
        console.log('we are in https world!')
        wsStart = 'wss://';
    }

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

    function sendNewPeerSignal(){
        sendSignal('new-peer', {});
    }

    newPeerSignalButton.addEventListener('click',sendNewPeerSignal);
}

var localStream = new MediaStream();

const constraints = {
    'video': false, 
    'audio': true
}

// const localVideo = document.querySelector('#local-video');
const localAudio = document.getElementById('local-audio');
const btnToggleAudio = document.querySelector('#btn-toggle-audio');
// const btnToggleVideo = document.querySelector('#btn-toggle-video');

var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localAudio.srcObject = localStream;
        localAudio.muted = true;
        // localVideo.srcObject = localStream;
        // localVideo.muted = true;
        console.log(`Creating Media Stream for: ${username}`);
        var audioTracks = localStream.getAudioTracks();
        // var videoTracks = stream.getVideoTracks();

        // console.log(stream);

        audioTracks[0].enabled = true;
        // videoTracks[0].enabled = true;


        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;

            if(audioTracks[0].enabled){
                btnToggleAudio.innerHTML = "Mute";
                mainLogoImage.src='../static/img/logo_white-min.png'
                return;
            }
            btnToggleAudio.innerHTML = "Unmute";
            mainLogoImage.src='../static/img/logo_white-red-min.png'
        });
        // btnToggleVideo.addEventListener('click', () => {
        //     return;
            // videoTracks[0].enabled = !videoTracks[0].enabled;

            // if(videoTracks[0].enabled){
            //     btnToggleVideo.innerHTML = "Video Off";
            //     return;
            // }
            // btnToggleVideo.innerHTML = "Video On"; 
        // });
    })
    .catch(error => {
        console.log('Error accessing media devices!', error);
    });
 
var btnSendMsg = document.querySelector('#btn-send-msg');

var messageList = document.querySelector('#message-list');
var messageInput = document.querySelector('#msg');

btnSendMsg.addEventListener('click', sendMsgOnClick);

messageInput.addEventListener("keyup", function(e) {
    console.log("we are here in the keydown area");
    e = window.event;
    var keyCode = e.keyCode || e.which;
    if(keyCode==13) {
        console.log("we are within the 13 area");
        e.preventDefault();
        btnSendMsg.click();
    }
});


function sendMsgOnClick(){
    var msgText = messageInput.value;
    var li = document.createElement('li'); 
    li.appendChild(document.createTextNode("Me: " + msgText));
    messageList.append(li);

    var dataChannels = getDataChannels();

    message = JSON.stringify({
        'action': 'message',
        'content': msgText,
        'user': username,
    });
    console.log('Sending message: '+ msgText + " from user: " + username);
    for (index in dataChannels){
        if (dataChannels[index].readyState === 'open') {
            dataChannels[index].send(message); //send each peer the message object 
        }
    };

    messageInput.value = '';
}

function isOpen(ws) { return ws.readyState === ws.OPEN }

function sendSignal(action, message){
    //this is how you send something to all peers via websockets (server side)
    var jsonStr = JSON.stringify({
        'peer': username, 
        'action': action, 
        'message': message, 
    });
    if (isOpen(webSocket)){
        if (action === 'heartbeat'){
            console.log("sending Heartbeat through websockets");
        }
        webSocket.send(jsonStr);
    }
}

function sendHeartBeatIfNeeded(sender){
    console.log(`Starting Heartbeat signal stream from ${sender}: ${username}`);
    if (!sendingActively){
        setInterval(sendDirectChannelSignalHeartbeat, 800);
        sendingActively = true;
    }
}


function sendDirectChannelSignalHeartbeat(){
    //this is how you send something to all peers via WebRTC DirectChannel (no server needed)
    var dataChannels = getDataChannels(); //get the DataChannel objects that relate to each peer in the mesh 
    var message = JSON.stringify({ //construct a message object 
        'user': username,
        'action': 'heartbeat_over_direct_channel',
        'time': secondsToDeath,
        'talking': talkingNow,
        'peers': Object.keys(peerTrackDirectConnection).length,
    })
    for (index in dataChannels){ //iterate through datachannels belonging to peers in mesh
        if (dataChannels[index].readyState === 'open') {
            console.log("we are sending a heartbeat from: " + username + " where seconds to death is: " + secondsToDeath);
            dataChannels[index].send(message); //send each peer the message object 
        }
    }
}


function createOfferer(peerUsername, receiverChannelName){
    console.log(`Creating an Offerer. From: ${username} To: ${peerUsername}`);
    //see video at 1:08
    
    var connectionToPeer = new RTCPeerConnection(iceConfig); 

    connectionToPeer.addEventListener('iceconnectionstatechange', function() {
        console.log(`Offer From: ${username} To: ${peerUsername} - ICE connection state: ${connectionToPeer.iceConnectionState}`);
      });
      addLocalTracks(connectionToPeer, peerUsername, "Offerer");  //add local tracks to new connection object 
      data_channel = connectionToPeer.createDataChannel('channel');
      data_channel.addEventListener('open', () =>{
        console.log(`Offer From: ${username} To: ${peerUsername} - Connection Opened For Data Channel!`);
        sendHeartBeatIfNeeded("Offerer");
      });
      data_channel.addEventListener('message', onMessageDirectConnection); //whenever we get a message through this data channel it is going to call this function 
      //1:10:00 in video 
      var remoteAudio = createAudio(peerUsername);
    //   var remoteVideo = createVideo(peerUsername); //returns <div> html element with <video> inside it, tagged for your remote peer (this will be their feed that comes to you)
    //   setOnTrack(connectionToPeer, remoteVideo);
      setOnTrack(connectionToPeer, remoteAudio, peerUsername, 'Offerer');
      
      console.log(`mapPeers keys: ${Object.keys(peerTrackDirectConnection)}`);
      console.log(`peerUsername is: ${peerUsername}`);
      if (!peerUsername in mapPeers){
        debugger;
      }
      console.log(`peerUsername in mapPeers: ${peerUsername in mapPeers}`);
      mapPeers[peerUsername] = [connectionToPeer, data_channel];

    //used to remove video when a peer leaves the room 
    connectionToPeer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = connectionToPeer.iceConnectionState;
        console.log("ICE Connection State Changed to: " + iceConnectionState);

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log(`Offerer ${username} is deleting Peer: + ${peerUsername}`);
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                connectionToPeer.close();
            }
            removeAudio(remoteAudio);
            // removeVideo(remoteVideo);
        }
    });

    connectionToPeer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("From video, all conn details: " + event.candidate.candidate.split(" "));
            console.log(`Offerer ${username} has a new ICE Candidate`)
            console.log("New ICE candidate: ", JSON.stringify(connectionToPeer.localDescription));
            //
            return;
        }

        //when ICE process has been completed the candidate value will be null in which case we will 
        //simply send signal and send the SDP to remote peer. 
        sendSignal('new-offer', {
            'sdp': connectionToPeer.localDescription, 
            'receiver_channel_name': receiverChannelName, //send it only to the peer that sent the new peer signal 
        });


    });

    connectionToPeer.createOffer()
        .then(o => connectionToPeer.setLocalDescription(o))
        .then(() =>{
            console.log(`Offerer ${username}: - Local description for ${peerUsername} set successfully!`);
        });

    //summary of what we have just done at 1:24

    // document.body.addEventListener('touchstart', function(e){ e.preventDefault(); });

    // function boolTalking() {
    //     threasholdVol = .2;
    //     connectionToPeer.getStats(null).then((stats) => {
    //       var talking_div =document.getElementById("talking-test");
    //       stats.forEach((report) => {
    //           Object.keys(report).forEach((statName) => {
    //             if (statName === "audioLevel") {
    //                 if (report[statName]>threasholdVol){
    //                     console.log("here: " + report[statName]);
    //                     talking_div.innerHTML="TALKING";
    //                 } else {
    //                     console.log("there: " + report[statName]);
    //                     talking_div.innerHTML="NOT";
    //                 }
    //             }
    //           });
    //       });
    //     });
    //   }
    // statsInterval = setInterval(boolTalking, 100);
}


function createAnswerer(offer, peerUsername, receiverChannelName){ // 1:26
    console.log(`Creating an Answerer. We are: ${username} - Responding To: ${peerUsername}`);
    var connectionToPeer = new RTCPeerConnection(iceConfig);

    addLocalTracks(connectionToPeer, peerUsername, "Answerer");  // add my tracks to my own feed 
    var remoteAudio = createAudio(peerUsername);
    // var remoteVideo = createVideo(peerUsername); //returns an html video element. Theres no source or anything
    setOnTrack(connectionToPeer, remoteAudio, peerUsername, 'Answerer');
    // setOnTrack(connectionToPeer, remoteVideo); // add my feed to the remote stream 
    

    connectionToPeer.addEventListener('datachannel', (e) => {
        connectionToPeer.dataChannel = e.channel; //gives us the data channel that was created by the offerer 
        connectionToPeer.dataChannel.addEventListener('open', () =>{
            console.log(`We are ${username} - Connection Opened For Data Channel with ${peerUsername}`);
            sendHeartBeatIfNeeded("Answerer");
        })
        connectionToPeer.dataChannel.addEventListener('message', onMessageDirectConnection);
        mapPeers[peerUsername] = [connectionToPeer, connectionToPeer.dataChannel];
        // addPeerToList(peerUsername);
    });

    //used to remove video when a peer leaves the room 
    connectionToPeer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = connectionToPeer.iceConnectionState;
        console.log(`Answerer here. We are ${username} - ICE Connection State Changed to: ${iceConnectionState}`);

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log(`We are Answerer: ${username} - Deleting a peer: ${peerUsername}. The connection state is: ${iceConnectionState}`);
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                connectionToPeer.close();
            }

            removeAudio(remoteAudio);
        }
    });

    connectionToPeer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("New ICE candidate: ", JSON.stringify(connectionToPeer.localDescription));
            //
            console.log(`Answerer ${username} has a new ICE Candidate`)
            return;
        }
        //when ICE process has been completed the candidate value will be null in which case we will 
        //simply send signal and send the SDP to remote peer. 

        sendSignal('new-answer', {
            'sdp': connectionToPeer.localDescription, 
            'receiver_channel_name': receiverChannelName, //send it only to the peer that sent the new peer signal 
        });
    });
    connectionToPeer.setRemoteDescription(offer)
        .then(()=> {
            console.log(`We are Answerer: ${username} - Remote description set successfully for ${peerUsername}`);
            return connectionToPeer.createAnswer();
        })
        .then(a =>{
            console.log(`We Answerer: ${username}, have Successfully created an answer. Setting Local Discription for ${peerUsername}`);
            connectionToPeer.setLocalDescription(a); 
        })

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
}

function addLocalTracks(connectionToPeer, peerUsername, role){
    console.log(`We are: ${username}, Playing role: ${role}. ADDING LOCAL TRACKS to Connection with: ${peerUsername}`);
    //this is how we add our own audio and video to the stream
    localStream.getTracks().forEach(track => {
        connectionToPeer.addTrack(track, localStream);
    }); 
}

 
function onMessageDirectConnection(event){
    //when the message event is triggered on the data channel and it executes this function, the eventListener will pass to this function a dictionary 
    //as the parameter 'event'
    var message = JSON.parse(event.data);
    // console.log("in onMessage, got message: " + message.action);
    if (message.action === 'message'){
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(message.user + ": " + message.content));
        messageList.appendChild(li);
    }
    if (message.action === 'heartbeat_over_direct_channel'){
        peerTrackDirectConnection[message.user] = message.time;
        console.log("we got a heartbeat from: " + message.user + " at time: " + message.time);
    } 
}

function createAudio(peerUsername){
    //video container, already existing, just grabbing it 
    var audioContainer = document.querySelector('.audio-container');

    //new video element 
    var remoteAudio = document.createElement('audio');
    remoteAudio.id = peerUsername + '-audio';
    remoteAudio.autoplay = true;

    audioContainer.appendChild(remoteAudio);

    return remoteAudio;
}


function setOnTrack(connectionToPeer, remoteAudio, peerUsername, role){
    var remoteStream = new MediaStream();
    remoteAudio.srcObject = remoteStream;
    // add remote tracks to our peer to listen for 
    connectionToPeer.addEventListener('track', (event) => {
        console.log(`***** A TRACK event has been fired. We are ${role} ${username} and the peer is ${peerUsername}`)
        remoteStream.addTrack(event.track, remoteStream);
    });
}


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
