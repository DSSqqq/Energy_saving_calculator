"""
Сборка Word-уравнений (OMML, namespace `m`) для мероприятия «Окна».

Назначение: получить настоящие математические объекты Word (Cambria Math italic,
дроби, индексы), а не текст из символов. Word ≥ 2010 рендерит их как родные.

Подход: маленький DSL примитивов, которые возвращают элементы lxml; функции
`eq_*` собирают параметрические шаблоны формул со ВСЕМИ числами, подставленными
из расчёта.

Вставка в документ:
    para = doc.add_paragraph()
    para._p.append(eq_q_t(...))
"""
from __future__ import annotations

from typing import Iterable

from lxml import etree


# Полный namespace-карта, которую распознаёт Word.
NSMAP = {
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}
M = NSMAP["m"]
W = NSMAP["w"]


def _qn(tag: str) -> str:
    """Расшифровка `m:r` или `w:rPr` в полный Clark-нотейшн."""
    prefix, local = tag.split(":", 1)
    return f"{{{NSMAP[prefix]}}}{local}"


def _rPr(italic: bool = False) -> etree._Element:
    """Свойства run: Cambria Math + опционально italic."""
    rpr = etree.SubElement(etree.Element(_qn("m:r")), _qn("w:rPr"))
    fonts = etree.SubElement(rpr, _qn("w:rFonts"))
    fonts.set(_qn("w:ascii"), "Cambria Math")
    fonts.set(_qn("w:hAnsi"), "Cambria Math")
    fonts.set(_qn("w:cs"), "Times New Roman")
    if italic:
        etree.SubElement(rpr, _qn("w:i"))
    return rpr


def m_run(text: str, *, italic: bool = False) -> etree._Element:
    """`<m:r><w:rPr>...</w:rPr><m:t>text</m:t></m:r>` — атомарный run внутри формулы."""
    r = etree.Element(_qn("m:r"), nsmap=NSMAP)
    rpr = etree.SubElement(r, _qn("w:rPr"))
    fonts = etree.SubElement(rpr, _qn("w:rFonts"))
    fonts.set(_qn("w:ascii"), "Cambria Math")
    fonts.set(_qn("w:hAnsi"), "Cambria Math")
    fonts.set(_qn("w:cs"), "Times New Roman")
    if italic:
        etree.SubElement(rpr, _qn("w:i"))
    t = etree.SubElement(r, _qn("m:t"))
    # Сохраняем пробелы вокруг знаков (умножение/равно) — без xml:space text схлопнется.
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    return r


def m_var(name: str) -> etree._Element:
    """Курсивная переменная (S, Q, R и т.п.)."""
    return m_run(name, italic=True)


def m_op(op: str) -> etree._Element:
    """Оператор без курсива (=, ·, +, −, /, скобки)."""
    return m_run(op, italic=False)


def m_num(text: str) -> etree._Element:
    """Числовой run (без курсива)."""
    return m_run(text, italic=False)


def _ctrl_pr(italic: bool = True) -> etree._Element:
    ctrl = etree.Element(_qn("m:ctrlPr"))
    rpr = etree.SubElement(ctrl, _qn("w:rPr"))
    fonts = etree.SubElement(rpr, _qn("w:rFonts"))
    fonts.set(_qn("w:ascii"), "Cambria Math")
    fonts.set(_qn("w:hAnsi"), "Cambria Math")
    fonts.set(_qn("w:cs"), "Times New Roman")
    if italic:
        etree.SubElement(rpr, _qn("w:i"))
    return ctrl


def m_frac(num_nodes: Iterable[etree._Element], den_nodes: Iterable[etree._Element]) -> etree._Element:
    """Дробь."""
    f = etree.Element(_qn("m:f"), nsmap=NSMAP)
    fpr = etree.SubElement(f, _qn("m:fPr"))
    fpr.append(_ctrl_pr())
    num = etree.SubElement(f, _qn("m:num"))
    for n in num_nodes:
        num.append(n)
    den = etree.SubElement(f, _qn("m:den"))
    for n in den_nodes:
        den.append(n)
    return f


def m_sub(base_nodes: Iterable[etree._Element], sub_nodes: Iterable[etree._Element]) -> etree._Element:
    """Индекс снизу: X_слово."""
    s = etree.Element(_qn("m:sSub"), nsmap=NSMAP)
    sp = etree.SubElement(s, _qn("m:sSubPr"))
    sp.append(_ctrl_pr())
    e = etree.SubElement(s, _qn("m:e"))
    for n in base_nodes:
        e.append(n)
    sb = etree.SubElement(s, _qn("m:sub"))
    for n in sub_nodes:
        sb.append(n)
    return s


