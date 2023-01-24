import json

from chat.models import Talker, Room
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        print("arriving")
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        async_to_sync(self.channel_layer.group_add)( #add a channel (user) to the group (room)
            self.room_group_name, #name of group (aka room)
            self.channel_name #name of self's channel (aka self user)
        )
        talker = Talker()
        session = self.scope['session']
        session['user'] = talker.guid
        this_room = Room.objects.get(uuid=self.room_name)
        talker.room = this_room
        talker.identifier = self.channel_name
        talker.save()
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
        #when a user receives info, it forwards it on to every other peer user  
        text_data_json = json.loads(text_data) #deserialize our text_data (json format) into a python dictionary 
        message = text_data_json["message"]
        
        # Send message to room group
        async_to_sync(self.channel_layer.group_send)( #send this message to all of the other peers 
            self.room_group_name, #our room name (they call it a 'group name') is the first param 
            {
                "message": message, #second param being sent is a dict containing info for all other peers
                "type": "chat_message", #type is compulsory key, value is the name of a function that the consumer will use in sending the message to each peer 
                
            } 
        )
        

       # Receive message from room group
    def chat_message(self, event):  
        #this function must correspond to the value of the 'type' key in the second param dict in the receive function 
        #the other data that is passed in that function is available in this function as part of the event dictionary 
        message = event["message"]
        if message == 'blue':
            import pdb; pdb.set_trace()
        # Send message to WebSocket
        print(self.channel_name)
        self.send(text_data=json.dumps({ #serialize python dict into json object
            "message": message
        })) 
 