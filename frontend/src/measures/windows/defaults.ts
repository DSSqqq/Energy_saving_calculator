/** Дефолты, чтобы UI открывался с готовым демо-сценарием из шаблона. */

import type {
  Building,
  FinanceParams,
  InvestmentItem,
  SharedParams,
  WindowsInput,
} from './types'

const buildingABK: Building = {
  name: 'АБК',
  type: 'public',
  area_m2: 46.07,
  period_days: 204,
  t_outside_avg: -7.1,
  r_before: 0.25,
  r_after: 0.51,
  g_inf_before: 15,
  g_inf_after: 3.5,
}

const buildingFactory: Building = {
  name: 'Фабрика',
  type: 'industrial',
  area_m2: 41.26,
  period_days: 158,
  t_outside_avg: -10.0,
  r_before: 0.25,
  r_after: 0.51,
  g_inf_before: 15,
  g_inf_after: 3.5,
}

const sharedDefaults: SharedParams = {
  t_inside: 20,
  c_air: 0.24,
  k_factor: 0.8,
  gas_calorific_gcal_per_thousand_m3: 8.19,
  tariff_tg_per_m3: 49.9,
}

const investmentDefaults: InvestmentItem[] = [
  { name: 'Герметик силиконовый', unit: 'тенге/м.п.', price_per_unit: 1041.2 },
  { name: 'Уплотнительные резинки', unit: 'тенге/м.п.', price_per_unit: 193.5 },
  { name: 'Монтажная пена и доп. материалы', unit: 'тенге/м.п.', price_per_unit: 318 },
]

const financeDefaults: FinanceParams = {
  discount_rate: 0.18,
  horizon_years: 10,
}

export const DEFAULT_INPUT: WindowsInput = {
  project_name: 'Энерго-аудит',
  buildings: [buildingABK, buildingFactory],
  shared: sharedDefaults,
  investment_items: investmentDefaults,
  finance: financeDefaults,
}

export function emptyBuilding(): Building {
  return {
    name: 'Новое здание',
    type: 'other',
    area_m2: 30,
    period_days: 180,
    t_outside_avg: -8,
    r_before: 0.25,
    r_after: 0.51,
    g_inf_before: 15,
    g_inf_after: 3.5,
  }
}

export function emptyInvestmentItem(): InvestmentItem {
  return { name: 'Материал', unit: 'тенге/м²', price_per_unit: 0 }
}