def m_sup(base_nodes: Iterable[etree._Element], sup_nodes: Iterable[etree._Element]) -> etree._Element:
    """Индекс сверху: 10^6."""
    s = etree.Element(_qn("m:sSup"), nsmap=NSMAP)
    sp = etree.SubElement(s, _qn("m:sSupPr"))
    sp.append(_ctrl_pr())
    e = etree.SubElement(s, _qn("m:e"))
    for n in base_nodes:
        e.append(n)
    sup = etree.SubElement(s, _qn("m:sup"))
    for n in sup_nodes:
        sup.append(n)
    return s


def m_paren(inner_nodes: Iterable[etree._Element]) -> etree._Element:
    """Скобки `(...)` через m:d (delimiter)."""
    d = etree.Element(_qn("m:d"), nsmap=NSMAP)
    dp = etree.SubElement(d, _qn("m:dPr"))
    dp.append(_ctrl_pr())
    e = etree.SubElement(d, _qn("m:e"))
    for n in inner_nodes:
        e.append(n)
    return d


def m_para(*nodes: etree._Element) -> etree._Element:
    """Полный абзац-уравнение `<m:oMathPara><m:oMath>...</m:oMath></m:oMathPara>`.

    Возвращает элемент верхнего уровня, готовый для `paragraph._p.append(...)`.
    """
    op = etree.Element(_qn("m:oMathPara"), nsmap=NSMAP)
    oprp = etree.SubElement(op, _qn("m:oMathParaPr"))
    jc = etree.SubElement(oprp, _qn("m:jc"))
    jc.set(_qn("m:val"), "left")
    omath = etree.SubElement(op, _qn("m:oMath"))
    for n in nodes:
        omath.append(n)
    return op


# --- Высокоуровневые сборщики формул мероприятия --------------------------------

# Все принимают строки с уже подставленными числами (форматирование — на стороне
# вызывающего, через docx_utils/number_fmt.py).

def m_eqArr(lines_nodes: list[list[etree._Element]]) -> etree._Element:
    """Матрица уравнений для аккуратного переноса строк."""
    arr = etree.Element(_qn("m:eqArr"), nsmap=NSMAP)
    for line in lines_nodes:
        e = etree.SubElement(arr, _qn("m:e"))
        for node in line:
            e.append(node)
    return arr

def _eq(*nodes: etree._Element) -> etree._Element:
    return m_para(*nodes)


def _equals_with_value(value_text: str) -> list[etree._Element]:
    return [m_op(" = "), m_num(value_text)]


def eq_q_kwh(
    *,
    subscript: str,
    area: str,
    r_val: str,
    t_in: str,
    t_out_avg: str,
    period_days: str,
    result_kwh: str,
) -> etree._Element:
    """`Q_{sub} = S / R_{sub} * (t_вн - t_н.ср) * 10^-3 * N_от * 24 = ... кВт*ч`"""
    
    line1 = [
        m_sub([m_var("Q")], [m_num(subscript)]),
        m_op(" = "),
        m_frac([m_var("S")], [m_sub([m_var("R")], [m_num(subscript)])]),
        m_op(" · "), m_paren([m_sub([m_var("t")], [m_run("вн")]), m_op(" − "), m_sub([m_var("t")], [m_run("н.ср")])]),
        m_op(" · "), m_sup([m_num("10")], [m_op("−"), m_num("3")]),
        m_op(" · "), m_sub([m_var("N")], [m_run("от")]), m_op(" · "), m_num("24"),
    ]
    
    t_out_fmt = f"({t_out_avg})" if t_out_avg.startswith("-") else t_out_avg
    
    line2 = [
        m_op(" = "),
        m_frac([m_num(area)], [m_num(r_val)]),
        m_op(" · "), m_paren([m_num(t_in), m_op(" − "), m_num(t_out_fmt)]),
        m_op(" · "), m_sup([m_num("10")], [m_op("−"), m_num("3")]),
        m_op(" · "), m_num(period_days), m_op(" · "), m_num("24"),
        m_op(" = "), m_num(result_kwh), m_op(" кВт·ч"),
    ]
    
    return _eq(m_eqArr([line1, line2]))


