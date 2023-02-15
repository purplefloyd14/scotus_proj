console.log("In main.js!")

var mapPeers = {};
var peerTrack = {};
var peerTrackDirectConnection = {};
var currentBaseUrl = 'https://ef01-73-129-90-73.ngrok.io'

var labelUsername = document.querySelector("#label-username");
var usernameInput = document.querySelector("#username");
var btnJoin = document.querySelector("#btn-join");
var userCount = document.getElementById("connected-user-count");
var userCountJS = document.getElementById("connected-user-count-js")
var userCountJS2 = document.getElementById("connected-user-count-js-2")
var userCountDC = document.getElementById("connected-user-count-dc")
var roomName = document.getElementById('room-name');
var expiryOG = document.getElementById("original-expiry");
var currentRoomUuid = window.location.href.slice(-6);
var talkingNow = false;
var sendingActively = false; 
var mainLogoImage = document.getElementById('main-logo-image');

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
        return;
    }
    
    var receiverChannelName = parsedData['message']['receiver_channel_name'];
    console.log("receiver channel name is: " + receiverChannelName);

    if(action=='new-peer'){
        createOfferer(peerUsername, receiverChannelName);
        return;
    }

    if(action == 'new-offer'){
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiverChannelName);
        return;
    }

    if(action=='new-answer'){
        var answer = parsedData['message']['sdp'];
        var peer = mapPeers[peerUsername][0]; //give us the websocketPeer object associated with the sender's username
        peer.setRemoteDescription(answer);
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


function getCreatedDate(){ //this is fired once at the beginningn by createConnectedTalker
    expiryClock = document.getElementById('expiry_clock');
    xhttp.open('GET', `${currentBaseUrl}/cb/${currentRoomUuid}/get_seconds_to_expiry`, false);
    xhttp.send();
    var response = JSON.parse(xhttp.responseText);
    var secondsToExpiry = response.seconds_to_expiry;
    secondsToDeath = secondsToExpiry;
    peerTrack['overall'] = secondsToExpiry;
    t3=setInterval(updateCountdown, 1000);
}

function updateCountdown(){
    // console.log("Running Countdown. Seconds to Death: " + secondsToDeath);
    properTime = calculateCountdown(secondsToDeath);
    expiryClock.innerHTML = properTime; 
    secondsToDeath--;
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

// function monitorMapPeers(){
//     numConnectedUsers = Object.keys(mapPeers).length + 1;
//     userCountJS.innerHTML = numConnectedUsers;
// }

// setInterval(monitorMapPeers, 2000);x


function monitorPeerTrackDirectConnection(){
    //this function monitors the peerTrackDirectConnection dict, removing entries older than 2 seconds 
    numConnectedUsers = Object.keys(peerTrackDirectConnection).length + 1; //add one to count self
    userCountDC.innerHTML = numConnectedUsers;
    for (let user in peerTrackDirectConnection) {
        if (peerTrackDirectConnection[user] > secondsToDeath + 3) { //if more than 2 seconds have passed since the heartbeat was sent from that user
            delete peerTrackDirectConnection[user]; //delete that user 
            handleListItems(user, 'delete');
            console.log("Say goodbye to: " + user);
        } else {
            handleListItems(user, 'create');
        }
    }
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
            newUserLi = document.createElement('li')
            newUserLi.id = `${user}-li-active`;
            newUserH3 = document.createElement('h3');
            if (user === "John" || user === "Paul") {
                newUserH3.innerHTML =`........................ ${user}`;
            }
            if (user === "George"){ 
                newUserH3.innerHTML =`...................... ${user}`;
            }
            if (user === "Ringo"){ 
                newUserH3.innerHTML =`....................... ${user}`;
            }
            newUserLi.appendChild(newUserH3);
            listOfConnectedUsers = document.getElementById('connected-users-ul');
            listOfConnectedUsers.appendChild(newUserLi);
        }
    }
}

// var t1=setInterval(updateActiveTalkers,1000);
var t4=setInterval(monitorPeerTrackDirectConnection, 500); //check the peerTrack dict and remove those who arent pinging us 


// do everything when the page loads, as opposed to when the user clicks on the join button 
//in this case, I have attached the method to the room name element. Can and probably should be changed 
// roomName.addEventListener("load", createConnectedTalker);

