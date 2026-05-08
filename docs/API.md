# REST API — Energy Audit Calculator

Базовый префикс: **`/api/measures/`** (см. [config/urls.py](../backend/config/urls.py) и [measures/urls.py](../backend/measures/urls.py)).

## `GET /api/measures/`

Список зарегистрированных мероприятий. Используется UI и интеграциями для интроспекции.

```json
[{"slug": "windows", "title": "Улучшение теплозащитных свойств оконных блоков"}]
```

## `POST /api/measures/<slug>/calculate/`

Расчёт мероприятия по slug. Контракт тела зависит от мероприятия.

### `windows`

Тело — JSON с полями:

| Поле | Тип | Описание |
|------|-----|----------|
| `project_name` | string | Название проекта (используется только в подписях) |
| `buildings` | array | Список зданий (минимум 1) |
| `buildings[].name` | string | Имя здания |
| `buildings[].type` | enum `"public" \| "industrial" \| "other"` | Тип; в UI задаёт пресет периода/температуры |
| `buildings[].area_m2` | number | Площадь проблемных участков, м² |
| `buildings[].period_days` | number | Продолжительность отопительного периода, сут. |
| `buildings[].t_outside_avg` | number | Средняя t наружного воздуха за период, °C |
| `buildings[].r_before` | number | Сопротивление теплопередаче до, м²·°C/Вт |
| `buildings[].r_after` | number | После, м²·°C/Вт (должно быть `> r_before`) |
| `buildings[].g_inf_before` | number | Воздухопроницаемость до, кг/(м²·ч) |
| `buildings[].g_inf_after` | number | После, кг/(м²·ч) (должно быть `< g_inf_before`) |
| `shared.t_inside` | number | Внутренняя температура, °C (по умолчанию 20) |
| `shared.c_air` | number | Удельная теплоёмкость воздуха, ккал/(кг·°С) (0,24) |
| `shared.k_factor` | number | Коэф. встречного теплового потока (0,8) |
| `shared.gas_calorific_gcal_per_thousand_m3` | number | Теплотворная газа (8,19) |
| `shared.tariff_tg_per_m3` | number | Тариф, тг/м³ (49,90) |
| `investment_items[]` | array | Строки сметы (имя, ед. изм., цена за единицу) |
| `finance.discount_rate` | number | Доля, не % (0,18) |
| `finance.horizon_years` | int | Горизонт NPV (10) |

Пример:

```bash
curl -s -X POST http://127.0.0.1:8000/api/measures/windows/calculate/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_name":"Демо",
    "buildings":[
      {"name":"АБК","type":"public","area_m2":46.07,"period_days":204,"t_outside_avg":-7.1,
       "r_before":0.25,"r_after":0.51,"g_inf_before":15,"g_inf_after":3.5}
    ],
    "shared":{"t_inside":20,"c_air":0.24,"k_factor":0.8,
              "gas_calorific_gcal_per_thousand_m3":8.19,"tariff_tg_per_m3":49.9},
    "investment_items":[{"name":"Герметик","unit":"тенге/м.п.","price_per_unit":1041.2}],
    "finance":{"discount_rate":0.18,"horizon_years":10}
  }'
```

Ответ: `200 OK`, тело — объект:

```json
{
  "buildings": [{"name":"АБК","q_transmission_gcal":...,"q_infiltration_gcal":...,
                 "q_total_gcal":...,"money_savings_tg":...}],
  "totals": {"area_m2":...,"q_total_gcal":...,"gas_thousand_m3":...,"money_savings_tg":...},
  "investment": {"items":[{"name":"...","quantity":...,"cost_tg":...}],"total_tg":...},
  "finance": {"discount_rate":0.18,"horizon_years":10,"annual_cash_flow_tg":...,
              "npv_tg":...,"irr":...,"dpi":...,"pbp_years":...,"dpbp_years":...,
              "npv_by_year":[{"year":0,"discounted_cf":...,"cumulative_npv":...},...]}
}
```

Ошибки валидации возвращаются как `400 Bad Request` с телом DRF.

## `POST /api/measures/<slug>/export/`

То же тело запроса, но ответ — готовый `.docx`:

- `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `Content-Disposition: attachment; filename="windows_thermal_insulation.docx"`

Содержимое — раздел отчёта с таблицами 3.3.6.1–3.3.6.4, 3.3.1.1, формулами расчёта и графиком NPV (см. [docs/MEASURES/windows.md](MEASURES/windows.md)).

## Аутентификация

Сейчас включён `AllowAny` без аутентификации (см. `REST_FRAMEWORK` в `settings.py`). Для публичного продакшена нужно добавить ограничения (rate-limit, API key, JWT и т.д.).
