"""
Сборка раздела отчёта по мероприятию «Стены» в формате .docx.

Структура:
  1. Таблица — площадь наружных стен по зданиям.
  2. Исходные данные.
  3. Расчёт теплопотерь по каждому зданию.
  4. Итоги, перевод в газ, экономия в тг, инвестиции.
  5. Финансовые показатели проекта (NPV, IRR, DPI, PBP).
  6. Диаграмма NPV.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any, Dict

from docx import Document
from docx.shared import Pt

from ..docx_utils.builder import (
    add_body_paragraph,
    add_caption,
    add_heading_para,
    make_audit_table,
    add_runs_with_highlight,
)
from ..docx_utils.chart import render_npv_chart
from ..docx_utils.number_fmt import (
    fmt_money,
    fmt_num,
    fmt_percent,
    fmt_years,
)

# Попробуем использовать тот же базовый шаблон что и для окон, если есть
_WINDOWS_BASE = Path(__file__).parent.parent / "windows" / "template" / "base.docx"


def build_docx(payload: Dict[str, Any], results: Dict[str, Any]) -> bytes:
    """Сборка документа по стенам."""
    if _WINDOWS_BASE.exists():
        doc = Document(str(_WINDOWS_BASE))
    else:
        doc = Document()

    shared = payload["shared"]
    finance_params = payload["finance"]
    totals = results["totals"]
    invest = results["investment"]
    fin = results["finance"]
    buildings = results["buildings"]

    add_heading_para(doc, "Улучшение теплозащитных свойств наружных стен")

    # --- Таблица 1: площадь стен по зданиям ---
    add_caption(doc, "Таблица — Площадь наружных стен по зданиям")
    tbl1 = make_audit_table(doc, ["№", "Наименование здания", "Площадь стен, м²"])
    for i, b in enumerate(buildings, 1):
        row = tbl1.add_row().cells
        row[0].text = str(i)
        row[1].text = b["name"]
        row[2].text = fmt_num(b["area_m2"])
    total_row = tbl1.add_row().cells
    total_row[0].text = ""
    total_row[1].text = "ИТОГО"
    total_row[2].text = fmt_num(totals["area_m2"])

    # --- Исходные данные ---
    add_heading_para(doc, "Исходные данные расчёта", level=2)
    add_caption(doc, "Таблица — Исходные данные")
    tbl2 = make_audit_table(doc, [
        "Параметр", "Значение", "Единица"
    ])
    tariff_type = shared.get("tariff_type", "gcal")
    if tariff_type == "gas":
        tariff_row = ("Тариф на газ", fmt_num(shared["tariff_tg_per_m3"]), "тг/м³")
    else:
        tariff_row = ("Тариф на тепловую энергию", fmt_num(shared["tariff_tg_per_gcal"]), "тг/Гкал")

    rows2 = [
        ("Теплотворная способность газа", fmt_num(shared["gas_calorific_gcal_per_thousand_m3"]), "Гкал/тыс. м³"),
        tariff_row,
        ("Ставка дисконтирования", fmt_percent(finance_params["discount_rate"]), ""),
        ("Горизонт расчёта NPV", str(finance_params["horizon_years"]), "лет"),
    ]
    for param, val, unit in rows2:
        r = tbl2.add_row().cells
        r[0].text = param
        r[1].text = val
        r[2].text = unit

    # --- Расчёт по каждому зданию ---
    add_heading_para(doc, "Расчёт экономии тепловой энергии", level=2)
    for b in buildings:
        add_body_paragraph(doc, f"Здание: {b['name']}")
        add_body_paragraph(
            doc,
            f"  ΔT = t_внутр − t_нар = {fmt_num(b['t_inside'])} − ({fmt_num(b['t_outside_avg'])}) = {fmt_num(b['delta_t'])} °C"
        )
        add_body_paragraph(
            doc,
            f"  Q_до   = {fmt_num(b['area_m2'])} / {fmt_num(b['r_before'])} × {fmt_num(b['delta_t'])} × 0.001 × {fmt_num(b['period_days'])} × 24 = {fmt_num(b['q1_kwh'])} кВт·ч/год"
        )
        add_body_paragraph(
            doc,
            f"  Q_после = {fmt_num(b['area_m2'])} / {fmt_num(b['r_after'])} × {fmt_num(b['delta_t'])} × 0.001 × {fmt_num(b['period_days'])} × 24 = {fmt_num(b['q2_kwh'])} кВт·ч/год"
        )
        add_body_paragraph(
            doc,
            f"  ΔQ = ({fmt_num(b['q1_kwh'])} − {fmt_num(b['q2_kwh'])}) × 860.421 / 1 000 000 = {fmt_num(b['q_transmission_gcal'])} Гкал/год"
        )

    # --- Итоги ---
    add_heading_para(doc, "Итоговые показатели", level=2)
    add_caption(doc, "Таблица — Итоговая экономия по зданиям")
    tbl3 = make_audit_table(doc, [
        "Здание", "Площадь, м²", "ΔQ, Гкал/год", "Экономия, тг/год"
    ])
    for b in buildings:
        r = tbl3.add_row().cells
        r[0].text = b["name"]
        r[1].text = fmt_num(b["area_m2"])
        r[2].text = fmt_num(b["q_total_gcal"])
        r[3].text = fmt_money(b["money_savings_tg"])
    tr = tbl3.add_row().cells
    tr[0].text = "ИТОГО"
    tr[1].text = fmt_num(totals["area_m2"])
    tr[2].text = fmt_num(totals["q_total_gcal"])
    tr[3].text = fmt_money(totals["money_savings_tg"])

    add_body_paragraph(
        doc,
        f"Суммарная экономия тепловой энергии: {fmt_num(totals['q_total_gcal'])} Гкал/год"
    )
    add_body_paragraph(
        doc,
        f"Экономия природного газа: {fmt_num(totals['gas_thousand_m3'], 3)} тыс. м³/год"
    )
    add_body_paragraph(
        doc,
        f"Денежная экономия: {fmt_money(totals['money_savings_tg'])} тг/год"
    )

    # --- Инвестиции ---
    if invest["items"]:
        add_heading_para(doc, "Инвестиции", level=2)
        add_caption(doc, "Таблица — Смета на утепление стен")
        tbl4 = make_audit_table(doc, [
            "Наименование работ/материалов", "Кол-во, м²", "Цена за ед., тг", "Стоимость, тг"
        ])
        for item in invest["items"]:
            r = tbl4.add_row().cells
            r[0].text = item["name"]
            r[1].text = fmt_num(item["quantity"])
            r[2].text = fmt_money(item["price_per_unit"])
            r[3].text = fmt_money(item["cost_tg"])
        ti = tbl4.add_row().cells
        ti[0].text = "ИТОГО"
        ti[1].text = ""
        ti[2].text = ""
        ti[3].text = fmt_money(invest["total_tg"])

    # --- Финансовые показатели ---
    add_heading_para(doc, "Финансовые показатели проекта", level=2)
    add_caption(doc, "Таблица — Финансовые показатели")
    tbl5 = make_audit_table(doc, ["Показатель", "Значение"])
    fin_rows = [
        ("Инвестиции", fmt_money(invest["total_tg"]) + " тг"),
        ("Годовая экономия (денежный поток)", fmt_money(fin["annual_cash_flow_tg"]) + " тг/год"),
        ("Простой срок окупаемости (PBP)", fmt_years(fin["pbp_years"])),
        ("Дисконтированный срок окупаемости (DPBP)", fmt_years(fin["dpbp_years"])),
        ("NPV", fmt_money(fin["npv_tg"]) + " тг"),
        ("IRR", fmt_percent(fin["irr"]) if fin["irr"] is not None else "—"),
        ("DPI", fmt_num(fin["dpi"])),
    ]
    for label, val in fin_rows:
        r = tbl5.add_row().cells
        r[0].text = label
        r[1].text = val

    # --- Диаграмма NPV ---
    if fin.get("npv_by_year"):
        try:
            chart_bytes = render_npv_chart(fin["npv_by_year"])
            chart_stream = io.BytesIO(chart_bytes)
            doc.add_picture(chart_stream, width=Pt(400))
        except Exception:
            pass  # Если matplotlib недоступен — пропускаем

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
