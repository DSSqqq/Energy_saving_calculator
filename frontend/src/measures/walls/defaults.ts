/** Дефолты для мероприятия «Стены». */

import type {
  Building,
  FinanceParams,
  InvestmentItem,
  SharedParams,
  WallsInput,
} from './types'

const buildingABK: Building = {
  name: 'АБК',
  type: 'public',
  area_m2: 500,
  period_days: 204,
  t_inside: 20,
  t_outside_avg: -7.1,
  r_before: 0.75,
  r_after: 2.5,
  fuel_type: 'gcal',
  fuel_tariff: 6761.45,
  fuel_calorific: 1.0,
}

const buildingFactory: Building = {
  name: 'Производственный цех',
  type: 'industrial',
  area_m2: 800,
  period_days: 158,
  t_inside: 16,
  t_outside_avg: -10.0,
  r_before: 0.75,
  r_after: 2.5,
  fuel_type: 'gcal',
  fuel_tariff: 6761.45,
  fuel_calorific: 1.0,
}

const sharedDefaults: SharedParams = {}

const investmentDefaults: InvestmentItem[] = [
  { name: 'Утеплитель (минвата 100мм)', quantity: 1300, price_per_unit: 2500 },
  { name: 'Монтажные работы', quantity: 1300, price_per_unit: 1200 },
]

const financeDefaults: FinanceParams = {
  discount_rate: 0.18,
  horizon_years: 10,
}

export const DEFAULT_INPUT: WallsInput = {
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
    area_m2: 300,
    period_days: 180,
    t_inside: 20,
    t_outside_avg: -8,
    r_before: 0.75,
    r_after: 2.5,
    fuel_type: 'gcal',
    fuel_tariff: 6761.45,
    fuel_calorific: 1.0,
  }
}

export function emptyInvestmentItem(): InvestmentItem {
  return { name: 'Материал', quantity: 0, price_per_unit: 0 }
}
