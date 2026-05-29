"""
DRF сериализаторы мероприятия «АТП» (Автоматизированный тепловой пункт).
"""
from __future__ import annotations

from rest_framework import serializers


class BuildingInputSerializer(serializers.Serializer):
    """Параметры одного здания для модернизации АТП."""

    name = serializers.CharField(max_length=200)
    q_annual = serializers.FloatField(min_value=0.01, help_text="Базовое годовое потребление тепловой энергии, Гкал")
    t_inside = serializers.FloatField(min_value=-50.0, max_value=50.0, default=21.0, help_text="Температура внутри помещения в рабочее время (tвн), °С")
    t_standby = serializers.FloatField(min_value=-50.0, max_value=50.0, default=18.0, help_text="Температура дежурного режима отопления (tд), °С")
    t_outside_avg = serializers.FloatField(min_value=-60.0, max_value=20.0, default=-6.8, help_text="Средняя температура наружного воздуха за отопительный период (tср.нар), °С")
    t_outside_design = serializers.FloatField(min_value=-60.0, max_value=20.0, default=-32.8, help_text="Температура наиболее холодной пятидневки (tнар), °С")
    period_days = serializers.FloatField(min_value=1.0, max_value=365.0, default=205.0, help_text="Продолжительность отопительного периода (Nот), сут.")
    weekend_days = serializers.FloatField(min_value=0.0, max_value=365.0, default=41.0, help_text="Количество выходных и праздничных дней в отопительном периоде (Nв.от), сут.")
    day_hours = serializers.FloatField(min_value=0.0, max_value=24.0, default=10.0, help_text="Время поддержания нормированной температуры в рабочие дни (день), ч.")
    fuel_tariff = serializers.FloatField(min_value=0.0, default=13289.77, help_text="Тариф на теплоснабжение (Цтэ), тг/Гкал")
    investment = serializers.FloatField(min_value=0.0, default=4000000.0, help_text="Затраты на модернизацию АТП для этого здания, тг")

    def validate(self, attrs):
        if attrs["weekend_days"] > attrs["period_days"]:
            raise serializers.ValidationError(
                {"weekend_days": "Количество выходных дней не может превышать общую продолжительность отопительного периода."}
            )
        if attrs["t_standby"] > attrs["t_inside"]:
            raise serializers.ValidationError(
                {"t_standby": "Температура дежурного режима не должна превышать рабочую температуру."}
            )
        return attrs


class SharedParamsSerializer(serializers.Serializer):
    """Общие константы расчёта (для совместимости интерфейса)."""
    pass


class InvestmentItemSerializer(serializers.Serializer):
    """Специфическая строка сметы (опционально, для совместимости)."""
    name = serializers.CharField(max_length=200)
    quantity = serializers.FloatField(min_value=0)
    price_per_unit = serializers.FloatField(min_value=0)


class FinanceParamsSerializer(serializers.Serializer):
    """Параметры финансовой модели."""
    discount_rate = serializers.FloatField(min_value=0.0, max_value=1.0, default=0.09)
    horizon_years = serializers.IntegerField(min_value=1, max_value=50, default=10)


class ATPInputSerializer(serializers.Serializer):
    """Корневой сериализатор для мероприятия «АТП»."""
    project_name = serializers.CharField(max_length=200, default="Энерго-аудит АТП")
    buildings = BuildingInputSerializer(many=True)
    shared = SharedParamsSerializer(default=dict)
    investment_items = InvestmentItemSerializer(many=True, default=list)
    finance = FinanceParamsSerializer(default=dict)

    def validate_buildings(self, value):
        if not value:
            raise serializers.ValidationError("Нужно добавить как минимум одно здание.")
        return value
