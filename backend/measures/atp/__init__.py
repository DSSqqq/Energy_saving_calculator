"""
Мероприятие «Организация (модернизация) автоматизированного теплового пункта (АТП)».

Считает экономию тепловой энергии (Гкал/год) за счет установки автоматики регулирования
и организации дежурного отопления для произвольного числа зданий, переводит её в денежный
эквивалент и оценивает экономику проекта (NPV/IRR/DPI/PBP/DPBP). Также строит .docx с разделом отчёта.
"""
from __future__ import annotations

from ..registry import MeasureDefinition, register_measure
from .docx_export import build_docx
from .engine import calculate
from .serializers import ATPInputSerializer


def register() -> None:
    register_measure(
        MeasureDefinition(
            slug="atp",
            title="Организация (модернизация) автоматизированного теплового пункта (АТП)",
            input_serializer_cls=ATPInputSerializer,
            calculate=calculate,
            build_docx=build_docx,
            docx_filename="atp_modernization.docx",
        )
    )


# Регистрируем при импорте пакета (apps.py делает импорт в ready()).
register()
