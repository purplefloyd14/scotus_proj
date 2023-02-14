console.log("In main.js!")

var mapPeers = {};

var currentBaseUrl = 'https://ef01-73-129-90-73.ngrok.io'

var labelUsername = document.querySelector("#label-username");
var usernameInput = document.querySelector("#username");
var btnJoin = document.querySelector("#btn-join");
var userCount = document.getElementById("connected-user-count");
var userCountJS = document.getElementById("connected-user-count-js")
var roomName = document.getElementById('room-name');
var currentRoomUuid = window.location.href.slice(-6);
var peerCount = 1;

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
    console.log('in on messsage');
    var parsedData = JSON.parse(event.data);
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];
    

    //this message is relayed to every peer on the group, so we end up receiving our own messages
    //in order to account for this, we return if we are the peer in the message (we are receiving our own letter)
    //in practice, this should really be handled on the back end, TODO 
    //see tutorial at 1:06:00
    if(username == peerUsername){
        return;
    }
    
    var receiverChannelName = parsedData['message']['receiver_channel_name'];

    if(action=='new-peer'){
        createOfferer(peerUsername, receiverChannelName);
        // setPublicUsername();
        return;
    }

    if(action == 'new-offer'){
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiverChannelName);
        return;
    }

    if(action=='new-answer'){
        var answer = parsedData['message']['sdp'];

        var peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer);

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
    t3=setInterval(updateCountdown, 1000);
}

function updateCountdown(){
    console.log("Running Countdown. Seconds to Death: " + secondsToDeath);
    properTime = calculateCountdown(secondsToDeath);
    expiryClock.innerHTML = properTime; 
    secondsToDeath --;
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
    userCountJS.innerHTML = Object.keys(mapPeers).length + 1
}

// runs the updateActiverTalkers method every x seconds (1000 = 1 second)
var t1=setInterval(updateActiveTalkers,1000);
var t2=setInterval(monitorMapPeers, 1000);

// do everything when the page loads, as opposed to when the user clicks on the join button 
//in this case, I have attached the method to the room name element. Can and probably should be changed 
// roomName.addEventListener("load", createConnectedTalker);

function getNewPublicUsername(roomID){
    xhttp.open('GET', `${currentBaseUrl}/cb/${roomID}/get_available_username`, false);
    xhttp.send();
    dataFromDB = JSON.parse(xhttp.responseText);
    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = dataFromDB.recommended_name;
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

    console.log("sanity check")

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e) => {
        console.log('Connection Opened!'); 
        console.log(e)
        sendSignal('new-peer', {})
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
                btnToggleAudio.innerHTML = "Audio Mute";
                return;
            }
            btnToggleAudio.innerHTML = "Audio Unmute";
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
    }) 


function sendSignal(action, message){
    var jsonStr = JSON.stringify({
        'peer': username, 
        'action': action, 
        'message': message, 
    });

    webSocket.send(jsonStr);
    console.log("sending message in send signal")
}

var glob_peer;

function createOfferer(peerUsername, receiverChannelName){
    //see video at 1:08
    
    var peer = new RTCPeerConnection(iceConfig); 

    peer.addEventListener('iceconnectionstatechange', function() {
        console.log('ICE connection state:', peer.iceConnectionState);
        if (peer.iceConnectionState ==='connected'){
            peerCount++;
        }
      });
    addLocalTracks(peer);  //takes local audio and video tracks and adds it self 
    var data_channel = peer.createDataChannel('channel');
    data_channel.addEventListener('open', () =>{
        console.log('Connection Opened For Data Channel!')
    })
    data_channel.addEventListener('message', dcOnMessage); //whenever we get a message through this data channel it is going to call this function 
    var remoteVideo = createVideo(peerUsername); 

    setOnTrack(peer, remoteVideo); //adds own streams to remote stream 
    mapPeers[peerUsername] = [peer, data_channel];
    addPeerToList(peerUsername);

    //used to remove video when a peer leaves the room 
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            removePeerFromList(peerUsername);
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                peer.close();
            }

            if(iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
                peerCount--;
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

function addPeerToList(peerUsername){
    var newPeerDiv = document.createElement('div');
    newPeerDiv.className = 'peer-box-instance';
    newPeerDiv.id= "div-" + peerUsername;
    var newPeerImage = document.createElement('img');
    newPeerImage.src = "../static/img/beatles/" + peerUsername.toLowerCase() + "_small.png";
    var newPeerName = document.createElement("h4");
    newPeerName.innerHTML = peerUsername;
    newPeerDiv.appendChild(newPeerImage);
    newPeerDiv.appendChild(newPeerName);
    var peerBoxRow = document.getElementById("peer-box-row");
    peerBoxRow.appendChild(newPeerDiv);
    console.log('added!')
}

function removePeerFromList(peerUsername){
    var peerList = document.getElementById('peer-box-row');
    var peerToRemove = document.getElementById(`div-${peerUsername.toLowerCase}`);
    peerList.removeChild(peerToRemove);
}

function createAnswerer(offer, peerUsername, receiverChannelName){ // 1:26

    var peer = new RTCPeerConnection(iceConfig);

    addLocalTracks(peer);  // add my tracks to my own feed 

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo); // add my feed to the remote stream 

    peer.addEventListener('datachannel', (e) => {
        console.log("in DC stuff");
        peer.dc = e.channel; //gives us the data channel that was created by the offerer 
        peer.dc.addEventListener('open', () =>{
            console.log('Connection Opened For Data Channel!')
        })
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
        addPeerToList(peerUsername);
    });

    //used to remove video when a peer leaves the room 
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            removePeerFromList(peerUsername);
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

var messageList = document.querySelector('#message-list');


function dcOnMessage(event){
    //when the message event is triggered on the data channel and it executes this function, the eventListener will pass to this function a dictionary 
    //as the parameter 'event'
    var message = event.data;
    console.log("message being sent")
    //add new message to ul on html page as li 
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li)
}

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


createConnectedTalker();