# UK Wind Generation Forecast Analytics (Phase 2 & Phase 3)

[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![Tests Passing](https://img.shields.io/badge/tests-68%20passed-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

Production-grade data engineering and quantitative forecast evaluation engine for UK national wind generation (January 2026), built using **FastAPI**, **Pandas**, **NumPy**, and **Pydantic**.

This system bridges the 10-stage Exploratory Data Analysis (EDA) in [`insights.ipynb`](insights.ipynb) with a robust backend architecture designed for energy utility procurement desks operating in the UK Day-Ahead electricity market.

---

## 1. Domain & Business Problem

An energy utility operating in the UK wholesale electricity market must procure sufficient power to serve consumer demand on delivery day $D$. 

1. **Procurement Decision Horizon**: Power purchase decisions on the Day-Ahead auction (EPEX SPOT / Nord Pool) occur prior to delivery (e.g. at 11:00 D−1, roughly 13–37 hours before physical delivery; conventionally modeled as a 24-hour lead-time cutoff).
2. **Thermal Backup Sizing**: Wind generation is intermittent and weather-dependent. The procurement desk must evaluate expected wind generation and procure remaining demand from dispatchable thermal/gas assets or market auctions.
3. **Imbalance Cashout Exposure**: Under-forecasting leaves the utility over-contracted in expensive long positions, while over-forecasting exposes the utility to System Buy Price (SBP) imbalance cashout penalties.
4. **Quantified Uncertainty**: The utility requires empirical forecast accuracy metrics ($MAE, RMSE, Bias, MAPE$) and vintage drill-down capabilities to size thermal procurement buffers and manage cashout risk.

---

## 2. System Architecture

The pipeline follows a single, unified architectural flow where each layer encapsulates domain-verified rules derived from the 10-stage EDA:

```
Source Data (Elexon CSVs)
   │
   ▼
[Phase 2.1 & 2.2: DataLoader] ─────── Ingestion, type normalization, UTC parsing, defensive caching
   │
   ├──► [Phase 2.3: DatasetValidator] ── Zero-defect validation (0 dups, 0 NaTs, 0 negatives)
   │
   ├──► [Phase 2.4: IntervalDiagnostics] Temporal boundary & interval cadence inspection
   │
   ▼
[Phase 3.2: IntervalAligner] ──────── Downsamples 30-min actuals → hourly arithmetic mean
   │
   ▼
[Phase 3.3: ForecastSelector] ─────── Selects latest eligible vintage: publishTime ≤ deliveryHour − cutoff
   │
   ▼
[Phase 3.4: MetricsCalculator] ────── Computes signed error (F−A), MAE, RMSE, Bias, MAPE, sMAPE, WAPE
   │
   ▼
[Phase 3.5: EvaluationEngine] ─────── Orchestrates summary, comparisons, multi-cutoff & error distributions
   │
   ▼
[FastAPI REST API] ────────────────── Exposes 8 structured JSON endpoints with Pydantic response models
```

---

## 3. Directory Layout

```
Wind_forecast_analysis/
├── data/
│   ├── fuelhh_january_2026.csv        # 1,488 rows — half-hourly national actual wind generation
│   └── windfor_january_2026.csv       # 17,536 rows — hourly national wind generation forecast vintages
├── outputs/                           # Reference EDA JSON artifacts (KPIs, spec, validation report)
├── insights.ipynb                     # 10-stage reference Exploratory Data Analysis
├── requirements.txt                   # Pinned dependency requirements
├── README.md                          # Comprehensive technical documentation
├── app/
│   ├── __init__.py
│   ├── config.py                      # Authoritative configuration & evaluation parameters
│   ├── main.py                        # FastAPI entry point with CORS and error handlers
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py                  # 8 REST endpoints (System, Data Quality, Evaluation)
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── responses.py               # Pydantic response models establishing strict API contracts
│   └── services/
│       ├── __init__.py
│       ├── data_loader.py             # Phase 2.1–2.2: CSV loading, normalisation, caching
│       ├── validator.py               # Phase 2.3: Data quality & integrity validation
│       ├── diagnostics.py             # Phase 2.4: Cadence, calendar completeness, feasibility
│       ├── interval_aligner.py        # Phase 3.2: Half-hourly to hourly mean downsampling
│       ├── forecast_selector.py       # Phase 3.3: Latest eligible vintage selection rule
│       ├── metrics.py                 # Phase 3.4: Accuracy metrics & signed error calculation
│       └── evaluation_engine.py       # Phase 3.5: End-to-end evaluation pipeline orchestrator
└── tests/
    ├── __init__.py
    ├── conftest.py                    # Session-scoped fixtures (prevents redundant disk I/O)
    ├── test_data_loader.py            # 10 tests: schema, parsing, caching, error handling
    ├── test_validator.py              # 3 tests: quality checks on real January datasets
    ├── test_diagnostics.py            # 3 tests: cadence, coverage, alignment feasibility
    ├── test_interval_aligner.py       # 3 tests: unit & integration alignment validation
    ├── test_forecast_selector.py      # 3 tests: eligibility logic & vintage selection
    ├── test_metrics.py                # 5 tests: metric mathematics, signed bias, edge cases
    ├── test_evaluation_engine.py      # 11 tests: EDA benchmark reproduction & multi-cutoff
    └── test_api.py                    # 10 tests: TestClient verification of all REST endpoints
```

---

## 4. Key Engineering & Business Rules

### 4.1 Granularity Alignment (Half-Hourly → Hourly)
* **Dataset Characteristic**: `FUELHH` records wind generation at 30-minute settlement periods (SPs 1–48 per day = 1,488 records). `WINDFOR` forecasts are issued for 60-minute delivery periods (744 hours).
* **Alignment Rule**: Arithmetic mean of the two consecutive settlement periods in each calendar hour:
  $$\text{Actual}_{\text{hour}} = \frac{\text{Gen}_{\text{SP } 2k-1} + \text{Gen}_{\text{SP } 2k}}{2}$$
* Both settlement periods are verified present (`is_complete = True`). Equal 30-minute interval weighting preserves exact MWh energy volume equivalence.

### 4.2 Forecast Eligibility & Vintage Selection
* **Purchase Cutoff Rule**: For a configured lead-time cutoff $c \in \{48, 24, 12, 6, 1\}$ hours:
  $$\text{publishTime} \le \text{deliveryHour} - c$$
* **Selection Policy**: From all qualifying vintages for a delivery hour, select the one with the maximum $\text{publishTime}$ (the latest information available at the decision point).
* **27 Unmatched Hours**: The WINDFOR dataset contains forecast vintages published starting January 1, 2026. For delivery hours from `2026-01-01 00:00` to `2026-01-02 02:00` (27 hours), no vintage published $\ge 24\text{h}$ prior exists. The backend explicitly tracks and flags these 27 hours as unmatched rather than silently dropping or interpolating.

### 4.3 Signed Error & Metric Conventions
* **Signed Error**: $\text{Error} = \text{Forecast} - \text{Actual}$.
  * Positive error indicates **over-forecasting** (surplus predicted; actual generation fell short).
  * Negative error indicates **under-forecasting** (deficit predicted; actual generation exceeded forecast).
* **Metrics Calculated**:
  * **MAE**: Mean Absolute Error (MW)
  * **RMSE**: Root Mean Squared Error (MW, penalizes large misses)
  * **Bias**: Mean Signed Error (MW, indicates systemic over/under-prediction)
  * **MAPE**: Mean Absolute Percentage Error (excluding 0 MW actuals)
  * **sMAPE**: Symmetric Mean Absolute Percentage Error (scale-bounded $[0\%, 200\%]$)
  * **WAPE**: Weighted Absolute Percentage Error ($\frac{\sum |\text{error}|}{\sum \text{actual}}$)

---

## 5. EDA Benchmark Verification

The backend evaluation engine reproduces the exploratory data analysis baseline figures with exact arithmetic parity:

### Primary 24-Hour Cutoff Benchmark (January 2026)

| Evaluation Metric | EDA Reference (`insights.ipynb`) | Backend Engine Output | Status |
|---|---|---|---|
| **Total Evaluation Hours** | 744 hours | 744 hours | Match |
| **Matched Delivery Hours** | 717 hours | 717 hours | Match |
| **Unmatched Early Hours** | 27 hours | 27 hours | Match |
| **Coverage Percentage** | 96.37% | 96.37% | Match |
| **Mean Absolute Error (MAE)** | 1,984.92 MW | 1,984.92 MW | Match |
| **Root Mean Squared Error (RMSE)** | 2,438.06 MW | 2,438.06 MW | Match |
| **Forecast Bias** | +1,767.49 MW | +1,767.49 MW | Match |
| **MAPE** | 20.48% | 20.48% | Match |

### Multi-Cutoff Evaluation on Common Delivery Sample

To evaluate lead-time accuracy without sample selection bias, the engine evaluates all cutoffs on the common intersection of 551 hours (`2026-01-03 00:00` to `2026-01-31 23:00`):

| Purchase Cutoff | Common Sample Hours | Common MAE (MW) | Common RMSE (MW) | Full Sample MAE (MW) | Full Sample Coverage |
|---|---|---|---|---|---|
| **48 Hours** | 551 | 2,042.84 | 2,514.88 | 2,042.84 | 551 / 744 (74.06%) |
| **24 Hours** | 551 | 1,915.63 | 2,365.79 | 1,984.92 | 717 / 744 (96.37%) |
| **12 Hours** | 551 | 1,739.04 | 2,176.62 | 1,784.81 | 733 / 744 (98.52%) |
| **6 Hours** | 551 | 1,515.65 | 1,922.38 | 1,538.99 | 739 / 744 (99.33%) |
| **1 Hour** | 551 | 1,228.18 | 1,607.72 | 1,228.47 | 744 / 744 (100.0%) |

*Conclusion*: Forecast error consistently decays as gate closure approaches, demonstrating that intra-day revisions add significant value over day-ahead forecasts.

---

## 6. Complete API Reference Suite (20 REST Endpoints)

Base URL: `http://localhost:8000/api`
Interactive Swagger Docs: `http://localhost:8000/docs`

### A. Executive Overview
| Endpoint | Method | Key Query Parameters | Purpose |
|---|---|---|---|
| `/summary` | GET | `cutoff_hours`, `start_date`, `end_date` | Executive KPI cards: MAE, RMSE, bias, WAPE, coverage, evaluated hours |
| `/dataset-profile` | GET | None | Actual/forecast record counts, date ranges, unique delivery hours, schema summary |
| `/overview` | GET | `cutoff_hours` | Combined overview: headline KPIs, compact daily series, cutoff comparison, key findings |

### B. Forecast Performance
| Endpoint | Method | Key Query Parameters | Purpose |
|---|---|---|---|
| `/forecasts` | GET | `cutoff_hours`, `start_date`, `end_date` | Actual versus forecast hourly time-series data |
| `/comparison` | GET | `cutoff_hours`, `start_date`, `end_date` | Backward-compatible alias for `/forecasts` |
| `/forecast-errors` | GET | `cutoff_hours`, `start_date`, `end_date` | Signed errors, absolute errors, and distribution summary statistics |
| `/error-distribution` | GET | `cutoff_hours`, `start_date`, `end_date` | 15-bin histogram, median absolute error, 90th & 95th percentile errors |
| `/hourly-records` | GET | `page`, `page_size`, `sort_by`, `sort_order` | Paginated, sortable table records with publication lead-times |
| `/daily-performance` | GET | `cutoff_hours`, `start_date`, `end_date` | Daily aggregated accuracy metrics (MAE, RMSE, bias, WAPE) across January |

### C. Purchase Lead-Time Analysis
| Endpoint | Method | Key Query Parameters | Purpose |
|---|---|---|---|
| `/cutoff-comparison` | GET | `start_date`, `end_date` | Compare [48, 24, 12, 6, 1]h cutoffs on 551h common sample and full coverage |
| `/cutoff-metrics` | GET | `cutoff_hours`, `start_date`, `end_date` | Detailed accuracy metrics for a specific purchase horizon |
| `/cutoff-coverage` | GET | None | Eligible hours and coverage percentages across all 5 standard cutoffs |
| `/forecast-vintages` | GET | `delivery_hour`, `cutoff_hours` | All published vintages for an hour with decision-time eligibility flags |

### D. Data Quality & Coverage
| Endpoint | Method | Key Query Parameters | Purpose |
|---|---|---|---|
| `/data-quality` | GET | None | Nulls, duplicates, invalid timestamps, zero-defect audit results |
| `/validation` | GET | None | Detailed dataset validation results (Phase 2.3) |
| `/diagnostics` | GET | None | Temporal boundaries, step sizes, and 2-SP/hour downsampling feasibility |
| `/coverage` | GET | `cutoff_hours`, `start_date`, `end_date` | Expected, matched, eligible, and unmatched delivery hours |
| `/unmatched-hours` | GET | `cutoff_hours` | Unmatched delivery hours list with dataset publication boundary rationale |
| `/daily-record-counts`| GET | None | Daily actual (48 SPs) and forecast vintage counts |

### E. Methodology & Evidence
| Endpoint | Method | Key Query Parameters | Purpose |
|---|---|---|---|
| `/methodology` | GET | None | Metric formulas (MAE, RMSE, Bias, WAPE, MAPE), rules, assumptions, exclusions |
| `/data-sources` | GET | None | Dataset names (FUELHH, WINDFOR), provider (Elexon BMRS), field definitions |
| `/health` | GET | None | Backend service health and dataset file availability |

### Sample Response: `GET /api/summary?cutoff=24`

```json
{
  "evaluation_period": {
    "start": "2026-01-01T00:00:00+00:00",
    "end": "2026-02-01T00:00:00+00:00"
  },
  "cutoff_hours": 24,
  "total_delivery_hours": 744,
  "matched_hours": 717,
  "unmatched_hours": 27,
  "coverage_pct": 96.37,
  "metrics": {
    "n": 717,
    "mae": 1984.9205,
    "rmse": 2438.0592,
    "bias": 1767.4854,
    "wape": 17.6534,
    "mape": 20.4819,
    "smape": 18.9142
  },
  "unmatched_detail": {
    "start": "2026-01-01 00:00:00+00:00",
    "end": "2026-01-02 02:00:00+00:00",
    "count": 27,
    "reason": "No forecast vintage published ≥24h before delivery. Dataset only contains January 2026 publications — no December 2025 forecasts available."
  }
}
```

---

## 7. How to Run & Validate

### 7.1 Setup Environment

```powershell
# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 7.2 Run Test Suite

The test suite validates data ingestion, schema enforcement, quality validation, temporal diagnostics, alignment mechanics, vintage selection, mathematical metrics, benchmark parity, and REST API endpoints:

```powershell
.\venv\Scripts\python.exe -m pytest tests/ -v
```


### 7.3 Launch the API Server

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Once launched:
* API Root: `http://localhost:8000`
* Swagger UI Documentation: `http://localhost:8000/docs`
* OpenAPI JSON Specification: `http://localhost:8000/openapi.json`

---

## 8. React Frontend Dashboard (`frontend/`)

A government-grade **Electricity Wind Forecast Performance & Purchase Decision Intelligence Dashboard** built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Recharts**, matching the reference mockup.

### 8.1 Technology Stack
* **Framework**: React 19 + TypeScript (Strict Mode)
* **Build System**: Vite 6+ with `@tailwindcss/vite`
* **Styling**: Tailwind CSS with custom palette (Ministerial Navy, Slate, Cobalt Blue, Amber, Emerald)
* **Data Fetching & State**: TanStack Query (React Query) with centralized API client & automatic caching
* **Routing**: React Router with persistent layout shell and active-state sidebar
* **Visualizations**: Recharts (dual-series actual vs forecast, signed error baseline, histogram with percentiles, lead-time decay bar charts, coverage donut chart)

### 8.2 Five Primary Navigation Views
1. **Executive Overview (`/overview`)**:
   * Row 1: 5 Headline KPI Cards (MAE , RMSE, Bias, Coverage , Evaluated Hours ).
   * Row 2: Synchronized actual vs forecast line chart, signed error time series, and error distribution histogram with percentiles.
   * Row 3: Multi-cutoff lead-time comparison bar chart and granular benchmark table.
   * Row 4: Data quality donut chart, unmatched hours bar chart, and key findings card.
2. **Forecast Performance (`/forecast-performance`)**: Full-month continuous time series, daily error metrics, and sortable 744-hour audit table with vintage drill-down modal.
3. **Purchase Lead-Time Analysis (`/lead-time-analysis`)**: Apples-to-apples comparison across 48h, 24h, 12h, 6h, and 1h with toggle between 551h common sample and full coverage sample.
4. **Data Quality & Coverage (`/data-quality`)**: Zero-defect validation matrix (0 duplicates, 0 NaTs, 0 negative values) and 27-hour dataset boundary diagnostic.
5. **Methodology & Evidence (`/methodology`)**: Mathematical formulations, 2-SP/hour alignment rules, Elexon BMRS dataset provenance, and deliberately excluded scope disclosures.

### 8.3 Launch the Frontend

```powershell
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

Once running, access the dashboard at: **`http://localhost:5173`**
