import json

from chat.models import Talker, Room
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.layers import get_channel_layer
import asyncio

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        print("arriving")
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "chat_%s" % self.room_name

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
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
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        
        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name, {"type": "chat_message", "message": message}
        )
        

       # Receive message from room group
    def chat_message(self, event):
        message = event["message"]
        if message == 'blue':
            import pdb; pdb.set_trace()
        # Send message to WebSocket
        print(self.channel_name)
        self.send(text_data=json.dumps({"message": message}))
 