function getNewPublicUsername(roomID){
    xhttp.open('GET', `${currentBaseUrl}/cb/${roomID}/get_available_username`, false);
    xhttp.send();
    dataFromDB = JSON.parse(xhttp.responseText);
    var labelUsername = document.querySelector('#label-username');
    recommendedName = dataFromDB.recommended_name
    if (recommendedName === "John" || recommendedName === "Paul") {
        var selfHeader = document.getElementById('you-are-header');
        selfHeader.innerHTML = "You are:............................... "
    }
    if (recommendedName === "Ringo") {
        var selfHeader = document.getElementById('you-are-header');
        selfHeader.innerHTML = "You are:.............................. "
    }
    labelUsername.innerHTML = recommendedName;
    return dataFromDB.recommended_name;
}

//this function is almost a direct copy of the joinBtn on click method that used to be here 
function createConnectedTalker(){
    console.log('create connected talker');

    getCreatedDate(); //grab the date from the backend and display the countdown timer

    currentRoomUuid = window.location.href.slice(-6);
    username = getNewPublicUsername(currentRoomUuid);
    
    //get room name from last 6 digits of url. can also get it 
    //from roomName.innerHTML, but one day roomName might not be displayed on the page 

    var loc = window.location;
    var wsStart = 'wss://';

    if(loc.protocol == 'https'){
        console.log('we are in https world!')
        wsStart = 'wss://';
    }

    var endPoint = wsStart + loc.host + loc.pathname + '/' + username;
    console.log("endpoint: ", endPoint);
    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e) => {
        console.log('Connection Opened!'); 
        console.log(e);
        sendSignal('new-peer', {}); //hey everybody - I am a new peer (this is the websockets implimentation which has been depricated)
    //     setInterval( function() { sendSignal("heartbeat", {
    //         'time': secondsToDeath, //send heartbeat signal from every peer every half second
    //     }); 
    // }, 500 );
    });
    console.log("between here")
    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', (e) => {
        console.log('Connection Closed!'); 
    });
    webSocket.addEventListener('error', (e) => {
        console.log('Error Occurred!'); 
    });
}

var localStream = new MediaStream();

const constraints = {
    'video': true, 
    'audio': true
}

const localVideo = document.querySelector('#local-video');
const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');

var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        console.log("we are here in the media function");

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

        console.log(stream);

        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;


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
        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;

            if(videoTracks[0].enabled){
                btnToggleVideo.innerHTML = "Video Off";
                return;
            }
            btnToggleVideo.innerHTML = "Video On"; 
        });
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
    console.log("head HB if needed from: " + sender);
    if (!sendingActively){
        setInterval(sendDirectChannelSignalHeartbeat, 1000);
        sendingActively = true;
    }
}


function sendDirectChannelSignalHeartbeat(){
    console.log("we are sending a heartbeat from: " + username + ". Trigged in OFFERER");
    //this is how you send something to all peers via WebRTC DirectChannel (no server needed)
    var dataChannels = getDataChannels(); //get the DataChannel objects that relate to each peer in the mesh 
    var message = JSON.stringify({ //construct a message object 
        'user': username,
        'action': 'heartbeat_over_direct_channel',
        'time': secondsToDeath, 
        'talking': talkingNow,
    })
    for (index in dataChannels){ //iterate through datacharnnels belonging to peers in mesh
        // if (dataChannels[index].readyState === 'open') {
        //     dataChannels[index].send(message); //send each peer the message object 
        // }
        dataChannels[index].send(message);
    }
}


function createOfferer(peerUsername, receiverChannelName){
    console.log("we are in create offerer");
    //see video at 1:08
    
    var peer = new RTCPeerConnection(iceConfig); 

    peer.addEventListener('iceconnectionstatechange', function() {
        console.log('ICE connection state:', peer.iceConnectionState);
      });
      addLocalTracks(peer);  //takes local audio and video tracks and adds it self 
      data_channel = peer.createDataChannel('channel');
      data_channel.addEventListener('open', () =>{
        console.log('Connection Opened For Data Channel!');
        sendHeartBeatIfNeeded("Offerer");
      });
      data_channel.addEventListener('message', dcOnMessage); //whenever we get a message through this data channel it is going to call this function 
      //1:10:00 in video 
      var remoteVideo = createVideo(peerUsername); 
  
      setOnTrack(peer, remoteVideo); //adds own streams to remote stream 
      mapPeers[peerUsername] = [peer, data_channel];
    //   addPeerToList(peerUsername);

    //used to remove video when a peer leaves the room 
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        console.log("ICE Connection State (In Answerer) Changed to: " + iceConnectionState);

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log("we are deleting a peer in offerer: " + peerUsername);
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            // console.log("New ICE candidate: ", JSON.stringify(peer.localDescription));
            //
            return;
        }

        //when ICE process has been completed the candidate value will be null in which case we will 
        //simply send signal and send the SDP to remote peer. 

        sendSignal('new-offer', {
            'sdp': peer.localDescription, 
            'receiver_channel_name': receiverChannelName, //send it only to the peer that sent the new peer signal 
        });


    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() =>{
            console.log("local description set successfully!");
        });

    //summary of what we have just done at 1:24

    

    function boolTalking() {
        peer.getStats(null).then((stats) => {
          let statsOutput = "";
          var talking_div =document.getElementById("talking-test");
        
          stats.forEach((report) => {
              Object.keys(report).forEach((statName) => {
                if (statName === 'audioLevel' || statName === 'totalAudioEnergy'){
                    statsOutput += statName + ': '+ report[statName];
                }
                if (statName == "audioLevel" && report[statName]>0.005){
                    console.log("here: " + report[statName]);
                    talking_div.innerHTML="TALKING";

                } if (statName == "audioLevel" && report[statName]<0.1) {
                    console.log("there: " + report[statName]);
                    talking_div.innerHTML="NOT";
                }
              });
          });
        });
      }
    // statsInterval = setInterval(boolTalking, 10000);
}

