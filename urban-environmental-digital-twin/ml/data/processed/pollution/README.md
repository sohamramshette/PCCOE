# Processed OpenAQ Pune Hourly Air Quality Dataset

## Overview
This directory stores hourly aggregated ground-truth ambient air quality measurements resampled from 15-minute OpenAQ observations for the 6 core Pune monitoring stations.

## Primary Artifact
* **File:** `openaq_hourly_processed.csv`
* **Grain:** `(station_id, datetime_utc)`
* **Data Classification:** `OBSERVED`

## Completeness Flag Definitions
* `COMPLETE`: 3 or 4 valid quarter-hourly observations (>= 75% coverage).
* `PARTIAL`: Exactly 2 valid quarter-hourly observations (50% coverage).
* `INSUFFICIENT`: Exactly 1 valid quarter-hourly observation (25% coverage).
* `MISSING`: 0 observations (station sensor offline).
