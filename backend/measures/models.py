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

class Window(models.Model):
    ORIENTATION_CHOICES = [
        ("Север", "Север"),
        ("Юг", "Юг"),
        ("Восток", "Восток"),
        ("Запад", "Запад"),
        ("Северо-Восток", "Северо-Восток"),
        ("Северо-Запад", "Северо-Запад"),
        ("Юго-Восток", "Юго-Восток"),
        ("Юго-Запад", "Юго-Запад"),
    ]
    MATERIAL_CHOICES = [
        ("ПВХ", "ПВХ"),
        ("Дерево", "Дерево"),
        ("Алюминий", "Алюминий"),
    ]
    GLAZING_CHOICES = [
        ("Одинарное", "Одинарное"),
        ("Двойное", "Двойное"),
        ("Тройное", "Тройное"),
        ("Двойное энергосберегающее", "Двойное энергосберегающее"),
    ]

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name="windows"
    )
    height = models.FloatField()
    width = models.FloatField()
    orientation = models.CharField(max_length=50, choices=ORIENTATION_CHOICES)
    material = models.CharField(max_length=50, choices=MATERIAL_CHOICES)
    glazing = models.CharField(max_length=50, choices=GLAZING_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Окно ({self.orientation}, {self.width}x{self.height})"

class Door(models.Model):
    ORIENTATION_CHOICES = [
        ("Север", "Север"),
        ("Юг", "Юг"),
        ("Восток", "Восток"),
        ("Запад", "Запад"),
        ("Северо-Восток", "Северо-Восток"),
        ("Северо-Запад", "Северо-Запад"),
        ("Юго-Восток", "Юго-Восток"),
        ("Юго-Запад", "Юго-Запад"),
    ]
    MATERIAL_CHOICES = [
        ("Дерево", "Дерево"),
        ("Металл", "Металл"),
        ("ПВХ", "ПВХ"),
        ("Утепленная", "Утепленная"),
    ]

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name="doors"
    )
    height = models.FloatField()
    width = models.FloatField()
    orientation = models.CharField(max_length=50, choices=ORIENTATION_CHOICES)
    material = models.CharField(max_length=50, choices=MATERIAL_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Дверь ({self.material}, {self.width}x{self.height})"


class BuildingSection(models.Model):
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name="sections"
    )
    name = models.CharField(max_length=255, default="Основная секция")
    floors = models.IntegerField(default=1)
    height_outer = models.FloatField(default=3.5)
    height_inner = models.FloatField(default=3.0)
    wall_material = models.CharField(max_length=100, default="Кирпич")
    roof_type = models.CharField(max_length=100, default="Плоская")
    roof_material = models.CharField(max_length=100, default="Рулонная кровля")
    # Для CAD 3D визуализации и удобного ввода:
    length = models.FloatField(default=10.0)
    width = models.FloatField(default=10.0)
    offset_x = models.FloatField(default=0.0)
    offset_y = models.FloatField(default=0.0)
    # Детальные стороны и их ориентация (JSONField)
    sides = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.floors} эт.)"