// function addPeerToList(peerUsername){
//     var newPeerDiv = document.createElement('div');
//     newPeerDiv.className = 'peer-box-instance';
//     newPeerDiv.id= "div-" + peerUsername;
//     var newPeerImage = document.createElement('img');
//     newPeerImage.src = "../static/img/beatles/" + peerUsername.toLowerCase() + "_small.png";
//     var newPeerName = document.createElement("h4");
//     newPeerName.innerHTML = peerUsername;
//     newPeerDiv.appendChild(newPeerImage);
//     newPeerDiv.appendChild(newPeerName);
//     var peerBoxRow = document.getElementById("peer-box-row");
//     peerBoxRow.appendChild(newPeerDiv);
//     console.log('added!')
// }


function createAnswerer(offer, peerUsername, receiverChannelName){ // 1:26
    console.log("we are in create answerer")
    var peer = new RTCPeerConnection(iceConfig);

    addLocalTracks(peer);  // add my tracks to my own feed 

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo); // add my feed to the remote stream 

    peer.addEventListener('datachannel', (e) => {
        peer.dataChannel = e.channel; //gives us the data channel that was created by the offerer 
        peer.dataChannel.addEventListener('open', () =>{
            console.log('Connection Opened For Data Channel!');
            sendHeartBeatIfNeeded("answerer");
        })
        peer.dataChannel.addEventListener('message', dcOnMessage);
        console.log("we got into the answerer part where we add the MESSAGE listener for peer: " + peerUsername);
        mapPeers[peerUsername] = [peer, peer.dataChannel];
        // addPeerToList(peerUsername);
    });

    //used to remove video when a peer leaves the room 
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        console.log("ICE Connection State (In Answerer) Changed to: " + iceConnectionState);

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            console.log("we are deleting a peer in answerer: " + peerUsername + ". the connection state is: "+ iceConnectionState);
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            // console.log("New ICE candidate: ", JSON.stringify(peer.localDescription));
            //
            return;
        }
        //when ICE process has been completed the candidate value will be null in which case we will 
        //simply send signal and send the SDP to remote peer. 

        sendSignal('new-answer', {
            'sdp': peer.localDescription, 
            'receiver_channel_name': receiverChannelName, //send it only to the peer that sent the new peer signal 
        });
    });
    peer.setRemoteDescription(offer)
        .then(()=> {
            console.log('remote description set successfully for %s.', peerUsername);
            return peer.createAnswer();
        })
        .then(a =>{
            console.log('Answer Created!');
            peer.setLocalDescription(a); 
        })
}

function addLocalTracks(peer){
    //this is how we add our own audio and video to the stream
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    }); 
}

 
function dcOnMessage(event){
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
        console.log("we got a heartbeat from: " + message.user);
    } 
}

// f5 = setInterval(sendOverDataChannel, 3000);

function createVideo(peerUsername){
    //video container, already existing, just grabbing it 
    var videoContainer = document.querySelector('.video-container');

    //new video element 
    var remoteVideo = document.createElement('video');
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');
    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo); //^ put wrapper into container, and video into wrapper 

    return remoteVideo;
}


function setOnTrack(peer, remoteVideo){
    var remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    // add remote tracks to our peer to listen for 
    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function removeVideo(video){
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels(){
    var dataChannels = [];
    for (peerUserName in mapPeers){
        var dataChannel = mapPeers[peerUserName][1];
        dataChannels.push(dataChannel);
    }
    return dataChannels;
}

createConnectedTalker();
