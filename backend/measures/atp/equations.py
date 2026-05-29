"""
Сборка Word-уравнений (OMML) для мероприятия «АТП».
Использует базовые строительные блоки из `windows/equations.py` для обеспечения DRY и переиспользования.
"""
from __future__ import annotations

from lxml import etree

from ..windows.equations import (
    _eq,
    m_eqArr,
    m_frac,
    m_num,
    m_op,
    m_paren,
    m_run,
    m_sub,
    m_sup,
    m_var,
)


def eq_q0_max(
    *,
    q_base: str,
    period_days: str,
    t_inside: str,
    t_outside_avg: str,
    t_outside_design: str,
    result_val: str,
) -> etree._Element:
    """
    q0_max = Q_base / (N_ot * 24 * ((t_vn - t_sred_nar) / (t_vn - t_nar)))
    """
    line1 = [
        m_sub([m_var("q")], [m_num("0")]),
        m_sub([m_run("max")], []),
        m_op(" = "),
        m_frac(
            [m_sub([m_var("Q")], [m_run("баз")])],
            [
                m_sub([m_var("N")], [m_run("от")]),
                m_op(" · "),
                m_num("24"),
                m_op(" · "),
                m_frac(
                    [
                        m_sub([m_var("t")], [m_run("вн")]),
                        m_op(" − "),
                        m_sub([m_var("t")], [m_run("ср.нар")]),
                    ],
                    [
                        m_sub([m_var("t")], [m_run("вн")]),
                        m_op(" − "),
                        m_sub([m_var("t")], [m_run("нар")]),
                    ],
                ),
            ],
        ),
    ]

    t_out_avg_fmt = f"({t_outside_avg})" if t_outside_avg.startswith("-") else t_outside_avg
    t_out_des_fmt = f"({t_outside_design})" if t_outside_design.startswith("-") else t_outside_design

    line2 = [
        m_op(" = "),
        m_frac(
            [m_num(q_base)],
            [
                m_num(period_days),
                m_op(" · "),
                m_num("24"),
                m_op(" · "),
                m_frac(
                    [
                        m_num(t_inside),
                        m_op(" − "),
                        m_num(t_out_avg_fmt),
                    ],
                    [
                        m_num(t_inside),
                        m_op(" − "),
                        m_num(t_out_des_fmt),
                    ],
                ),
            ],
        ),
        m_op(" = "),
        m_num(result_val),
        m_op(" Гкал/ч"),
    ]

    return _eq(m_eqArr([line1, line2]))


def eq_q_p(
    *,
    work_days: str,
    day_hours: str,
    t_inside: str,
    t_outside_avg: str,
    t_outside_design: str,
    q0_max: str,
    result_val: str,
) -> etree._Element:
    """
    Q_p = N_rab_ot * tau * ((t_vn - t_sred_nar) / (t_vn - t_nar)) * q0_max
    """
    line1 = [
        m_sub([m_var("Q")], [m_run("р")]),
        m_op(" = "),
        m_sub([m_var("N")], [m_run("р.от")]),
        m_op(" · "),
        m_var("τ"),
        m_op(" · "),
        m_frac(
            [
                m_sub([m_var("t")], [m_run("вн")]),
                m_op(" − "),
                m_sub([m_var("t")], [m_run("ср.нар")]),
            ],
            [
                m_sub([m_var("t")], [m_run("вн")]),
                m_op(" − "),
                m_sub([m_var("t")], [m_run("нар")]),
            ],
        ),
        m_op(" · "),
        m_sub([m_var("q")], [m_num("0")]),
        m_sub([m_run("max")], []),
    ]

    t_out_avg_fmt = f"({t_outside_avg})" if t_outside_avg.startswith("-") else t_outside_avg
    t_out_des_fmt = f"({t_outside_design})" if t_outside_design.startswith("-") else t_outside_design

    line2 = [
        m_op(" = "),
        m_num(work_days),
        m_op(" · "),
        m_num(day_hours),
        m_op(" · "),
        m_frac(
            [
                m_num(t_inside),
                m_op(" − "),
                m_num(t_out_avg_fmt),
            ],
            [
                m_num(t_inside),
                m_op(" − "),
                m_num(t_out_des_fmt),
            ],
        ),
        m_op(" · "),
        m_num(q0_max),
        m_op(" = "),
        m_num(result_val),
        m_op(" Гкал"),
    ]

    return _eq(m_eqArr([line1, line2]))


