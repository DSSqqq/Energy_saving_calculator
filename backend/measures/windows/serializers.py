"""
DRF сериализаторы мероприятия «Окна».

Контракт совпадает с тем, что отправляет фронтенд (см. frontend/src/measures/windows/)
и c описанием в docs/API.md и docs/MEASURES/windows.md.
"""
from __future__ import annotations

from rest_framework import serializers

from .presets import BUILDING_TYPE_CHOICES, BUILDING_TYPE_OTHER


class BuildingInputSerializer(serializers.Serializer):
    """Параметры одного здания. Поля периода/температуры могут идти из пресета."""

    name = serializers.CharField(max_length=200)
    type = serializers.ChoiceField(
        choices=[code for code, _ in BUILDING_TYPE_CHOICES],
        default=BUILDING_TYPE_OTHER,
    )
    area_m2 = serializers.FloatField(min_value=0.01)
    period_days = serializers.FloatField(min_value=1, max_value=365)
    t_inside = serializers.FloatField(min_value=-50, max_value=50, default=20.0)
    t_outside_avg = serializers.FloatField(min_value=-60, max_value=20)
    r_before = serializers.FloatField(min_value=0.01)
    r_after = serializers.FloatField(min_value=0.01)
    g_inf_before = serializers.FloatField(min_value=0)
    g_inf_after = serializers.FloatField(min_value=0)

    def validate(self, attrs):
        if attrs["r_after"] <= attrs["r_before"]:
            raise serializers.ValidationError(
                {"r_after": "Сопротивление теплопередаче после мероприятия должно быть больше, чем до."}
            )
        if attrs["g_inf_after"] >= attrs["g_inf_before"]:
            raise serializers.ValidationError(
                {"g_inf_after": "Воздухопроницаемость после должна быть меньше, чем до."}
            )
        return attrs


class SharedParamsSerializer(serializers.Serializer):
    """Общие константы расчёта и тарифы. Все редактируемые в UI."""

    c_air = serializers.FloatField(default=0.24, help_text="Удельная теплоёмкость воздуха, ккал/(кг·°С)")
    k_factor = serializers.FloatField(default=0.8, help_text="Коэф. влияния встречного теплового потока")
    gas_calorific_gcal_per_thousand_m3 = serializers.FloatField(
        default=8.19, help_text="Теплотворная способность газа, Гкал на 1000 м³"
    )
    tariff_tg_per_m3 = serializers.FloatField(
        default=49.90, help_text="Тариф (тенге за 1 м³ природного газа)"
    )


class InvestmentItemSerializer(serializers.Serializer):
    """Строка сметы: количество в м.п. × цена за единицу."""

    name = serializers.CharField(max_length=200)
    quantity = serializers.FloatField(min_value=0)
    price_per_unit = serializers.FloatField(min_value=0)


class FinanceParamsSerializer(serializers.Serializer):
    """Параметры финансовой модели."""

    discount_rate = serializers.FloatField(min_value=0.0, max_value=1.0, default=0.18)
    horizon_years = serializers.IntegerField(min_value=1, max_value=50, default=10)


class WindowsInputSerializer(serializers.Serializer):
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
