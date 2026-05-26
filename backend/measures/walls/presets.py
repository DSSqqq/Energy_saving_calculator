"""
Пресеты для разных типов зданий (стены).

Значения соответствуют примеру из исходного аудита.
"""
from __future__ import annotations

from typing import Dict


BUILDING_TYPE_PUBLIC = "public"
BUILDING_TYPE_INDUSTRIAL = "industrial"
BUILDING_TYPE_OTHER = "other"

BUILDING_TYPE_CHOICES = (
    (BUILDING_TYPE_PUBLIC, "Общественное"),
    (BUILDING_TYPE_INDUSTRIAL, "Производственное"),
    (BUILDING_TYPE_OTHER, "Прочее"),
)


PRESETS: Dict[str, Dict[str, float]] = {
    BUILDING_TYPE_PUBLIC: {"period_days": 204, "t_outside_avg": -7.1},
    BUILDING_TYPE_INDUSTRIAL: {"period_days": 158, "t_outside_avg": -10.0},
    BUILDING_TYPE_OTHER: {"period_days": 180, "t_outside_avg": -8.0},
}