def eq_delta_q(
    *,
    q1: str,
    q2: str,
    result_gcal: str,
) -> etree._Element:
    """`ΔQ = (Q_1 - Q_2) * 860,421 * 10^-6 = ... Гкал`"""
    
    line1 = [
        m_var("ΔQ"),
        m_op(" = "),
        m_paren([m_sub([m_var("Q")], [m_num("1")]), m_op(" − "), m_sub([m_var("Q")], [m_num("2")])]),
        m_op(" · "), m_num("860,421"), m_op(" · "), m_sup([m_num("10")], [m_op("−"), m_num("6")]),
    ]
    
    line2 = [
        m_op(" = "),
        m_paren([m_num(q1), m_op(" − "), m_num(q2)]),
        m_op(" · "), m_num("860,421"), m_op(" · "), m_sup([m_num("10")], [m_op("−"), m_num("6")]),
        m_op(" = "), m_num(result_gcal), m_op(" Гкал"),
    ]
    
    return _eq(m_eqArr([line1, line2]))

def eq_q_inf_specific(
    *,
    label_sub: str,
    c_air: str,
    g_inf: str,
    k_factor: str,
    delta_t: str,
    result_kcal: str,
) -> etree._Element:
    """`q_до = 0,28 · c · g_inf · k · ΔT = …` (или `q_после` через label_sub)."""
    return _eq(
        m_sub([m_var("q")], [m_num(label_sub)]),
        m_op(" = "),
        m_num("0,28"), m_op(" · "), m_var("c"),
        m_op(" · "), m_sub([m_var("g")], [m_num("inf")]),
        m_op(" · "), m_var("k"), m_op(" · "), m_op("ΔT"),
        m_op(" = "),
        m_num("0,28"), m_op(" · "), m_num(c_air), m_op(" · "), m_num(g_inf),
        m_op(" · "), m_num(k_factor), m_op(" · "), m_num(delta_t),
        m_op(" = "), m_num(result_kcal),
    )


def eq_q_infiltration(
    *,
    q_before: str,
    q_after: str,
    area: str,
    period_days: str,
    result_gcal: str,
) -> etree._Element:
    """Разбитая на две строки формула Q_inf."""
    
    line1 = [
        m_sub([m_var("Q")], [m_num("inf")]),
        m_op(" = "),
        m_paren([m_sub([m_var("q")], [m_num("до")]), m_op(" − "), m_sub([m_var("q")], [m_num("после")])]),
        m_op(" · "), m_var("S"), m_op(" · "), m_var("z"), m_op(" · "), m_num("24"),
        m_op(" / "), m_sup([m_num("10")], [m_num("6")]),
    ]
    
    line2 = [
        m_op(" = "),
        m_paren([m_num(q_before), m_op(" − "), m_num(q_after)]),
        m_op(" · "), m_num(area), m_op(" · "), m_num(period_days),
        m_op(" · "), m_num("24"), m_op(" / "), m_sup([m_num("10")], [m_num("6")]),
        m_op(" = "), m_num(result_gcal), m_op(" Гкал"),
    ]
    
    return _eq(m_eqArr([line1, line2]))

def eq_v_gas(*, sum_q: str, calorific: str, result: str) -> etree._Element:
    """`V_газа = ΣQ / a = … тыс. м³`."""
    return _eq(
        m_sub([m_var("V")], [m_num("газа")]),
        m_op(" = "),
        m_frac([m_op("ΣQ")], [m_var("a")]),
        m_op(" = "),
        m_frac([m_num(sum_q)], [m_num(calorific)]),
        m_op(" = "), m_num(result), m_op(" тыс. м³"),
    )


def eq_money(*, gas_thousand: str, tariff: str, result: str) -> etree._Element:
    """`Cэк = V · 1000 · Cээ = … тг`."""
    return _eq(
        m_sub([m_var("C")], [m_num("эк")]),
        m_op(" = "), m_var("V"), m_op(" · "), m_num("1000"),
        m_op(" · "), m_sub([m_var("C")], [m_num("ээ")]),
        m_op(" = "), m_num(gas_thousand), m_op(" · "), m_num("1000"),
        m_op(" · "), m_num(tariff),
        m_op(" = "), m_num(result), m_op(" тг"),
    )


def eq_pbp(*, investment: str, money: str, result: str) -> etree._Element:
    """`PBP = Z / Cэк = … лет`."""
    return _eq(
        m_var("PBP"), m_op(" = "),
        m_frac([m_var("Z")], [m_sub([m_var("C")], [m_num("эк")])]),
        m_op(" = "),
        m_frac([m_num(investment)], [m_num(money)]),
        m_op(" = "), m_num(result), m_op(" лет"),
    )


def eq_sum_two(*, label: str, q_t: str, q_inf: str, total: str) -> etree._Element:
    """`Здание X: Q_т + Q_inf = …  →  Q = q_t + q_inf = total Гкал`."""
    return _eq(
        m_run(label + ": ", italic=False),
        m_num(q_t), m_op(" + "), m_num(q_inf),
        m_op(" = "), m_num(total), m_op(" Гкал"),
    )
