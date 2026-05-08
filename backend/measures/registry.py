"""
Реестр энерго-аудит мероприятий.

Каждое мероприятие — самодостаточный модуль, который при импорте регистрирует
себя через `register_measure(slug, definition)`. Контракт мероприятия:

- `input_serializer_cls` — DRF сериализатор для валидации тела запроса.
- `calculate(payload)` — чистая функция, возвращающая dict с результатами расчёта.
- `build_docx(payload, results)` — функция, возвращающая bytes готового .docx.

Это позволяет добавлять новые мероприятия (отопление, вентиляция, освещение и т.п.)
без правок views/urls — достаточно создать новый пакет и зарегистрировать его.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict


@dataclass(frozen=True)
class MeasureDefinition:
    slug: str
    title: str
    input_serializer_cls: Any
    calculate: Callable[[Dict[str, Any]], Dict[str, Any]]
    build_docx: Callable[[Dict[str, Any], Dict[str, Any]], bytes]
    docx_filename: str


_REGISTRY: Dict[str, MeasureDefinition] = {}


def register_measure(definition: MeasureDefinition) -> None:
    if definition.slug in _REGISTRY:
        raise ValueError(f"Measure already registered: {definition.slug}")
    _REGISTRY[definition.slug] = definition


def get_measure(slug: str) -> MeasureDefinition | None:
    return _REGISTRY.get(slug)


def list_measures() -> list[MeasureDefinition]:
    return list(_REGISTRY.values())
