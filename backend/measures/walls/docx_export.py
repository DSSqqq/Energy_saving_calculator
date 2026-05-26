"""
Сборка раздела отчёта по мероприятию «Стены» в формате .docx.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any, Dict

from docx import Document
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from docx.shared import Inches, Pt, Cm
from docx.enum.section import WD_SECTION, WD_ORIENT

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
from . import equations as eq

BASE_DOCX_PATH = Path(__file__).parent / "template" / "base.docx"


_INTRO_AFTER_TABLE_1 = (
    "Таким образом, выявленные дефекты представляют собой системную проблему, "
    "требующую комплексного подхода к устранению. Предлагается выполнить утепление стен "
    "для повышения их теплозащитных свойств."
)
_INTRO_BEFORE_INPUTS = (
    "Ниже приведён расчёт, выполненный с учётом параметров наружных стен. "
    "Предлагаемые мероприятия повышают сопротивление теплопередаче стен."
)

def build_docx(payload: Dict[str, Any], results: Dict[str, Any]) -> bytes:
    """Сборка документа программно из чистого base.docx."""
    if BASE_DOCX_PATH.exists():
        doc = Document(str(BASE_DOCX_PATH))
    else:
        doc = Document()
        _apply_fallback_styles(doc)

    add_heading_para(doc, "3.3.7 Улучшение теплозащитных свойств стен")

    _section_table_1(doc, results)
    add_body_paragraph(doc, _INTRO_AFTER_TABLE_1)
    add_body_paragraph(doc, _INTRO_BEFORE_INPUTS)

    if results["buildings"]:
        first_building = results["buildings"][0]
        _section_per_building_transmission(doc, first_building)
        
        if len(results["buildings"]) > 1:
            add_body_paragraph(doc, "Алгоритм расчета для остальных сооружений идентичен вышеописанному (см. таблицу экономии).")
            doc.add_paragraph()

    _section_totals(doc, payload, results)
    _section_table_3(doc, results)
    _section_table_4(doc, results)
    _section_table_finance(doc, results)
    _section_chart(doc, results)

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()


# --- helpers ------------------------------------------------------------------

def _apply_fallback_styles(doc: Document) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)

    pf = normal.paragraph_format
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.line_spacing = 1.0

def _add_equation(doc, omml_element) -> None:
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    
    p = doc.add_paragraph()
    
    p.paragraph_format.first_line_indent = Pt(0)
    p.paragraph_format.left_indent = Pt(0)
    p.paragraph_format.right_indent = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(2)
    p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    
    if omml_element.tag.endswith('oMathPara'):
        m_pr = omml_element.find(qn('m:oMathParaPr'))
        if m_pr is None:
            m_pr = OxmlElement('m:oMathParaPr')
            omml_element.insert(0, m_pr)
        m_jc = m_pr.find(qn('m:jc'))
        if m_jc is None:
            m_jc = OxmlElement('m:jc')
            m_pr.append(m_jc)
        m_jc.set(qn('m:val'), 'centerGroup')

    p._p.append(omml_element)

def _bullet_paragraph(doc, text: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    
    p.paragraph_format.left_indent = Cm(1.89)
    p.paragraph_format.first_line_indent = Cm(-0.63)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    p.alignment = WD_PARAGRAPH_ALIGNMENT.JUSTIFY
    
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(12)


def _bullet_rich(doc, *segments) -> None:
    from docx.oxml.ns import qn as _qn
    from docx.oxml import OxmlElement

    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Cm(1.89)
    p.paragraph_format.first_line_indent = Cm(-0.63)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    p.alignment = WD_PARAGRAPH_ALIGNMENT.JUSTIFY

    def _add_run(text, subscript=False):
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)
        if subscript:
            rpr = run._element.get_or_add_rPr()
            va = OxmlElement("w:vertAlign")
            va.set(_qn("w:val"), "subscript")
            rpr.append(va)

    for seg in segments:
        if isinstance(seg, str):
            _add_run(seg)
        elif isinstance(seg, tuple) and len(seg) == 2:
            base, sub = seg
            _add_run(base)
            _add_run(sub, subscript=True)
        else:
            _add_run(str(seg))


# --- секции -------------------------------------------------------------------

def _section_table_1(doc, results: Dict[str, Any]) -> None:
    landscape_section = doc.add_section(WD_SECTION.NEW_PAGE)
    landscape_section.orientation = WD_ORIENT.LANDSCAPE
    new_width, new_height = landscape_section.page_height, landscape_section.page_width
    landscape_section.page_width = new_width
    landscape_section.page_height = new_height

    p_cap = doc.add_paragraph()
    p_cap.paragraph_format.first_line_indent = None
    p_cap.paragraph_format.space_before = Pt(6)
    p_cap.paragraph_format.space_after = Pt(0)
    p_cap.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT
    
    add_runs_with_highlight(p_cap, "Таблица 1 - Исходные данные", italic=True)
    rows = []
    
    total_area = sum(b["input"]["area_m2"] for b in results["buildings"])
    for b in results["buildings"]:
        rows.append((
            b["name"],
            fmt_num(b["input"]["area_m2"], 2),
            fmt_num(b["input"]["r_before"], 2),
            fmt_num(b["input"]["r_after"], 2),
            fmt_num(b["input"]["period_days"], 0),
            fmt_num(b["input"]["t_inside"], 1),
            fmt_num(b["input"]["t_outside_avg"], 1),
        ))
    
    rows.append((
        "ИТОГО",
        fmt_num(total_area, 2),
        "-", "-", "-", "-", "-"
    ))
    
    headers = [
        "Наименование здания",
        "Площадь стен, м²",
        "Фактическое сопротивление теплопередаче стен до мероприятия, м²·°С/Вт",
        "Сопротивление теплопередаче стен после мероприятия, м²·°С/Вт",
        "Продолжительность отопительного периода, сут.",
        "Температура внутри помещения, °С",
        "Средняя температура наружного воздуха за отопительный период, °С"
    ]
    
    make_audit_table(
        doc,
        headers,
        rows,
        numeric_columns=[1, 2, 3, 4, 5, 6],
        col_widths=[Cm(3), Cm(3), Cm(4), Cm(4), Cm(3), Cm(3), Cm(4)]
    )
    doc.add_paragraph()
    
    portrait_section = doc.add_section(WD_SECTION.NEW_PAGE)
    portrait_section.orientation = WD_ORIENT.PORTRAIT
    p_width, p_height = portrait_section.page_height, portrait_section.page_width
    portrait_section.page_width = p_width
    portrait_section.page_height = p_height


def _section_per_building_transmission(doc, b: Dict[str, Any]) -> None:
    add_body_paragraph(
        doc,
        f"Ниже представлен расчёт теплопотерь через стены для здания {b['name']}.",
    )
    add_body_paragraph(doc, "Исходные данные:", first_line_indent=False)
    _bullet_paragraph(doc, f"Площадь стен: S = {fmt_num(b['input']['area_m2'], 2)} м²")
    _bullet_rich(doc, "Средняя наружная температура: ", ("t", "н"), f" = {fmt_num(b['input']['t_outside_avg'], 1)} °С")
    _bullet_rich(doc, "Внутренняя температура: ", ("t", "в"), f" = {fmt_num(b['input']['t_inside'], 1)} °С")
    _bullet_paragraph(doc, f"Продолжительность отопительного периода: z = {fmt_num(b['input']['period_days'], 0)} сут.")
    _bullet_rich(doc, "Сопротивление теплопередаче до мероприятия: ", ("R", "до"), f" = {fmt_num(b['input']['r_before'], 2)} м²·°С/Вт")
    _bullet_rich(doc, "Сопротивление теплопередаче после мероприятия: ", ("R", "после"), f" = {fmt_num(b['input']['r_after'], 2)} м²·°С/Вт")
    add_body_paragraph(doc, "Теплопотери до мероприятия:")
    doc.add_paragraph()
    _add_equation(
        doc,
        eq.eq_q_kwh(
            subscript="1",
            r_subscript="до",
            area=fmt_num(b["input"]["area_m2"], 2),
            r_val=fmt_num(b["input"]["r_before"], 2),
            t_in=fmt_num(b["input"]["t_inside"], 1),
            t_out_avg=fmt_num(b["input"]["t_outside_avg"], 1),
            period_days=fmt_num(b["input"]["period_days"], 0),
            result_kwh=fmt_num(b["q_before_kwh"], 1),
        ),
    )
    doc.add_paragraph()
    add_body_paragraph(doc, "Теплопотери после мероприятия:")
    doc.add_paragraph()
    _add_equation(
        doc,
        eq.eq_q_kwh(
            subscript="2",
            r_subscript="после",
            area=fmt_num(b["input"]["area_m2"], 2),
            r_val=fmt_num(b["input"]["r_after"], 2),
            t_in=fmt_num(b["input"]["t_inside"], 1),
            t_out_avg=fmt_num(b["input"]["t_outside_avg"], 1),
            period_days=fmt_num(b["input"]["period_days"], 0),
            result_kwh=fmt_num(b["q_after_kwh"], 1),
        ),
    )
    doc.add_paragraph()
    add_body_paragraph(doc, "Экономия тепловой энергии, Гкал:")
    doc.add_paragraph()
    _add_equation(
        doc,
        eq.eq_delta_q(
            q1=fmt_num(b["q_before_kwh"], 1),
            q2=fmt_num(b["q_after_kwh"], 1),
            result_gcal=fmt_num(b["delta_q_gcal"], 2),
        ),
    )
    doc.add_paragraph()


def _section_totals(doc, payload: Dict[str, Any], results: Dict[str, Any]) -> None:
    add_body_paragraph(
        doc,
        "Общая экономия тепловой энергии за счёт повышения уровня теплозащиты стен:",
    )
    totals = results["summary"]
    shared = payload["shared"]
    add_body_paragraph(doc, f"ИТОГО: ΣΔQ = {fmt_num(totals['total_delta_q_gcal'], 2)} Гкал", first_line_indent=False)
    add_body_paragraph(
        doc,
        "Перевод потребленных Гкал в объем природного газа (тыс. м³); удельная теплота сгорания принята за "
        f"{fmt_num(shared['gas_calorific_gcal_per_thousand_m3'], 2)} Гкал/тыс. м³:",
    )
    doc.add_paragraph()
    
    gas_volume = totals['total_delta_q_gcal'] / shared['gas_calorific_gcal_per_thousand_m3']
    
    _add_equation(
        doc,
        eq.eq_v_gas(
            sum_q=fmt_num(totals["total_delta_q_gcal"], 2),
            calorific=fmt_num(shared["gas_calorific_gcal_per_thousand_m3"], 2),
            result=fmt_num(gas_volume, 3),
        ),
    )
    doc.add_paragraph()
    add_body_paragraph(doc, "Экономия тепловой энергии в денежном выражении, тг:")
    doc.add_paragraph()
    _add_equation(
        doc,
        eq.eq_money(
            gas_thousand=fmt_num(gas_volume, 3),
            tariff=fmt_num(shared["tariff_tg_per_m3"], 2),
            result=fmt_money(totals["total_savings_tg"]),
        ),
    )
    doc.add_paragraph()
    add_body_paragraph(
        doc,
        f"где Cтэ = {fmt_num(shared['tariff_tg_per_m3'], 2)} тг/м³ — средняя цена тепловой энергии.",
    )
    add_body_paragraph(doc, "Стоимость затрат на внедрение мероприятия, тг:")
    add_body_paragraph(
        doc,
        f"I = {fmt_money(totals['total_cost_tg'])} тг (см. таблицу сметы).",
        first_line_indent=False,
    )
    add_body_paragraph(doc, "Простой срок окупаемости мероприятия, год:")
    doc.add_paragraph()
    _add_equation(
        doc,
        eq.eq_pbp(
            investment=fmt_money(totals["total_cost_tg"]),
            money=fmt_money(totals["total_savings_tg"]),
            result=fmt_years(results["financials"]["pbp"]),
        ),
    )
    doc.add_page_break()


def _section_table_3(doc, results: Dict[str, Any]) -> None:
    doc.add_paragraph()
    p_cap = doc.add_paragraph()
    p_cap.paragraph_format.first_line_indent = None
    p_cap.paragraph_format.space_before = Pt(6)
    p_cap.paragraph_format.space_after = Pt(0)
    p_cap.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT
    
    add_runs_with_highlight(p_cap, "Таблица 2 - Материалы и ориентировочная стоимость утепления", italic=True)
    rows = []
    
    items = results["input"].get("investment_items", [])
    for item in items:
        rows.append(
            (
                item["name"],
                fmt_num(item["quantity"], 2),
                fmt_num(item["price_per_unit"], 2),
                fmt_money(item["quantity"] * item["price_per_unit"]),
            )
        )
    rows.append(("Итого", "—", "—", fmt_money(results['summary']['total_cost_tg'])))
    make_audit_table(
        doc,
        ["Материал", "Количество", "Цена за ед., тг", "Стоимость, тг"],
        rows,
        numeric_columns=[1, 2, 3], col_widths=[Cm(6), Cm(3), Cm(4), Cm(4)]
    )
    doc.add_paragraph()

def _section_table_4(doc, results: Dict[str, Any]) -> None:
    p_cap = doc.add_paragraph()
    p_cap.paragraph_format.first_line_indent = None
    p_cap.paragraph_format.space_before = Pt(6)
    p_cap.paragraph_format.space_after = Pt(0)
    p_cap.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT
    
    add_runs_with_highlight(p_cap, "Таблица 3 – Экономия тепловой энергии в Гкал и денежном эквиваленте", italic=True)
    rows = []
    for b in results["buildings"]:
        rows.append(
            (
                b["name"],
                fmt_num(b["delta_q_gcal"], 2),
                fmt_money(b["savings_tg"]),
            )
        )
    rows.append(
        (
            "ИТОГО",
            fmt_num(results["summary"]["total_delta_q_gcal"], 2),
            fmt_money(results["summary"]["total_savings_tg"]),
        )
    )
    make_audit_table(
        doc,
        [
            "Наименование здания",
            "Экономия энергии, Гкал",
            "Экономия в денежном выражении, тг",
        ],
        rows,
        numeric_columns=[1, 2], col_widths=[Cm(6), Cm(5), Cm(6)]
    )
    
    doc.add_paragraph()

def _section_table_finance(doc, results: Dict[str, Any]) -> None:
    p_cap = doc.add_paragraph()
    p_cap.paragraph_format.first_line_indent = None
    p_cap.paragraph_format.space_before = Pt(6)
    p_cap.paragraph_format.space_after = Pt(0)
    p_cap.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT
    
    add_runs_with_highlight(p_cap, "Таблица 4 - Показатели эффективности проекта", italic=True)
    f = results["financials"]
    rows = [
        ("Ставка дисконтирования", "(%)", fmt_num(results["input"]["finance"]["discount_rate"] * 100.0, 2)),
        ("Первоначальные инвестиции", "тг", fmt_money(results["summary"]["total_cost_tg"])),
        ("Чистая приведённая стоимость (NPV)", "тг", fmt_money(f["npv"])),
        ("Дисконтированный индекс доходности (DPI)", "о.е.", fmt_num(f["dpi"], 2)),
        (
            "Внутренняя норма доходности (IRR)",
            "(%)",
            fmt_percent(f["irr"]) if f["irr"] is not None else "—",
        ),
        ("Простой срок окупаемости (PBP)", "лет", fmt_years(f["pbp"])),
        ("Дисконтированный срок окупаемости (DPBP)", "год", fmt_years(f["dpbp"])),
    ]
    make_audit_table(doc, ["Наименование", "Ед. изм-я", "Значение"], rows, 
    numeric_columns=[2], col_widths=[Cm(11), Cm(3), Cm(3)])


def _section_chart(doc, results: Dict[str, Any]) -> None:
    new_section = doc.add_section(WD_SECTION.NEW_PAGE)
    new_section.orientation = WD_ORIENT.LANDSCAPE
    new_width, new_height = new_section.page_height, new_section.page_width
    new_section.page_width = new_width
    new_section.page_height = new_height

    # Re-calculate yearly cash flows for NPV chart
    total_cost = results["summary"]["total_cost_tg"]
    yearly_savings = results["summary"]["total_savings_tg"]
    horizon = results["input"]["finance"]["horizon_years"]
    discount_rate = results["input"]["finance"]["discount_rate"]
    
    cash_flows = [-total_cost]
    for year in range(1, horizon + 1):
        discounted = yearly_savings / ((1 + discount_rate) ** year)
        cash_flows.append(cash_flows[-1] + discounted)

    png = render_npv_chart(cash_flows)
    p = doc.add_paragraph()
    p.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    p.paragraph_format.first_line_indent = None
    p.paragraph_format.space_after = Pt(0) 
    run = p.add_run()
    run.add_picture(io.BytesIO(png), width=Inches(9.0))
    
    p_cap = doc.add_paragraph()
    p_cap.paragraph_format.first_line_indent = None
    p_cap.paragraph_format.space_before = Pt(6)
    p_cap.paragraph_format.space_after = Pt(12)
    p_cap.alignment = WD_PARAGRAPH_ALIGNMENT.LEFT
    add_runs_with_highlight(p_cap, "Диаграмма 1 – Чистая приведённая стоимость проекта мероприятия по "
        "утеплению стен", italic=True)
