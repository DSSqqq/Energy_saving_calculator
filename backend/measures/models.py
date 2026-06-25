import uuid
from django.db import models
from django.conf import settings

class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
        null=True,
        blank=True
    )
    title = models.CharField(max_length=500, blank=True, default="")
    assignee = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(
        max_length=50,
        choices=[
            ("К выполнению", "К выполнению"),
            ("В работе", "В работе"),
            ("Готово", "Готово")
        ],
        blank=True,
        default=""
    )

    def __str__(self):
        return self.title or "Новая задача"

class GeoObject(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="geo_objects"
    )
    name = models.CharField(max_length=255)
    contract_number = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Building(models.Model):
    object = models.ForeignKey(
        GeoObject,
        on_delete=models.CASCADE,
        related_name="buildings"
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
