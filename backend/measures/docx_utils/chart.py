"""
Построение графика NPV в виде PNG-байтов для вставки в .docx.

matplotlib используем без GUI-бэкенда (Agg), чтобы не зависеть от дисплея на сервере.
"""
from __future__ import annotations

import io
from typing import List

import matplotlib

matplotlib.use("Agg")  # Должно быть до импорта pyplot.
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.ticker import MultipleLocator

plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"] = 12

def render_npv_chart(series: List[dict]) -> bytes:
    """series: список словарей вида {'year': t, 'cumulative_npv': value}."""
    years = [row["year"] for row in series]
    values = [row["cumulative_npv"] for row in series]

    # Сделали холст чуть выше, чтобы влезла легенда снизу
    fig, ax = plt.subplots(figsize=(7.0, 4.0), dpi=140)

    # 1. Рисуем линию без точек (убрали marker="o")
    # Добавили label для легенды и задали цвет, похожий на стандартный Excel
    ax.plot(years, values, linewidth=2, color="#5B9BD5", label="NPV")

    # 2. Настраиваем подписи осей (сделали жирным, как на скрине)
    ax.set_xlabel("Год реализации проекта", fontweight="bold")
    ax.set_ylabel("NPV, тенге", fontweight="bold")

    # 3. Делаем плотную сетку
    ax.minorticks_on()  # Включаем промежуточные деления

    # --- НОВЫЕ СТРОКИ: ПРИНУДИТЕЛЬНЫЙ ШАГ ДЛЯ ЦИФР ---
    ax.xaxis.set_major_locator(MultipleLocator(1))       # Цифры по оси X каждый 1 год
    ax.yaxis.set_major_locator(MultipleLocator(100000))  # Цифры по оси Y каждые 100 000
    # -------------------------------------------------

    ax.grid(which="major", color="#999999", linestyle="-", linewidth=0.5)
    ax.grid(which="minor", color="#CCCCCC", linestyle="-", linewidth=0.5)

    # 4. Прижимаем график к оси Y (чтобы начинался ровно от нуля, как на скрине)
    ax.set_xlim(left=0)

    ax.ticklabel_format(style="plain", axis="y")

    # 5. Выводим легенду снизу по центру (без рамки)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.2), frameon=False)

    fig.tight_layout()

    buf = io.BytesIO()
    # bbox_inches="tight" обязателен, иначе легенда снизу будет обрезана при сохранении
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()