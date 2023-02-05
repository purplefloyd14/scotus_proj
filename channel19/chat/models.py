from django.db import models
from django.utils.crypto import get_random_string
from channels.auth import UserLazyObject


def idgen():
    import string
    all_chars = string.digits + string.ascii_letters
    return get_random_string(6, all_chars)

def name_gen():
    return f"user_{idgen()}"

class Room(models.Model):

    def __str__(self):
        return self.uuid

    uuid = models.CharField(max_length=30, default=idgen)
    creation_date = models.DateTimeField(auto_now_add=True)


class Talker(models.Model):

    def __str__(self):
        return self.guid

    guid = models.CharField(max_length=30, default=name_gen)
    creation_date = models.DateTimeField(auto_now_add=True)
    identifier = models.CharField(max_length=100, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)


class Listener(models.Model):
    def __str__(self):
            return self.guid

    guid = models.CharField(max_length=30, default=name_gen)
    creation_date = models.DateTimeField(auto_now_add=True)
    identifier = models.CharField(max_length=100, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)