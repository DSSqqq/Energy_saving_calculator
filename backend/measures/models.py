import uuid
from django.db import models

class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