def eq_q_v(
    *,
    work_days: str,
    night_hours: str,
    weekend_days: str,
    t_standby: str,
    t_outside_avg: str,
    t_outside_design: str,
    q0_max: str,
    result_val: str,
) -> etree._Element:
    """
    Q_v = (N_rab_ot * tau_d1 + N_v_ot * 24) * ((t_d - t_sred_nar) / (t_d - t_nar)) * q0_max
    """
    line1 = [
        m_sub([m_var("Q")], [m_run("в")]),
        m_op(" = "),
        m_paren(
            [
                m_sub([m_var("N")], [m_run("р.от")]),
                m_op(" · "),
                m_sub([m_var("τ")], [m_run("д1")]),
                m_op(" + "),
                m_sub([m_var("N")], [m_run("в.от")]),
                m_op(" · "),
                m_num("24"),
            ]
        ),
        m_op(" · "),
        m_frac(
            [
                m_sub([m_var("t")], [m_run("д")]),
                m_op(" − "),
                m_sub([m_var("t")], [m_run("ср.нар")]),
            ],
            [
                m_sub([m_var("t")], [m_run("д")]),
                m_op(" − "),
                m_sub([m_var("t")], [m_run("нар")]),
            ],
        ),
        m_op(" · "),
        m_sub([m_var("q")], [m_num("0")]),
        m_sub([m_run("max")], []),
    ]

    t_out_avg_fmt = f"({t_outside_avg})" if t_outside_avg.startswith("-") else t_outside_avg
    t_out_des_fmt = f"({t_outside_design})" if t_outside_design.startswith("-") else t_outside_design

    line2 = [
        m_op(" = "),
        m_paren(
            [
                m_num(work_days),
                m_op(" · "),
                m_num(night_hours),
                m_op(" + "),
                m_num(weekend_days),
                m_op(" · "),
                m_num("24"),
            ]
        ),
        m_op(" · "),
        m_frac(
            [
                m_num(t_standby),
                m_op(" − "),
                m_num(t_out_avg_fmt),
            ],
            [
                m_num(t_standby),
                m_op(" − "),
                m_num(t_out_des_fmt),
            ],
        ),
        m_op(" · "),
        m_num(q0_max),
        m_op(" = "),
        m_num(result_val),
        m_op(" Гкал"),
    ]

    return _eq(m_eqArr([line1, line2]))


def eq_q_ob(
    *,
    q_p: str,
    q_v: str,
    result_val: str,
) -> etree._Element:
    """
    Q_ob = Q_p + Q_v
    """
    line1 = [
        m_sub([m_var("Q")], [m_run("об")]),
        m_op(" = "),
        m_sub([m_var("Q")], [m_run("р")]),
        m_op(" + "),
        m_sub([m_var("Q")], [m_run("в")]),
    ]

    line2 = [
        m_op(" = "),
        m_num(q_p),
        m_op(" + "),
        m_num(q_v),
        m_op(" = "),
        m_num(result_val),
        m_op(" Гкал"),
    ]

    return _eq(m_eqArr([line1, line2]))


def eq_delta_q(
    *,
    q_base: str,
    q_ob: str,
    result_new: str,
    result_delta: str,
) -> etree._Element:
    """
    Q_new = Q_ob * (1 - 0.09) = Q_ob * 0.91
    ΔQ = Q_base - Q_new
    """
    line1 = [
        m_sub([m_var("Q")], [m_run("нов")]),
        m_op(" = "),
        m_sub([m_var("Q")], [m_run("об")]),
        m_op(" · "),
        m_paren([m_num("1"), m_op(" − "), m_num("0,09")]),
        m_op(" = "),
        m_num(q_ob),
        m_op(" · "),
        m_num("0,91"),
        m_op(" = "),
        m_num(result_new),
        m_op(" Гкал"),
    ]

    line2 = [
        m_var("ΔQ"),
        m_op(" = "),
        m_sub([m_var("Q")], [m_run("баз")]),
        m_op(" − "),
        m_sub([m_var("Q")], [m_run("нов")]),
        m_op(" = "),
        m_num(q_base),
        m_op(" − "),
        m_num(result_new),
        m_op(" = "),
        m_num(result_delta),
        m_op(" Гкал"),
    ]

    return _eq(m_eqArr([line1, line2]))


def eq_money_savings(
    *,
    delta_q: str,
    tariff: str,
    result_val: str,
) -> etree._Element:
    """
    Э_money = ΔQ * C_te
    """
    line1 = [
        m_sub([m_var("Э")], [m_run("год")]),
        m_op(" = "),
        m_var("ΔQ"),
        m_op(" · "),
        m_sub([m_var("С")], [m_run("тэ")]),
    ]

    line2 = [
        m_op(" = "),
        m_num(delta_q),
        m_op(" · "),
        m_num(tariff),
        m_op(" = "),
        m_num(result_val),
        m_op(" тг"),
    ]

    return _eq(m_eqArr([line1, line2]))


def eq_pbp_atp(
    *,
    investment: str,
    savings: str,
    result_val: str,
) -> etree._Element:
    """
    T_ok = I / E_year
    """
    line1 = [
        m_sub([m_var("T")], [m_run("ок")]),
        m_op(" = "),
        m_frac([m_var("I")], [m_sub([m_var("Э")], [m_run("год")])]),
    ]

    line2 = [
        m_op(" = "),
        m_frac([m_num(investment)], [m_num(savings)]),
        m_op(" = "),
        m_num(result_val),
        m_op(" лет"),
    ]

    return _eq(m_eqArr([line1, line2]))
