"""
DRF сериализаторы мероприятия «Стены».

Отличие от «Окна»: нет полей g_inf (инфильтрации) — только теплопередача.
area_m2 здесь — площадь наружных стен (м²).
"""
from __future__ import annotations

from rest_framework import serializers

from .presets import BUILDING_TYPE_CHOICES, BUILDING_TYPE_OTHER


class BuildingInputSerializer(serializers.Serializer):
    """Параметры одного здания."""

    name = serializers.CharField(max_length=200)
    type = serializers.ChoiceField(
        choices=[code for code, _ in BUILDING_TYPE_CHOICES],
        default=BUILDING_TYPE_OTHER,
    )
    area_m2 = serializers.FloatField(min_value=0.01, help_text="Площадь наружных стен, м²")
    period_days = serializers.FloatField(min_value=1, max_value=365)
    t_inside = serializers.FloatField(min_value=-50, max_value=50, default=20.0)
    t_outside_avg = serializers.FloatField(min_value=-60, max_value=20)
    r_before = serializers.FloatField(min_value=0.01, help_text="Сопротивление теплопередаче до, м²·°C/Вт")
    r_after = serializers.FloatField(min_value=0.01, help_text="Сопротивление теплопередаче после, м²·°C/Вт")

    def validate(self, attrs):
        if attrs["r_after"] <= attrs["r_before"]:
            raise serializers.ValidationError(
                {"r_after": "Сопротивление теплопередаче после мероприятия должно быть больше, чем до."}
            )
        return attrs


class SharedParamsSerializer(serializers.Serializer):
    """Общие константы расчёта и тарифы."""

    fuel_type = serializers.ChoiceField(
        choices=[
            ("gas", "Природный газ"),
            ("electricity", "Электрическая энергия"),
            ("coal", "Каменный уголь"),
            ("diesel", "Дизельное топливо"),
            ("gcal", "Центральное теплоснабжение"),
        ],
        default="gcal"
    )
    fuel_tariff = serializers.FloatField(min_value=0.0)
    fuel_calorific = serializers.FloatField(min_value=0.00001)


class InvestmentItemSerializer(serializers.Serializer):
    """Строка сметы: количество × цена за единицу."""

    name = serializers.CharField(max_length=200)
    quantity = serializers.FloatField(min_value=0)
    price_per_unit = serializers.FloatField(min_value=0)


class FinanceParamsSerializer(serializers.Serializer):
    """Параметры финансовой модели."""

    discount_rate = serializers.FloatField(min_value=0.0, max_value=1.0, default=0.18)
    horizon_years = serializers.IntegerField(min_value=1, max_value=50, default=10)


class WallsInputSerializer(serializers.Serializer):
    """Корневой контракт запроса на calculate / export."""

    project_name = serializers.CharField(max_length=200, default="Энерго-аудит")
    buildings = BuildingInputSerializer(many=True)
    shared = SharedParamsSerializer()
    investment_items = InvestmentItemSerializer(many=True)
    finance = FinanceParamsSerializer()

    def validate_buildings(self, value):
        if not value:
            raise serializers.ValidationError("Нужно как минимум одно здание.")
        return value
