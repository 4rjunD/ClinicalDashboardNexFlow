(function () {
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function scale(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
    return outMin + t * (outMax - outMin);
  }

  function boolWeight(value, pointsIfTrue) {
    return value ? pointsIfTrue : 0;
  }

  // Diabetes risk rubric (0–100)
  function diabetesRisk(m) {
    let risk = 0;

    // HbA1c: <5.4 best, 5.5–5.9 mild, 6.0–6.4 moderate, ≥6.5 high
    if (typeof m.hba1c === 'number') {
      if (m.hba1c < 5.4) risk += scale(m.hba1c, 4.8, 5.4, 0, 5);
      else if (m.hba1c < 5.9) risk += scale(m.hba1c, 5.4, 5.9, 5, 15);
      else if (m.hba1c < 6.5) risk += scale(m.hba1c, 5.9, 6.5, 15, 35);
      else risk += scale(m.hba1c, 6.5, 9.5, 35, 60);
    } else if (typeof m.avgGlucoseMgDl === 'number') {
      // Fallback on average glucose
      risk += scale(m.avgGlucoseMgDl, 85, 125, 5, 40) + scale(m.avgGlucoseMgDl, 125, 200, 40, 60);
    } else {
      risk += 15; // unknown glucose => small conservative risk
    }

    // BMI
    if (typeof m.bmi === 'number') {
      if (m.bmi < 23) risk += scale(m.bmi, 18.5, 23, 0, 5);
      else if (m.bmi < 27) risk += scale(m.bmi, 23, 27, 5, 12);
      else if (m.bmi < 32) risk += scale(m.bmi, 27, 32, 12, 22);
      else risk += scale(m.bmi, 32, 45, 22, 30);
    } else {
      risk += 8;
    }

    // Steps (protective)
    if (typeof m.stepsDaily === 'number') {
      risk += scale(m.stepsDaily, 12000, 0, 0, 15); // fewer steps increases risk
    } else {
      risk += 6;
    }

    // Sleep efficiency and duration
    if (typeof m.sleepEfficiency === 'number') {
      risk += scale(m.sleepEfficiency, 95, 70, 0, 8);
    } else {
      risk += 3;
    }
    if (typeof m.sleepDurationHours === 'number') {
      // 7–9 hours best; <6 or >10 worse
      const sd = m.sleepDurationHours;
      if (sd >= 7 && sd <= 9) risk += 0;
      else if (sd >= 6 && sd < 7) risk += 3;
      else if (sd > 9 && sd <= 10) risk += 2;
      else risk += 6;
    } else {
      risk += 2;
    }

    // Family history
    switch (m.familyHistoryDiabetes) {
      case 'multiple':
        risk += 15;
        break;
      case 'close':
        risk += 10;
        break;
      case 'distant':
        risk += 6;
        break;
      case 'none':
        risk += 0;
        break;
      default:
        risk += 5;
    }

    // VO2max (protective)
    if (typeof m.vo2max === 'number') {
      risk += scale(m.vo2max, 50, 25, -5, 8);
    }

    return clamp(Math.round(risk), 0, 100);
  }

  // Hypertension risk rubric (0–100)
  function hypertensionRisk(m) {
    let risk = 0;

    // Blood pressure categories
    const s = m.bpSystolic;
    const d = m.bpDiastolic;
    if (typeof s === 'number' && typeof d === 'number') {
      // Assign based on higher category (systolic or diastolic)
      let base = 0;
      if (s < 120 && d < 80) base = 0;
      else if ((s >= 120 && s < 130) && d < 80) base = 8; // elevated
      else if ((s >= 130 && s < 140) || (d >= 80 && d < 90)) base = 20; // stage 1
      else if ((s >= 140 && s < 160) || (d >= 90 && d < 100)) base = 35; // stage 2
      else if (s >= 160 || d >= 100) base = 50; // severe
      risk += base + scale(s, 120, 180, 0, 15) + scale(d, 80, 110, 0, 10);
    } else {
      risk += 20;
    }

    // Sodium intake (mg/day)
    if (typeof m.sodiumIntakeMg === 'number') {
      risk += scale(m.sodiumIntakeMg, 1500, 3500, 0, 12);
    } else risk += 4;

    // BMI
    if (typeof m.bmi === 'number') {
      risk += scale(m.bmi, 23, 35, 0, 12);
    } else risk += 6;

    // Alcohol units per week
    if (typeof m.alcoholUnitsWeekly === 'number') {
      risk += scale(m.alcoholUnitsWeekly, 0, 20, 0, 8);
    }

    // Activity (steps)
    if (typeof m.stepsDaily === 'number') {
      risk += scale(m.stepsDaily, 12000, 0, 0, 8);
    }

    // Resting heart rate (proxy for fitness)
    if (typeof m.restingHR === 'number') {
      risk += scale(m.restingHR, 55, 85, 0, 8);
    }

    return clamp(Math.round(risk), 0, 100);
  }

  // Heart disease risk rubric (0–100)
  function heartDiseaseRisk(m) {
    let risk = 0;

    // Lipids
    if (typeof m.ldl === 'number') {
      risk += scale(m.ldl, 70, 100, 0, 10) + scale(m.ldl, 100, 160, 10, 25) + scale(m.ldl, 160, 220, 25, 35);
    } else risk += 10;

    if (typeof m.hdl === 'number') {
      // Protective if high HDL
      risk += scale(m.hdl, 40, 60, 10, 0) + scale(m.hdl, 60, 80, 0, -5);
    } else risk += 6;

    if (typeof m.triglycerides === 'number') {
      risk += scale(m.triglycerides, 100, 200, 2, 10) + scale(m.triglycerides, 200, 400, 10, 18);
    } else risk += 6;

    // Blood pressure
    if (typeof m.bpSystolic === 'number' && typeof m.bpDiastolic === 'number') {
      risk += scale(Math.max(m.bpSystolic - 120, 0), 0, 60, 0, 15) + scale(Math.max(m.bpDiastolic - 80, 0), 0, 30, 0, 10);
    } else risk += 10;

    // Age
    if (typeof m.age === 'number') {
      risk += scale(m.age, 35, 80, 5, 15);
    }

    // Smoking
    risk += boolWeight(!!m.smoker, 15);

    // Diabetes comorbidity
    risk += boolWeight(!!m.hasDiabetes, 10);

    // Activity
    if (typeof m.stepsDaily === 'number') {
      risk += scale(m.stepsDaily, 12000, 0, 0, 10);
    }

    return clamp(Math.round(risk), 0, 100);
  }

  // Asthma risk rubric (0–100)
  function asthmaRisk(m) {
    let risk = 0;

    // SpO2 and resp rate proxies
    if (typeof m.spo2 === 'number') {
      risk += scale(m.spo2, 98, 92, 0, 18);
    } else risk += 8;

    if (typeof m.respRate === 'number') {
      risk += scale(m.respRate, 12, 24, 0, 12);
    } else risk += 6;

    // Activity (as a proxy for symptoms limiting)
    if (typeof m.stepsDaily === 'number') {
      risk += scale(m.stepsDaily, 12000, 0, 0, 8);
    }

    // Sleep quality (night symptoms)
    if (typeof m.sleepEfficiency === 'number') {
      risk += scale(m.sleepEfficiency, 95, 70, 0, 10);
    }

    return clamp(Math.round(risk), 0, 100);
  }

  // Arthritis risk rubric (0–100)
  function arthritisRisk(m) {
    let risk = 0;

    // BMI load
    if (typeof m.bmi === 'number') {
      risk += scale(m.bmi, 23, 40, 0, 30);
    } else risk += 10;

    // Steps/activity (protective for pain/ stiffness up to a point)
    if (typeof m.stepsDaily === 'number') {
      risk += scale(m.stepsDaily, 15000, 0, 0, 20);
    } else risk += 8;

    // Pain score if present
    if (typeof m.jointPainScore === 'number') {
      risk += scale(m.jointPainScore, 0, 10, 0, 25);
    }

    // Age (degenerative)
    if (typeof m.age === 'number') {
      risk += scale(m.age, 35, 80, 2, 10);
    }

    return clamp(Math.round(risk), 0, 100);
  }

  // Parkinson’s risk rubric (0–100) — wearable proxies (gait stability, tremor episodes)
  function parkinsonsRisk(m) {
    let risk = 0;

    if (typeof m.gaitStabilityScore === 'number') {
      // Lower stability => higher risk
      risk += scale(m.gaitStabilityScore, 90, 60, 0, 35);
    } else risk += 12;

    if (typeof m.tremorEpisodesWeekly === 'number') {
      risk += scale(m.tremorEpisodesWeekly, 0, 50, 0, 35);
    } else risk += 10;

    // Sleep disturbances
    if (typeof m.sleepEfficiency === 'number') {
      risk += scale(m.sleepEfficiency, 95, 70, 0, 10);
    }

    // Activity
    if (typeof m.stepsDaily === 'number') {
      risk += scale(m.stepsDaily, 12000, 0, 0, 8);
    }

    return clamp(Math.round(risk), 0, 100);
  }

  const MODEL_MAP = {
    diabetes: diabetesRisk,
    hypertension: hypertensionRisk,
    'heart-disease': heartDiseaseRisk,
    asthma: asthmaRisk,
    arthritis: arthritisRisk,
    parkinsons: parkinsonsRisk
  };

  function computeDiseaseRisk(condition, metrics) {
    const fn = MODEL_MAP[(condition || '').toLowerCase()];
    if (!fn) return 25; // unknown conditions → low baseline risk
    return clamp(Math.round(fn(metrics || {})), 0, 100);
  }

  window.NF_RiskModel = {
    computeDiseaseRisk
  };
})();