import json

from chat.models import Talker, Room
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
import random
from django.conf import settings 
# Get channel_layer function

# passing group_channel takes channel name


class ChatConsumer(WebsocketConsumer):
    def connect(self):
        print("arriving")
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        talker_name = self.scope['url_route']['kwargs']['talker_name']

        talker = Talker()
        session = self.scope['session']
        session['user'] = talker.guid
        this_room = Room.objects.get(uuid=self.room_name)
        if len(this_room.talker_set.all()) >= settings.MAX_USERS_PER_ROOM:
            print("too many people in the room. Try back later")
            return 
        talker.room = this_room
        talker.identifier = self.channel_name #this channel name is a unique ID for the user. Its javascripts 'user name'
        talker.talker_name = talker_name
        talker.save()
        # Join room group
        async_to_sync(self.channel_layer.group_add)( #add a channel (user) to the group (room)
            self.room_group_name, #name of group (aka room)
            self.channel_name, #name of self's channel (aka self user)
        )
        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        print("leaving")
        talker = Talker.objects.get(guid=self.scope['session']['user'])
        talker.delete()
        async_to_sync(self.channel_layer.group_discard)( #remove a user from the room
            self.room_group_name, #room name
             self.channel_name #user that is leaving 
        )

    # Receive message from WebSocket
    def receive(self, text_data):
        print("we are in recieve!")
        #when a user receives info, it forwards it on to every other peer user  
        receive_dict = json.loads(text_data) #deserialize our text_data (json format) into a python dictionary 
        message = receive_dict["message"]
        action = receive_dict['action']

        if (action == 'new-offer') or (action == 'new-answer'):
            receiver_channel_name = receive_dict['message']['receiver_channel_name']

            receive_dict['message']['receiver_channel_name'] = self.channel_name

            async_to_sync(self.channel_layer.send)( #send this message to all of the other peers 
                receiver_channel_name, #our room name (they call it a 'group name') is the first param 
                {
                    "receive_dict": receive_dict, #second param being sent is a dict, this line is one key. this dict is containing info for all other peers
                    "type": "send_sdp", #type is compulsory key, value is the name of a function that the consumer will use in sending the message to each peer 
                    
                } 
            )

            return

        receive_dict['message']['receiver_channel_name'] = self.channel_name 
        
        # Send message to room group
        async_to_sync(self.channel_layer.group_send)( #send this message to all of the other peers 
            self.room_group_name, #our room name (they call it a 'group name') is the first param 
            {
                "receive_dict": receive_dict, #second param being sent is a dict, this line is one key. this dict is containing info for all other peers
                "type": "send_sdp", #type is compulsory key, value is the name of a function that the consumer will use in sending the message to each peer 
                
            } 
        )
        

       # Receive message from room group
    def send_sdp(self, event):  
        #this function must correspond to the value of the 'type' key in the second param (which is a dict) in the receive function (above)
        #the other data that is passed in that function is available in this function as part of the event dictionary 

        #THIS IS A GREAT WAY TO COMMUNICATE WITH THE FRONT END - YOU HAVE BOTH THE SELF AND THE EVENT HERE 
        print('in sneaky sdp')
        
        receive_dict = event["receive_dict"]
        user_channel_name = receive_dict['message']['receiver_channel_name']
        talker = Talker.objects.get(identifier=user_channel_name)
        receive_dict['message']['talker_display_name'] = talker.talker_name

        # Send message to WebSocket
        print("The talker display name is: " + talker.talker_name)
        print("the user channel name is: " + user_channel_name)
        self.send(text_data=json.dumps(receive_dict)) 
 