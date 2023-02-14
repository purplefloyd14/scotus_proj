from django.shortcuts import render
from chat.models import Room
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.http import JsonResponse
from django.conf import settings 
import random
from django.utils import timezone


def generate(request):
    new_rm= Room()
    new_uuid = new_rm.uuid
    new_rm.save()
    return HttpResponseRedirect(reverse('chat:instance', args=(new_uuid,)))


def fetch_active(request, room_uuid):
    try:
        room = Room.objects.get(uuid=room_uuid)
        number_of_talkers = len(room.talker_set.all())
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    context = {'room_name': room_uuid,
            'talker_count': number_of_talkers}
    return JsonResponse(context)

def get_available_username(request, room_uuid):
    try:
        room = Room.objects.get(uuid=room_uuid)
        number_of_talkers = len(room.talker_set.all())
        if number_of_talkers >= settings.MAX_USERS_PER_ROOM:
            context = {'room_name': room_uuid}
            return render(request, 'chat/room_full.html', context=context)
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    
    names = ['John', 'Paul', 'George', 'Ringo']
    random.shuffle(names) #shuffle in place
    recommended_name="not_sure"
    for name in names:
        if len(room.talker_set.filter(talker_name=name)) == 0:
            recommended_name = name
    context = {'room_name': room_uuid,
            'recommended_name': recommended_name}
    return JsonResponse(context)

def index(request):
    template_name = 'chat/index.html'
    return render(request, template_name)


def about(request):
    template_name = 'chat/about.html'
    return render(request, template_name)

def get_seconds_to_expiry(request, room_uuid):
    try:
        room = Room.objects.get(uuid=room_uuid)
        seconds_to_expiry = calculate_seconds_to_expiry(room)
        if seconds_to_expiry < 0: #the room is expired
            return render(request, 'chat/404.html')
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    context = {'room_name': room_uuid,
            'seconds_to_expiry': seconds_to_expiry}
    return JsonResponse(context)

def calculate_seconds_to_expiry(room):
    now = timezone.now()
    cre = room.creation_date
    maximum_life_of_room = settings.SECONDS_FOR_ROOM_EXISTENCE #900 seconds as of now 
    room_has_been_active = (now - cre).seconds #how long the room has existed
    if room_has_been_active > maximum_life_of_room: #if room has been active longer than it should
        return -1
    else:
        return maximum_life_of_room - room_has_been_active #return total life - life_used IE return seconds to death 

    
def instance(request, room_uuid):
    print('in instance')
    try: 
        room = Room.objects.get(uuid=room_uuid)
        if calculate_seconds_to_expiry(room) < 0:
            context = {'room_name': room.uuid}
            return render(request, 'chat/404.html', context=context)
        number_of_talkers = len(room.talker_set.all())
        if number_of_talkers >= settings.MAX_USERS_PER_ROOM:
            context = {'room_name': room_uuid}
            return render(request, 'chat/room_full.html', context=context)
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    context = {'room_name': room_uuid,
            'talker_count': number_of_talkers,
            'created': room.creation_date}
    return render(request, 'chat/room.html', context=context) 
