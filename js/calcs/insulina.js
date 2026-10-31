/* ===== Insulinoterapia ===== */
C({
  id: 'insulina-iv', cat: 'insul', name: 'Insulina IV – início', desc: 'Bolus e infusão inicial (insulina regular 1 UI/mL)',
  fields: [num('gli', 'Glicemia', 'mg/dL'), sel('ctx', 'Contexto', [['Hiperglicemia no paciente crítico', 'h'], ['Cetoacidose / estado hiperosmolar', 'c']]), num('peso', 'Peso (para CAD)', 'kg')],
  calc: (v) => {
    if (!ok(v.gli)) return null;
    if (v.ctx === 'c') {
      if (!ok(v.peso)) return null;
      return { label: 'Infusão inicial', value: f(0.1 * v.peso, 1), unit: 'UI/h', extra: [['Bolus opcional', f(0.1 * v.peso, 1) + ' UI IV'], ['Alternativa sem bolus', f(0.14 * v.peso, 1) + ' UI/h']],
        interp: 'Só iniciar com K ≥ 3,3 mEq/L. Meta de queda: 50–75 mg/dL/h. Adicionar SG 5% quando glicemia < 250.', level: 'warn' };
    }
    if (v.gli < 180) return { value: '—', interp: 'Glicemia < 180 mg/dL: insulina IV não indicada', level: 'ok' };
    const r = Math.round((v.gli / 100) * 2) / 2;
    return { label: 'Bolus e infusão', value: f(r, 1), unit: 'UI + UI/h', interp: 'Glicemia ÷ 100, arredondado a 0,5 UI. Meta 140–180 mg/dL; glicemia capilar a cada 1 h.', level: 'warn' };
  },
});

C({
  id: 'insulina-iv-ajuste', cat: 'insul', name: 'Insulina IV – ajuste', desc: 'Ajuste da infusão pela variação da glicemia',
  fields: [num('atual', 'Glicemia atual', 'mg/dL'), num('ant', 'Glicemia anterior (1 h)', 'mg/dL'), num('vel', 'Infusão atual', 'UI/h')],
  calc: ({ atual, ant, vel }) => {
    if (!ok(atual, ant, vel)) return null;
    const d = atual - ant;
    if (atual < 70) return { value: 'Suspender', interp: 'Hipoglicemia: suspender infusão, SG 50% 25–50 mL, glicemia em 15 min; reiniciar com 50% da dose quando > 140', level: 'bad' };
    if (atual < 100) return { label: 'Nova infusão', value: 'Suspender', interp: 'Suspender; reavaliar em 30 min e reiniciar com 50% da dose quando > 140 mg/dL', level: 'warn' };
    let nv, msg;
    if (atual <= 140) { nv = d < 0 ? vel * 0.5 : vel * 0.75; msg = 'Abaixo da meta: reduzir'; }
    else if (atual <= 180) { nv = d > 0 ? vel : (d < -40 ? vel * 0.75 : vel); msg = 'Na meta (140–180)'; }
    else if (atual <= 250) { nv = d >= 0 ? vel + 1 : d > -40 ? vel + 0.5 : vel; msg = 'Acima da meta'; }
    else { nv = d >= 0 ? vel + 2 : d > -60 ? vel + 1 : vel; msg = 'Muito acima da meta'; }
    return { label: 'Nova infusão', value: f(Math.max(0, nv), 1), unit: 'UI/h', extra: [['Variação', (d > 0 ? '+' : '') + f(d, 0) + ' mg/dL/h']], interp: msg + '. Verificar glicemia em 1 h.', level: atual > 180 ? 'warn' : 'ok' };
  },
});

C({
  id: 'insulina-sc', cat: 'insul', name: 'Insulina SC – basal-bolus', desc: 'Dose inicial no paciente internado',
  fields: [num('peso', 'Peso', 'kg'), sel('perfil', 'Perfil do paciente', [['Idoso (> 70 a), IRC (TFG < 30) ou baixo peso: 0,3 UI/kg', 0.3], ['Glicemia 140–200 mg/dL: 0,4 UI/kg', 0.4], ['Glicemia 201–400 mg/dL: 0,5 UI/kg', 0.5]]),
    sel('dieta', 'Alimentação', [['Via oral', 'o'], ['Jejum / dieta zero', 'j']])],
  calc: (v) => {
    if (!ok(v.peso)) return null;
    const dtd = v.peso * v.perfil, basal = dtd / 2, bolus = dtd / 2 / 3;
    return { label: 'Dose total diária', value: f(dtd, 0), unit: 'UI/dia',
      extra: [['Basal (glargina/NPH)', f(basal, 0) + ' UI/dia'], ['Prandial (rápida)', v.dieta === 'o' ? f(bolus, 0) + ' UI antes de cada refeição' : 'Não administrar (jejum)'],
        ['Fator de sensibilidade (1800/DTD)', '1 UI ↓ ' + f(1800 / dtd, 0) + ' mg/dL'], ['Relação insulina/carboidrato (500/DTD)', '1 UI : ' + f(500 / dtd, 0) + ' g']],
      interp: 'Associar correção conforme glicemia capilar pré-prandial', level: 'ok' };
  },
});

C({
  id: 'insulina-sc-ajuste', cat: 'insul', name: 'Insulina SC – ajuste', desc: 'Ajuste da basal pela glicemia de jejum',
  fields: [num('basal', 'Dose basal atual', 'UI'), num('jejum', 'Glicemia de jejum (média)', 'mg/dL')],
  calc: ({ basal, jejum }) => {
    if (!ok(basal, jejum)) return null;
    const p = jejum < 70 ? -0.2 : jejum < 100 ? -0.1 : jejum <= 140 ? 0 : jejum <= 180 ? 0.1 : 0.2;
    return { label: 'Nova dose basal', value: f(basal * (1 + p), 0), unit: 'UI', extra: [['Ajuste', (p > 0 ? '+' : '') + f(p * 100, 0) + '%']],
      interp: p < 0 ? 'Reduzir basal (hipoglicemia / glicemia baixa)' : p > 0 ? 'Aumentar basal' : 'Manter dose (meta 100–140 mg/dL)', level: p ? 'warn' : 'ok' };
  },
});
