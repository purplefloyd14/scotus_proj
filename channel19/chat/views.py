from django.shortcuts import render
from chat.models import Room
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.http import JsonResponse
from django.conf import settings 
import random


def generate(request):
    # try:
        
    # except:
    #     raise Http404("Issue creating new room.")
    # else:
    new_rm= Room()
    new_uuid = new_rm.uuid
    new_rm.save()
    # Always return an HttpResponseRedirect after successfully dealing
    # with POST data. This prevents data from being posted twice if a
    # user hits the Back button.
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
    recommended_name="not sure"
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

    
def instance(request, room_uuid):
    print('in instance')
    try: 
        room = Room.objects.get(uuid=room_uuid)
        number_of_talkers = len(room.talker_set.all())
        if number_of_talkers >= settings.MAX_USERS_PER_ROOM:
            context = {'room_name': room_uuid}
            return render(request, 'chat/room_full.html', context=context)
    except Room.DoesNotExist:
        return render(request, 'chat/404.html')
    context = {'room_name': room_uuid,
            'talker_count': number_of_talkers}
    return render(request, 'chat/room.html', context=context) 
