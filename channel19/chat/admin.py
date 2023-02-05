from django.contrib import admin

from .models import Room, Talker


class TalkerInline(admin.TabularInline):
    model = Talker
    extra = 0


class RoomAdmin(admin.ModelAdmin):
    inlines = [
        TalkerInline,
    ]
    prepopulated_fields = {}


admin.site.register(Room, RoomAdmin)
admin.site.register(Talker)