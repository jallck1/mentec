# Generated by Django 5.0.2 on 2024-12-22 23:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('MAIN', '0005_cliente_remove_user_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='cupos',
            field=models.IntegerField(default=12345),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='cliente',
            name='password',
            field=models.CharField(default='default_password', max_length=128),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='cliente',
            name='createdAt',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]