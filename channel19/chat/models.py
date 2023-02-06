from django.db import models
from django.core.exceptions import ValidationError
from django.utils.crypto import get_random_string
from django.conf import settings

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

    def save(self, *args, **kwargs):
        max_children = settings.MAX_USERS_PER_ROOM
        if self.room and self.pk is None:
            children = Talker.objects.filter(room=self.room)
            if children.count() >= max_children:
                raise ValidationError('A parent can only have a maximum of {} children.'.format(max_children))
        super().save(*args, **kwargs)


# class Listener(models.Model):
#     def __str__(self):
#             return self.guid

#     guid = models.CharField(max_length=30, default=name_gen)
#     creation_date = models.DateTimeField(auto_now_add=True)
#     identifier = models.CharField(max_length=100, null=True, blank=True)
#     room = models.ForeignKey(Room, on_delete=models.CASCADE)