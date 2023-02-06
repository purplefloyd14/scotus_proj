# Generated by Django 4.1.5 on 2023-02-06 02:22

import chat.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='talker',
            name='talker_name',
            field=models.CharField(choices=[('John', 'John'), ('Paul', 'Paul'), ('George', 'George'), ('Ringo', 'Ringo')], default=chat.models.Talker.choose_random_name, max_length=7),
        ),
    ]
