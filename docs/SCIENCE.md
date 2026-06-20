# Scientific basis & literature validation

musclr's coaching is grounded in a versioned, citable evidence module (`packages/core/src/evidence.ts`),
enforced by guardrails: every AI prescription must reference a `principle.id` and stay within cited
numeric bounds, or it's rejected/repaired. Deterministic facts (training scores, nutrient flags,
volume status) are computed in code; the model only explains within those bounds.

## Core training evidence (with primary sources)
- **Volume dose-response** — hypertrophy rises with weekly sets (~0.37%/added set) with diminishing
  returns. Schoenfeld 2017 (10.1080/02640414.2016.1210197); **Pelland et al. 2025, *Sports Medicine*
  (10.1007/s40279-025-02344-w)** — 67 studies, 2,058 participants. *Re-validated 2026-06: the module's
  volume + frequency principles match Pelland's findings (volume is the primary driver with
  diminishing returns; frequency has negligible independent effect once volume is equated and mainly
  helps distribute volume; direct-set counting is the correct unit — which is musclr's set-counting rule).*
- **Minimum effective volume** — ≥10 direct sets/muscle/week. Schoenfeld 2017.
- **Volume landmarks (MEV/MAV/MRV)** — practitioner framework (Renaissance Periodization), tagged as
  `practitioner_guideline`, bounded by the peer-reviewed dose-response above.
- **Frequency** — ≥2×/week per muscle (Schoenfeld 2019, 10.1080/02640414.2018.1555906), nuanced per Pelland 2025.
- **Load / rep ranges** — strength 1–6, hypertrophy ~5–30, endurance 15–25 reps. ACSM 2009
  (10.1249/MSS.0b013e3181915670); Schoenfeld load 2017 (10.1519/JSC.0000000000002200).
- **Proximity to failure** — 0–3 RIR. Helms 2016 (10.1519/SSC.0000000000000218); Robinson 2024
  (10.1007/s40279-024-02069-2).
- **Rest** — 2–3 min for hypertrophy/strength. Schoenfeld 2016 (10.1519/JSC.0000000000001272).
- **Recovery window** — 48–72 h between hard sessions for a muscle. ACSM position stand.
- **Estimated 1RM** — Epley (`w × (1 + reps/30)`; a single rep = the weight itself).

## Recovery / autoregulation (enrichment only — never alters scores)
- Recovery readiness applies a **bounded** multiplier (0.85–1.2×) to the recovery window, cited to
  HRV-guided training (Granero-Gallegos 2020, PMC7663087) and **labeled honestly** as strong for
  endurance, thinner for hypertrophy. It nudges; it never changes the frozen training-load math.

## Nutrition evidence
- **Protein** — 1.4–2.0 g/kg/day for trained individuals. ISSN position stand, Jäger 2017
  (10.1186/s12970-017-0177-8).
- **Energy** — Mifflin–St Jeor BMR × activity × goal.
- **Micros / limits** — DRI/RDA/AI/UL (National Academies / NIH ODS). **Sodium uses the CDRR
  (2,300 mg)**, not a UL (NASEM 2019); **magnesium UL applies to supplements only**. Missing data is
  reported as `unknown`, **never** treated as a deficiency.

## Data sources (real, licensed)
USDA FoodData Central (CC0), Open Food Facts (ODbL), free-exercise-db (Unlicense) — see the in-app
Licenses screen / `packages/core/src/licenses.ts`.

> Pre-commercial-launch: have a sports-medicine professional review the evidence module version, and
> include the standard "not medical advice" disclaimer.
