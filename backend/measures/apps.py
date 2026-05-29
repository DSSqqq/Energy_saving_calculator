"""Конфиг Django-приложения «measures»: API набора энерго-аудит мероприятий."""
from django.apps import AppConfig


class MeasuresConfig(AppConfig):
    name = "measures"

    def ready(self) -> None:
        # Импорт регистрирует мероприятия в реестре через side-effect модулей.
        # Делаем это в ready, чтобы не было циклических импортов при загрузке settings.
        from . import registry  # noqa: F401
        from .windows import register as _register_windows  # noqa: F401
        from .walls import register as _register_walls  # noqa: F401
        from .atp import register as _register_atp  # noqa: F401
