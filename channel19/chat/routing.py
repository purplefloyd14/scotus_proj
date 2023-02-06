# chat/routing.py
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"cb/(?P<room_name>\w+)/(?P<talker_name>\w+)", consumers.ChatConsumer.as_asgi()),
    re_path(r"cb/(?P<room_name>\w+)", consumers.ChatConsumer.as_asgi()),
]