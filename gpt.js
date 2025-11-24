(function () {
    const DEFAULT_OPENAI_KEY = typeof sessionStorage !== 'undefined'
        ? (sessionStorage.getItem('OPENAI_API_KEY') || '')
        : '';

    async function generateConditionRecommendationsWithGPT(conditions, patient, metricsByCondition, scoresByCondition) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click “Set API Key” and paste your key.' };
        }

        const payload = {
            patient: {
                id: patient.id,
                name: patient.name,
                age: metricsByCondition.common?.age,
                sex: metricsByCondition.common?.sex,
                bmi: metricsByCondition.common?.bmi
            },
            conditions: conditions,
            metrics: metricsByCondition,
            scores: scoresByCondition
        };

        const system = [
            'You are a clinical assistant generating condition-specific, actionable recommendations.',
            'Use provided wearable metrics and risk scores. Keep outputs consistent and deterministic.',
            'Output strict JSON with an array per condition: { condition, recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements, not huge swings.'
        ].join(' ');

        const user = [
            'Generate recommendations for the following patient data. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                // Try to extract JSON between braces
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };
            return { data: parsed };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }

    window.generateConditionRecommendationsWithGPT = generateConditionRecommendationsWithGPT;

    // Deep, per-disease rubrics guiding AI scoring
    // Each rubric lists drivers with ranges or discrete values and contribution points.
    // The scorer should:
    // - Sum contributions from present drivers
    // - Apply protective drivers (negative points where specified)
    // - Add small missing-data penalties where noted
    // - Clamp final score to [0,100]
    // - Set week0 of the trajectory = score, then apply small week-to-week changes (±0–6) based on metrics
    const AI_RUBRICS = {
        diabetes: {
            baseline: 0,
            missingPenalty: 4,
            drivers: [
                // Glycemic control
                { key: 'hba1c', ranges: [
                    { min: 4.8, max: 5.4, points: [0, 5] },
                    { min: 5.4, max: 5.9, points: [5, 15] },
                    { min: 5.9, max: 6.5, points: [15, 35] },
                    { min: 6.5, max: 9.5, points: [35, 60] }
                ]},
                // Fallback glucose if HbA1c missing
                { key: 'avgGlucoseMgDl', optional: true, ranges: [
                    { min: 85, max: 125, points: [5, 40] },
                    { min: 125, max: 200, points: [40, 60] }
                ]},
                // Adiposity
                { key: 'bmi', ranges: [
                    { min: 18.5, max: 23, points: [0, 5] },
                    { min: 23, max: 27, points: [5, 12] },
                    { min: 27, max: 32, points: [12, 22] },
                    { min: 32, max: 45, points: [22, 30] }
                ]},
                // Physical activity (inverse: fewer steps → more risk)
                { key: 'stepsDaily', inverse: true, ranges: [{ min: 0, max: 12000, points: [0, 15] }]},
                // Sleep quality
                { key: 'sleepEfficiency', ranges: [{ min: 70, max: 95, points: [8, 0] }]},
                // Sleep duration (discrete bins)
                { key: 'sleepDurationHours', discrete: [
                    { range: [7, 9], points: 0 },
                    { range: [6, 7], points: 3 },
                    { range: [9, 10], points: 2 },
                    { range: [0, 6], points: 6 },
                    { range: [10, 24], points: 6 }
                ]},
                // Family history
                { key: 'familyHistoryDiabetes', discrete: [
                    { value: 'multiple', points: 15 },
                    { value: 'close', points: 10 },
                    { value: 'distant', points: 6 },
                    { value: 'none', points: 0 }
                ]},
                // Cardiorespiratory fitness (protective)
                { key: 'vo2max', protective: true, ranges: [{ min: 25, max: 50, points: [8, -5] }]}
            ],
            trajectory: { volatility: 4 }
        },

        hypertension: {
            baseline: 0,
            missingPenalty: 6,
            drivers: [
                // Category by higher of systolic/diastolic
                { keys: ['bpSystolic', 'bpDiastolic'], category: [
                    { systolic: [0, 120], diastolic: [0, 80], base: 0 },
                    { systolic: [120, 130], diastolic: [0, 80], base: 8 },
                    { systolic: [130, 140], diastolic: [80, 90], base: 20, any: true },
                    { systolic: [140, 160], diastolic: [90, 100], base: 35, any: true },
                    { systolic: [160, 400], diastolic: [100, 200], base: 50, any: true }
                ], extra: [
                    { key: 'bpSystolic', ranges: [{ min: 120, max: 180, points: [0, 15] }]},
                    { key: 'bpDiastolic', ranges: [{ min: 80, max: 110, points: [0, 10] }]}
                ]},
                { key: 'sodiumIntakeMg', ranges: [{ min: 1500, max: 3500, points: [0, 12] }]},
                { key: 'bmi', ranges: [{ min: 23, max: 35, points: [0, 12] }]},
                { key: 'alcoholUnitsWeekly', ranges: [{ min: 0, max: 20, points: [0, 8] }]},
                { key: 'stepsDaily', inverse: true, ranges: [{ min: 0, max: 12000, points: [0, 8] }]},
                { key: 'restingHR', ranges: [{ min: 55, max: 85, points: [0, 8] }]}
            ],
            trajectory: { volatility: 5 }
        },

        'heart-disease': {
            baseline: 5,
            missingPenalty: 6,
            drivers: [
                { key: 'ldl', ranges: [
                    { min: 70, max: 100, points: [0, 10] },
                    { min: 100, max: 160, points: [10, 25] },
                    { min: 160, max: 220, points: [25, 35] }
                ]},
                { key: 'hdl', protective: true, ranges: [
                    { min: 40, max: 60, points: [10, 0] },
                    { min: 60, max: 80, points: [0, -5] }
                ]},
                { key: 'triglycerides', ranges: [
                    { min: 100, max: 200, points: [2, 10] },
                    { min: 200, max: 400, points: [10, 18] }
                ]},
                { keys: ['bpSystolic', 'bpDiastolic'], extra: [
                    { key: 'bpSystolic', ranges: [{ min: 120, max: 180, points: [0, 15] }]},
                    { key: 'bpDiastolic', ranges: [{ min: 80, max: 110, points: [0, 10] }]}
                ]},
                { key: 'age', ranges: [{ min: 35, max: 80, points: [5, 15] }]},
                { key: 'smoker', discrete: [{ value: true, points: 15 }, { value: false, points: 0 }]},
                { key: 'hasDiabetes', discrete: [{ value: true, points: 10 }, { value: false, points: 0 }]},
                { key: 'stepsDaily', inverse: true, ranges: [{ min: 0, max: 12000, points: [0, 10] }]}
            ],
            trajectory: { volatility: 5 }
        },

        asthma: {
            baseline: 0,
            missingPenalty: 5,
            drivers: [
                // Lower SpO2 → higher risk
                { key: 'spo2', ranges: [{ min: 92, max: 98, points: [18, 0] }]},
                { key: 'respRate', ranges: [{ min: 12, max: 24, points: [0, 12] }]},
                { key: 'stepsDaily', inverse: true, ranges: [{ min: 0, max: 12000, points: [0, 8] }]},
                { key: 'sleepEfficiency', ranges: [{ min: 70, max: 95, points: [10, 0] }]}
            ],
            trajectory: { volatility: 4 }
        },

        arthritis: {
            baseline: 0,
            missingPenalty: 6,
            drivers: [
                { key: 'bmi', ranges: [{ min: 23, max: 40, points: [0, 30] }]},
                { key: 'stepsDaily', inverse: true, ranges: [{ min: 0, max: 15000, points: [0, 20] }]},
                { key: 'jointPainScore', ranges: [{ min: 0, max: 10, points: [0, 25] }]},
                { key: 'age', ranges: [{ min: 35, max: 80, points: [2, 10] }]}
            ],
            trajectory: { volatility: 3 }
        },

        parkinsons: {
            baseline: 0,
            missingPenalty: 6,
            drivers: [
                { key: 'gaitStabilityScore', ranges: [{ min: 60, max: 90, points: [35, 0] }]}, // lower → worse
                { key: 'tremorEpisodesWeekly', ranges: [{ min: 0, max: 50, points: [0, 35] }]},
                { key: 'sleepEfficiency', ranges: [{ min: 70, max: 95, points: [10, 0] }]},
                { key: 'stepsDaily', inverse: true, ranges: [{ min: 0, max: 12000, points: [0, 8] }]}
            ],
            trajectory: { volatility: 4 }
        }
    };

    async function generateRiskScoresAndTrajectoriesWithGPT(conditions, patient, metricsByCondition) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click “Set API Key” and paste your key.' };
        }

        const payload = {
            patient: { id: patient.id, name: patient.name },
            conditions,
            metrics: metricsByCondition,
            rubrics: AI_RUBRICS
        };

        const system = [
            'You are a clinical risk scoring engine.',
            'For each condition, strictly apply the provided rubric (payload.rubrics):',
            '- Sum contributions from driver ranges/bins; apply protective (negative) points.',
            '- Add small missing-data penalties where specified.',
            '- Clamp final risk to [0,100]. Respect monotonicity for key drivers (e.g., higher HbA1c should not reduce diabetes risk).',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–5 per week total).',
            'Return only JSON: { items: [{ condition, score, trajectory: [n0..n5], rationale }] }',
            'Rationale: 1 short sentence citing strongest drivers.'
        ].join(' ');

        const user = [
            'Compute disease scores and 6-week trajectories per the provided rubrics. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.items)) {
                return { error: 'Failed to parse JSON items from model' };
            }

            // Sanitize values and clamp ranges
            parsed.items = parsed.items.map(it => ({
                condition: String(it.condition || '').toLowerCase(),
                score: Math.max(0, Math.min(100, Math.round(Number(it.score) || 0))),
                trajectory: Array.isArray(it.trajectory)
                    ? it.trajectory.slice(0, 6).map((n, idx) => {
                        const v = Math.round(Number(n) || 0);
                        // ensure week0 = score
                        if (idx === 0) return Math.max(0, Math.min(100, Math.round(Number(it.score) || 0)));
                        return Math.max(0, Math.min(100, v));
                    })
                    : [],
                rationale: String(it.rationale || '')
            }));

            return { data: parsed };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }

    window.generateRiskScoresAndTrajectoriesWithGPT = generateRiskScoresAndTrajectoriesWithGPT;

    async function generateTrajectoryAdviceWithGPT(condition, baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition,
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics
        };
        const system = [
            'You are a clinical assistant.',
            'Given a projected risk peak, propose concrete steps to avoid it.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }

    window.generateTrajectoryAdviceWithGPT = generateTrajectoryAdviceWithGPT;

    // ============================================================================
    // DISEASE-SPECIFIC GPT WRAPPER FUNCTIONS
    // Each disease has its own specialized wrapper for easier customization
    // ============================================================================

    // DIABETES - Risk Scores and Trajectories
    async function generateDiabetesRiskScoresWithGPT(patient, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'diabetes',
            patient: { id: patient.id, name: patient.name },
            metrics: metrics,
            rubric: AI_RUBRICS.diabetes
        };

        const system = [
            'You are a clinical risk scoring engine specializing in diabetes risk assessment.',
            'Focus on glycemic control (HbA1c, glucose), adiposity (BMI), physical activity, sleep quality, and family history.',
            'Apply the provided rubric strictly:',
            '- Sum contributions from driver ranges/bins; apply protective (negative) points for VO2max.',
            '- Add missing-data penalties (4 points) where specified.',
            '- Clamp final risk to [0,100]. Higher HbA1c/glucose must increase risk.',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–4 per week).',
            'Return only JSON: { score, trajectory: [n0..n5], rationale }',
            'Rationale: 1 short sentence citing strongest drivers (e.g., "Elevated HbA1c at 7.2% and low activity levels drive risk").'
        ].join(' ');

        const user = [
            'Compute diabetes risk score and 6-week trajectory per the provided rubric. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };

            // Sanitize
            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            const trajectory = Array.isArray(parsed.trajectory)
                ? parsed.trajectory.slice(0, 6).map((n, idx) => {
                    const v = Math.round(Number(n) || 0);
                    if (idx === 0) return score;
                    return Math.max(0, Math.min(100, v));
                })
                : [score, score, score, score, score, score];

            return { data: { condition: 'diabetes', score, trajectory, rationale: String(parsed.rationale || '') } };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateDiabetesRiskScoresWithGPT = generateDiabetesRiskScoresWithGPT;

    // HYPERTENSION - Risk Scores and Trajectories
    async function generateHypertensionRiskScoresWithGPT(patient, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'hypertension',
            patient: { id: patient.id, name: patient.name },
            metrics: metrics,
            rubric: AI_RUBRICS.hypertension
        };

        const system = [
            'You are a clinical risk scoring engine specializing in hypertension risk assessment.',
            'Focus on blood pressure (systolic/diastolic), sodium intake, BMI, alcohol consumption, activity, and resting heart rate.',
            'Apply the provided rubric strictly:',
            '- Categorize BP by higher of systolic/diastolic; apply base points accordingly.',
            '- Add contributions from sodium, BMI, alcohol, activity, and resting HR.',
            '- Add missing-data penalties (6 points) where specified.',
            '- Clamp final risk to [0,100]. Higher BP must increase risk.',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–5 per week).',
            'Return only JSON: { score, trajectory: [n0..n5], rationale }',
            'Rationale: 1 short sentence citing strongest drivers (e.g., "Stage 1 hypertension (138/88) and high sodium intake drive risk").'
        ].join(' ');

        const user = [
            'Compute hypertension risk score and 6-week trajectory per the provided rubric. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };

            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            const trajectory = Array.isArray(parsed.trajectory)
                ? parsed.trajectory.slice(0, 6).map((n, idx) => {
                    const v = Math.round(Number(n) || 0);
                    if (idx === 0) return score;
                    return Math.max(0, Math.min(100, v));
                })
                : [score, score, score, score, score, score];

            return { data: { condition: 'hypertension', score, trajectory, rationale: String(parsed.rationale || '') } };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateHypertensionRiskScoresWithGPT = generateHypertensionRiskScoresWithGPT;

    // HEART DISEASE - Risk Scores and Trajectories
    async function generateHeartDiseaseRiskScoresWithGPT(patient, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'heart-disease',
            patient: { id: patient.id, name: patient.name },
            metrics: metrics,
            rubric: AI_RUBRICS['heart-disease']
        };

        const system = [
            'You are a clinical risk scoring engine specializing in cardiovascular disease risk assessment.',
            'Focus on lipid profile (LDL, HDL, triglycerides), blood pressure, age, smoking status, diabetes comorbidity, and activity.',
            'Apply the provided rubric strictly:',
            '- Sum contributions from LDL, triglycerides, BP, age, smoking, diabetes status, and activity.',
            '- Apply protective (negative) points for HDL.',
            '- Add missing-data penalties (6 points) where specified.',
            '- Clamp final risk to [0,100]. Higher LDL/BP/age must increase risk.',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–5 per week).',
            'Return only JSON: { score, trajectory: [n0..n5], rationale }',
            'Rationale: 1 short sentence citing strongest drivers (e.g., "Elevated LDL (165 mg/dL) and smoking status drive cardiovascular risk").'
        ].join(' ');

        const user = [
            'Compute heart disease risk score and 6-week trajectory per the provided rubric. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };

            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            const trajectory = Array.isArray(parsed.trajectory)
                ? parsed.trajectory.slice(0, 6).map((n, idx) => {
                    const v = Math.round(Number(n) || 0);
                    if (idx === 0) return score;
                    return Math.max(0, Math.min(100, v));
                })
                : [score, score, score, score, score, score];

            return { data: { condition: 'heart-disease', score, trajectory, rationale: String(parsed.rationale || '') } };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateHeartDiseaseRiskScoresWithGPT = generateHeartDiseaseRiskScoresWithGPT;

    // ASTHMA - Risk Scores and Trajectories
    async function generateAsthmaRiskScoresWithGPT(patient, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'asthma',
            patient: { id: patient.id, name: patient.name },
            metrics: metrics,
            rubric: AI_RUBRICS.asthma
        };

        const system = [
            'You are a clinical risk scoring engine specializing in asthma risk assessment.',
            'Focus on oxygen saturation (SpO2), respiratory rate, physical activity, and sleep efficiency.',
            'Apply the provided rubric strictly:',
            '- Lower SpO2 increases risk; higher respiratory rate increases risk.',
            '- Lower activity and poor sleep efficiency increase risk.',
            '- Add missing-data penalties (5 points) where specified.',
            '- Clamp final risk to [0,100]. Lower SpO2 must increase risk.',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–4 per week).',
            'Return only JSON: { score, trajectory: [n0..n5], rationale }',
            'Rationale: 1 short sentence citing strongest drivers (e.g., "SpO2 at 93% and elevated respiratory rate (22/min) indicate airway instability").'
        ].join(' ');

        const user = [
            'Compute asthma risk score and 6-week trajectory per the provided rubric. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };

            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            const trajectory = Array.isArray(parsed.trajectory)
                ? parsed.trajectory.slice(0, 6).map((n, idx) => {
                    const v = Math.round(Number(n) || 0);
                    if (idx === 0) return score;
                    return Math.max(0, Math.min(100, v));
                })
                : [score, score, score, score, score, score];

            return { data: { condition: 'asthma', score, trajectory, rationale: String(parsed.rationale || '') } };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateAsthmaRiskScoresWithGPT = generateAsthmaRiskScoresWithGPT;

    // ARTHRITIS - Risk Scores and Trajectories
    async function generateArthritisRiskScoresWithGPT(patient, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'arthritis',
            patient: { id: patient.id, name: patient.name },
            metrics: metrics,
            rubric: AI_RUBRICS.arthritis
        };

        const system = [
            'You are a clinical risk scoring engine specializing in arthritis risk assessment.',
            'Focus on BMI, physical activity (steps), joint pain score, and age.',
            'Apply the provided rubric strictly:',
            '- Higher BMI increases risk; lower activity increases risk.',
            '- Higher joint pain score increases risk; older age increases risk.',
            '- Add missing-data penalties (6 points) where specified.',
            '- Clamp final risk to [0,100]. Higher BMI/pain must increase risk.',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–3 per week).',
            'Return only JSON: { score, trajectory: [n0..n5], rationale }',
            'Rationale: 1 short sentence citing strongest drivers (e.g., "BMI of 32 and joint pain score of 7/10 drive arthritis risk").'
        ].join(' ');

        const user = [
            'Compute arthritis risk score and 6-week trajectory per the provided rubric. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };

            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            const trajectory = Array.isArray(parsed.trajectory)
                ? parsed.trajectory.slice(0, 6).map((n, idx) => {
                    const v = Math.round(Number(n) || 0);
                    if (idx === 0) return score;
                    return Math.max(0, Math.min(100, v));
                })
                : [score, score, score, score, score, score];

            return { data: { condition: 'arthritis', score, trajectory, rationale: String(parsed.rationale || '') } };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateArthritisRiskScoresWithGPT = generateArthritisRiskScoresWithGPT;

    // PARKINSONS - Risk Scores and Trajectories
    async function generateParkinsonsRiskScoresWithGPT(patient, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'parkinsons',
            patient: { id: patient.id, name: patient.name },
            metrics: metrics,
            rubric: AI_RUBRICS.parkinsons
        };

        const system = [
            'You are a clinical risk scoring engine specializing in Parkinson\'s disease risk assessment.',
            'Focus on gait stability score, tremor episodes, sleep efficiency, and physical activity.',
            'Apply the provided rubric strictly:',
            '- Lower gait stability increases risk; more tremor episodes increase risk.',
            '- Poor sleep efficiency and lower activity increase risk.',
            '- Add missing-data penalties (6 points) where specified.',
            '- Clamp final risk to [0,100]. Lower gait stability must increase risk.',
            '- Generate a 6-week trajectory: week0 = score; subsequent weeks change gradually (±0–4 per week).',
            'Return only JSON: { score, trajectory: [n0..n5], rationale }',
            'Rationale: 1 short sentence citing strongest drivers (e.g., "Gait stability at 68/100 and 15 tremor episodes/week indicate motor decline").'
        ].join(' ');

        const user = [
            'Compute Parkinson\'s risk score and 6-week trajectory per the provided rubric. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed) return { error: 'Failed to parse JSON from model' };

            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            const trajectory = Array.isArray(parsed.trajectory)
                ? parsed.trajectory.slice(0, 6).map((n, idx) => {
                    const v = Math.round(Number(n) || 0);
                    if (idx === 0) return score;
                    return Math.max(0, Math.min(100, v));
                })
                : [score, score, score, score, score, score];

            return { data: { condition: 'parkinsons', score, trajectory, rationale: String(parsed.rationale || '') } };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateParkinsonsRiskScoresWithGPT = generateParkinsonsRiskScoresWithGPT;

    // ============================================================================
    // DISEASE-SPECIFIC RECOMMENDATION FUNCTIONS
    // ============================================================================

    // DIABETES - Recommendations
    async function generateDiabetesRecommendationsWithGPT(patient, metrics, scoreContext) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'diabetes',
            patient: {
                id: patient.id,
                name: patient.name,
                age: metrics.age,
                sex: metrics.sex,
                bmi: metrics.bmi
            },
            metrics: metrics,
            scoreContext: scoreContext,
            focusAreas: ['glycemic control', 'weight management', 'physical activity', 'sleep quality', 'medication adherence']
        };

        const system = [
            'You are a clinical assistant specializing in diabetes care, generating actionable, condition-specific recommendations.',
            'Focus on: HbA1c/glucose management, weight loss (if BMI >25), daily activity goals, sleep hygiene, and medication adherence.',
            'Output strict JSON: { recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements.',
            'Prioritize recommendations that address the highest risk drivers (e.g., if HbA1c >7%, focus on glycemic control).',
            'Make recommendations specific, measurable, and time-bound (e.g., "Aim for 10,000 steps daily" not "exercise more").'
        ].join(' ');

        const user = [
            'Generate diabetes-specific recommendations for this patient. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.recommendations)) {
                return { error: 'Failed to parse recommendations from model' };
            }

            return { data: parsed.recommendations.map(r => ({
                title: r.title || 'Recommendation',
                note: r.note || r.description || '',
                impactPoints: Math.max(1, Math.min(8, Number(r.impactPoints || 1)))
            })) };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateDiabetesRecommendationsWithGPT = generateDiabetesRecommendationsWithGPT;

    // HYPERTENSION - Recommendations
    async function generateHypertensionRecommendationsWithGPT(patient, metrics, scoreContext) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'hypertension',
            patient: {
                id: patient.id,
                name: patient.name,
                age: metrics.age,
                sex: metrics.sex,
                bmi: metrics.bmi
            },
            metrics: metrics,
            scoreContext: scoreContext,
            focusAreas: ['blood pressure control', 'sodium reduction', 'weight management', 'alcohol moderation', 'regular exercise']
        };

        const system = [
            'You are a clinical assistant specializing in hypertension care, generating actionable, condition-specific recommendations.',
            'Focus on: BP control, sodium reduction (<2g/day), weight loss (if BMI >25), alcohol moderation, and regular aerobic exercise.',
            'Output strict JSON: { recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements.',
            'Prioritize recommendations that address the highest risk drivers (e.g., if BP >140/90, focus on medication adherence and lifestyle).',
            'Make recommendations specific, measurable, and time-bound.'
        ].join(' ');

        const user = [
            'Generate hypertension-specific recommendations for this patient. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.recommendations)) {
                return { error: 'Failed to parse recommendations from model' };
            }

            return { data: parsed.recommendations.map(r => ({
                title: r.title || 'Recommendation',
                note: r.note || r.description || '',
                impactPoints: Math.max(1, Math.min(8, Number(r.impactPoints || 1)))
            })) };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateHypertensionRecommendationsWithGPT = generateHypertensionRecommendationsWithGPT;

    // HEART DISEASE - Recommendations
    async function generateHeartDiseaseRecommendationsWithGPT(patient, metrics, scoreContext) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'heart-disease',
            patient: {
                id: patient.id,
                name: patient.name,
                age: metrics.age,
                sex: metrics.sex,
                bmi: metrics.bmi
            },
            metrics: metrics,
            scoreContext: scoreContext,
            focusAreas: ['lipid management', 'blood pressure control', 'smoking cessation', 'diabetes management', 'cardiac rehabilitation']
        };

        const system = [
            'You are a clinical assistant specializing in cardiovascular disease care, generating actionable, condition-specific recommendations.',
            'Focus on: lipid management (LDL <100), BP control, smoking cessation, diabetes management, and cardiac rehabilitation.',
            'Output strict JSON: { recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements.',
            'Prioritize recommendations that address the highest risk drivers (e.g., if LDL >160, focus on statin adherence and diet).',
            'Make recommendations specific, measurable, and time-bound.'
        ].join(' ');

        const user = [
            'Generate heart disease-specific recommendations for this patient. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.recommendations)) {
                return { error: 'Failed to parse recommendations from model' };
            }

            return { data: parsed.recommendations.map(r => ({
                title: r.title || 'Recommendation',
                note: r.note || r.description || '',
                impactPoints: Math.max(1, Math.min(8, Number(r.impactPoints || 1)))
            })) };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateHeartDiseaseRecommendationsWithGPT = generateHeartDiseaseRecommendationsWithGPT;

    // ASTHMA - Recommendations
    async function generateAsthmaRecommendationsWithGPT(patient, metrics, scoreContext) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'asthma',
            patient: {
                id: patient.id,
                name: patient.name,
                age: metrics.age,
                sex: metrics.sex,
                bmi: metrics.bmi
            },
            metrics: metrics,
            scoreContext: scoreContext,
            focusAreas: ['inhaler technique', 'trigger avoidance', 'action plan adherence', 'peak flow monitoring', 'sleep quality']
        };

        const system = [
            'You are a clinical assistant specializing in asthma care, generating actionable, condition-specific recommendations.',
            'Focus on: inhaler technique, trigger avoidance, asthma action plan adherence, peak flow monitoring, and sleep quality.',
            'Output strict JSON: { recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements.',
            'Prioritize recommendations that address the highest risk drivers (e.g., if SpO2 <94%, focus on medication optimization).',
            'Make recommendations specific, measurable, and time-bound.'
        ].join(' ');

        const user = [
            'Generate asthma-specific recommendations for this patient. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.recommendations)) {
                return { error: 'Failed to parse recommendations from model' };
            }

            return { data: parsed.recommendations.map(r => ({
                title: r.title || 'Recommendation',
                note: r.note || r.description || '',
                impactPoints: Math.max(1, Math.min(8, Number(r.impactPoints || 1)))
            })) };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateAsthmaRecommendationsWithGPT = generateAsthmaRecommendationsWithGPT;

    // ARTHRITIS - Recommendations
    async function generateArthritisRecommendationsWithGPT(patient, metrics, scoreContext) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'arthritis',
            patient: {
                id: patient.id,
                name: patient.name,
                age: metrics.age,
                sex: metrics.sex,
                bmi: metrics.bmi
            },
            metrics: metrics,
            scoreContext: scoreContext,
            focusAreas: ['pain management', 'joint-friendly exercise', 'weight management', 'medication adherence', 'assistive devices']
        };

        const system = [
            'You are a clinical assistant specializing in arthritis care, generating actionable, condition-specific recommendations.',
            'Focus on: pain management, joint-friendly exercise (swimming, cycling), weight loss (if BMI >25), medication adherence, and assistive devices.',
            'Output strict JSON: { recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements.',
            'Prioritize recommendations that address the highest risk drivers (e.g., if pain score >7, focus on medication optimization).',
            'Make recommendations specific, measurable, and time-bound.'
        ].join(' ');

        const user = [
            'Generate arthritis-specific recommendations for this patient. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.recommendations)) {
                return { error: 'Failed to parse recommendations from model' };
            }

            return { data: parsed.recommendations.map(r => ({
                title: r.title || 'Recommendation',
                note: r.note || r.description || '',
                impactPoints: Math.max(1, Math.min(8, Number(r.impactPoints || 1)))
            })) };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateArthritisRecommendationsWithGPT = generateArthritisRecommendationsWithGPT;

    // PARKINSONS - Recommendations
    async function generateParkinsonsRecommendationsWithGPT(patient, metrics, scoreContext) {
        const apiKey = DEFAULT_OPENAI_KEY;
        if (!apiKey) {
            return { error: 'API key not set. Click "Set API Key" and paste your key.' };
        }

        const payload = {
            condition: 'parkinsons',
            patient: {
                id: patient.id,
                name: patient.name,
                age: metrics.age,
                sex: metrics.sex,
                bmi: metrics.bmi
            },
            metrics: metrics,
            scoreContext: scoreContext,
            focusAreas: ['medication timing', 'gait training', 'tremor management', 'sleep optimization', 'fall prevention']
        };

        const system = [
            'You are a clinical assistant specializing in Parkinson\'s disease care, generating actionable, condition-specific recommendations.',
            'Focus on: medication timing (levodopa), gait training, tremor management, sleep optimization, and fall prevention.',
            'Output strict JSON: { recommendations: [{ title, note, impactPoints }] }',
            'impactPoints should be small (1–8), reflecting realistic marginal improvements.',
            'Prioritize recommendations that address the highest risk drivers (e.g., if gait stability <70, focus on physical therapy).',
            'Make recommendations specific, measurable, and time-bound.'
        ].join(' ');

        const user = [
            'Generate Parkinson\'s-specific recommendations for this patient. Return only JSON.',
            JSON.stringify(payload)
        ].join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });

            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return { error: 'No content from model' };

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch {
                const match = content.match(/\{[\s\S]*\}/);
                parsed = match ? JSON.parse(match[0]) : null;
            }
            if (!parsed || !Array.isArray(parsed.recommendations)) {
                return { error: 'Failed to parse recommendations from model' };
            }

            return { data: parsed.recommendations.map(r => ({
                title: r.title || 'Recommendation',
                note: r.note || r.description || '',
                impactPoints: Math.max(1, Math.min(8, Number(r.impactPoints || 1)))
            })) };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateParkinsonsRecommendationsWithGPT = generateParkinsonsRecommendationsWithGPT;

    // ============================================================================
    // DISEASE-SPECIFIC TRAJECTORY ADVICE FUNCTIONS
    // ============================================================================

    // DIABETES - Trajectory Advice
    async function generateDiabetesTrajectoryAdviceWithGPT(baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition: 'diabetes',
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics,
            focusAreas: ['glycemic control', 'weight management', 'activity levels']
        };
        const system = [
            'You are a clinical assistant specializing in diabetes care.',
            'Given a projected risk peak, propose concrete steps to avoid it, focusing on glycemic control, weight management, and activity.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.',
            'Be specific: mention HbA1c targets, daily step goals, or dietary changes.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateDiabetesTrajectoryAdviceWithGPT = generateDiabetesTrajectoryAdviceWithGPT;

    // HYPERTENSION - Trajectory Advice
    async function generateHypertensionTrajectoryAdviceWithGPT(baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition: 'hypertension',
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics,
            focusAreas: ['blood pressure control', 'sodium reduction', 'medication adherence']
        };
        const system = [
            'You are a clinical assistant specializing in hypertension care.',
            'Given a projected risk peak, propose concrete steps to avoid it, focusing on BP control, sodium reduction, and medication adherence.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.',
            'Be specific: mention BP targets, daily sodium limits, or exercise goals.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateHypertensionTrajectoryAdviceWithGPT = generateHypertensionTrajectoryAdviceWithGPT;

    // HEART DISEASE - Trajectory Advice
    async function generateHeartDiseaseTrajectoryAdviceWithGPT(baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition: 'heart-disease',
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics,
            focusAreas: ['lipid management', 'blood pressure control', 'smoking cessation']
        };
        const system = [
            'You are a clinical assistant specializing in cardiovascular disease care.',
            'Given a projected risk peak, propose concrete steps to avoid it, focusing on lipid management, BP control, and smoking cessation.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.',
            'Be specific: mention LDL targets, statin adherence, or cardiac rehab goals.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateHeartDiseaseTrajectoryAdviceWithGPT = generateHeartDiseaseTrajectoryAdviceWithGPT;

    // ASTHMA - Trajectory Advice
    async function generateAsthmaTrajectoryAdviceWithGPT(baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition: 'asthma',
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics,
            focusAreas: ['inhaler technique', 'trigger avoidance', 'medication optimization']
        };
        const system = [
            'You are a clinical assistant specializing in asthma care.',
            'Given a projected risk peak, propose concrete steps to avoid it, focusing on inhaler technique, trigger avoidance, and medication optimization.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.',
            'Be specific: mention peak flow monitoring, environmental triggers, or controller medication adjustments.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateAsthmaTrajectoryAdviceWithGPT = generateAsthmaTrajectoryAdviceWithGPT;

    // ARTHRITIS - Trajectory Advice
    async function generateArthritisTrajectoryAdviceWithGPT(baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition: 'arthritis',
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics,
            focusAreas: ['pain management', 'joint-friendly exercise', 'weight management']
        };
        const system = [
            'You are a clinical assistant specializing in arthritis care.',
            'Given a projected risk peak, propose concrete steps to avoid it, focusing on pain management, joint-friendly exercise, and weight management.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.',
            'Be specific: mention NSAID timing, low-impact exercise options, or weight loss targets.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateArthritisTrajectoryAdviceWithGPT = generateArthritisTrajectoryAdviceWithGPT;

    // PARKINSONS - Trajectory Advice
    async function generateParkinsonsTrajectoryAdviceWithGPT(baseScore, peakWeekIndex, peakScore, metrics) {
        const apiKey = DEFAULT_OPENAI_KEY;
        const payload = {
            condition: 'parkinsons',
            baseScore,
            peak: { weekIndex: peakWeekIndex, score: peakScore },
            metrics,
            focusAreas: ['medication timing', 'gait training', 'fall prevention']
        };
        const system = [
            'You are a clinical assistant specializing in Parkinson\'s disease care.',
            'Given a projected risk peak, propose concrete steps to avoid it, focusing on medication timing, gait training, and fall prevention.',
            'Return a short paragraph (2–3 sentences), clinically sound and realistic.',
            'Be specific: mention levodopa timing, physical therapy exercises, or home safety modifications.'
        ].join(' ');
        const user = JSON.stringify(payload);

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ]
                })
            });
            if (!res.ok) {
                const err = await res.text();
                return { error: `OpenAI error: ${err}` };
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            return { data: content.trim() };
        } catch (e) {
            return { error: e.message || 'Failed to call GPT API' };
        }
    }
    window.generateParkinsonsTrajectoryAdviceWithGPT = generateParkinsonsTrajectoryAdviceWithGPT;

})();


