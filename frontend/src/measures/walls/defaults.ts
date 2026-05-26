import { WallsInput } from './types'

export const DEFAULT_INPUT: WallsInput = {
  project_name: 'Энерго-аудит (Утепление стен)',
  buildings: [
    {
      name: 'Цех №1',
      type: 'industrial',
      area_m2: 500,
      period_days: 158,
      t_inside: 18,
      t_outside_avg: -10,
      r_before: 0.8,
      r_after: 3.3,
    },
  ],
  shared: {
    gas_calorific_gcal_per_thousand_m3: 8.19,
    tariff_tg_per_m3: 49.9,
  },
  investment_items: [
    {
      name: 'Утеплитель (минвата)',
      quantity: 500,
      price_per_unit: 10000,
    },
  ],
  finance: {
    discount_rate: 0.18,
    horizon_years: 10,
  },
}
