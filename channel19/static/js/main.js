console.log("In main.js!")

var mapPeers = {};



var labelUsername = document.querySelector("#label-username");
var usernameInput = document.querySelector("#username");
var btnJoin = document.querySelector("#btn-join");

var username; 

var webSocket; 

function webSocketOnMessage(event){
    var parsedData = JSON.parse(event.data);
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    //this message is relayed to every peer on the group, so we end up receiving our own messages
    //in order to account for this, we return if we are the peer in the message (we are receiving our own letter)
    //in practice, this should really be handled on the back end, TODO 
    //see tutorial at 1:06
    if(username == peerUsername){
        return;
    }
    
    var receiverChannelName = parsedData['message']['receiver_channel_name'];

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

        var peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer);

        return;
    }
}

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    console.log('username: ', username);

    if(username == '') {
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled =true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username; 

    var loc = window.location;
    var wsStart = 'ws://';

    if(loc.protocol == 'https'){
        wsStart = 'wss://';
    }

    var endPoint = wsStart + loc.host + loc.pathname;
    console.log("endpoint: ", endPoint);

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e) => {
        console.log('Connection Opened!'); 

        sendSignal('new-peer', {})
    });
    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', (e) => {
        console.log('Connection Closed!'); 
    });
    webSocket.addEventListener('error', (e) => {
        console.log('Error Occurred!'); 
    });

});

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
        
        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

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
}

function createOfferer(peerUsername, receiverChannelName){
    //see video at 1:08
    //for the purposes of learning this webapp will only be able to connect divices on the same network 
    //in production there should be a TURN/STUN server which allows for ICE to coordinate everything around firewalls
    //if we are trying to get out of network, we need to replace null below with a dictionary that specifies the TURN and STUN server credentials 
    var peer = new RTCPeerConnection(null); 

    addLocalTracks(peer);  //takes local audio and video tracks and adds it to peer connection

    var data_channel = peer.createDataChannel('channel');
    data_channel.addEventListener('open', () =>{
        console.log('Connection Opened For Data Channel!')
    })
    data_channel.addEventListener('message', dcOnMessage); //whenever we get a message through this data channel it is going to call this function 

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo); 

    mapPeers[peerUsername] = [peer, data_channel];


    //used to remove video when a peer leaves the room 
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("New ICE candidate: ", JSON.stringify(peer.localDescription));
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
}

function createAnswerer(offer, peerUsername, receiverChannelName){ // 1:26

    //if we are trying to get out of network, we need to replace null below with a dictionary that specifies the TURN and STUN server credentials 
    var peer = new RTCPeerConnection(null);  

    addLocalTracks(peer);  //takes local audio and video tracks and adds it to peer connection

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo); 

    peer.addEventListener('datachannel', (e) => {
        peer.dc = e.channel; //gives us the data channel that was created by the offerer 
        peer.dc.addEventListener('open', () =>{
            console.log('Connection Opened For Data Channel!')
        })
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc]; 
    });

    


    //used to remove video when a peer leaves the room 
    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername];
            
            if(iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (event)=>{
        if(event.candidate){
            console.log("New ICE candidate: ", JSON.stringify(peer.localDescription));
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
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    }); 
}

var messageList = document.querySelector('#message-list');

function dcOnMessage(event){
    //when the message event is triggered on the data channel and it executes this function, the eventListener will pass to this function a dictionary 
    //as the parameter 'event'
    var message = event.data;

    //add new message to ul on html page as li 
    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li)
}

function createVideo(peerUsername){
    //video container, already existing, just grabbing it 
    var videoContainer = document.querySelector('#video-container');

    //new video element 
    var remoteVideo = document.createElement('video');
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    //^ put wrapper into container, and video into wrapper 

    return remoteVideo;
}


function setOnTrack(peer, remoteVideo){
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function removeVideo(video){
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}