// In gpt.js, ensure backend-first and always-on AI grading
const DEFAULT_OPENAI_KEY = typeof sessionStorage !== 'undefined'
  ? (sessionStorage.getItem('OPENAI_API_KEY') || 'REPLACE_WITH_DEMO_KEY')
  : 'REPLACE_WITH_DEMO_KEY';

function backendAvailable() {
  return typeof window !== 'undefined' && typeof window.API_BASE_URL === 'string' && window.API_BASE_URL.length > 0;
}

async function postToBackend(path, payload) {
  if (!backendAvailable()) return null;
  try {
    const res = await fetch(`${window.API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Backend ${path} failed`);
    return await res.json();
  } catch (err) {
    console.warn('Backend call failed, falling back to OpenAI:', err);
    return null;
  }
}

export async function generateRiskScoresAndTrajectoriesWithGPT(conditions, patient, metrics) {
  const payload = {
    conditions,
    patient,
    metrics,
    constraints: {
      deterministic: true,
      temperature: 0,
      scoreRange: [0, 100],
      horizonWeeks: 6,
    },
  };

  // Prefer backend proxy when available
  const backendResult = await postToBackend('/ai/scores-trajectories', payload);
  if (backendResult && backendResult.success && backendResult.data) {
    return backendResult.data;
  }

  // Fallback to direct OpenAI
  const apiKey = DEFAULT_OPENAI_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a clinical risk scoring engine. Output strict JSON with per-condition scores (0-100), 6-week trajectories, and brief rationales. Be deterministic.',
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI scoring failed: ${response.status}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  // Sanitize values
  for (const c of conditions) {
    const cond = parsed[c] || {};
    cond.score = Math.max(0, Math.min(100, Number(cond.score || 0)));
    cond.trajectory = Array.isArray(cond.trajectory) ? cond.trajectory.map(v => Math.max(0, Math.min(100, Number(v || 0)))) : [];
    parsed[c] = cond;
  }

  return parsed;
}

export async function generateConditionRecommendationsWithGPT(condition, patient, metrics, scoreContext) {
  const payload = {
    condition,
    patient,
    metrics,
    scoreContext,
    constraints: { deterministic: true, temperature: 0, impactRange: [0.5, 3] },
  };

  // Prefer backend proxy when available
  const backendResult = await postToBackend('/ai/recommendations', payload);
  if (backendResult && backendResult.success && Array.isArray(backendResult.recommendations)) {
    return backendResult.recommendations;
  }

  // Fallback to direct OpenAI
  const apiKey = DEFAULT_OPENAI_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a clinical recommendation engine. Return an array of recommendations with title, description, and small impactPoints. Be deterministic and consistent.',
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI recommendations failed: ${response.status}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '{"recommendations": []}';
  const parsed = JSON.parse(content);
  const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

  // Sanitize impactPoints
  return recs.map(r => ({
    title: r.title || 'Recommendation',
    description: r.description || '',
    impactPoints: Math.max(0.5, Math.min(3, Number(r.impactPoints || 1))),
  }));
}