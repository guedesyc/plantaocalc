/* ===== Fármacos ===== */
const doseUnits = [['µg/kg/min', 'ugkgmin'], ['µg/kg/h', 'ugkgh'], ['mg/kg/h', 'mgkgh'], ['µg/min', 'ugmin'], ['mg/h', 'mgh'], ['UI/h', 'uih'], ['UI/min', 'uimin']];
/* Converte a dose para µg/h (ou UI/h) */
const toPerHour = (d, u, p) => ({ ugkgmin: d * p * 60, ugkgh: d * p, mgkgh: d * p * 1000, ugmin: d * 60, mgh: d * 1000, uih: d, uimin: d * 60 }[u]);
const fromPerHour = (x, u, p) => ({ ugkgmin: x / p / 60, ugkgh: x / p, mgkgh: x / p / 1000, ugmin: x / 60, mgh: x / 1000, uih: x, uimin: x / 60 }[u]);

C({
  id: 'infusao', cat: 'farma', name: 'Infusão contínua', desc: 'Dose ↔ velocidade da bomba (mL/h)',
  fields: [sel('modo', 'Calcular', [['Velocidade (mL/h) a partir da dose', 'v'], ['Dose a partir da velocidade', 'd']]),
    num('qtd', 'Quantidade do fármaco na solução', 'mg ou UI'), num('vol', 'Volume total da solução', 'mL'), num('peso', 'Peso', 'kg'),
    sel('u', 'Unidade da dose', doseUnits), num('dose', 'Dose (se calculando velocidade)', ''), num('vel', 'Velocidade (se calculando dose)', 'mL/h')],
  calc: (v) => {
    if (!ok(v.qtd, v.vol) || v.vol <= 0) return null;
    const ui = v.u.startsWith('ui');
    const conc = ui ? v.qtd / v.vol : v.qtd * 1000 / v.vol; // µg/mL ou UI/mL
    const p = ok(v.peso) ? v.peso : NaN;
    const ex = [['Concentração', ui ? f(conc, 2) + ' UI/mL' : f(conc, 1) + ' µg/mL (' + f(conc / 1000, 3) + ' mg/mL)']];
    if (v.modo === 'v') {
      if (!ok(v.dose)) return null;
      const h = toPerHour(v.dose, v.u, p);
      if (!Number.isFinite(h)) return { value: '—', interp: 'Informe o peso para doses por kg', level: 'warn' };
      return { label: 'Velocidade da bomba', value: f(h / conc, 2), unit: 'mL/h', extra: ex };
    }
    if (!ok(v.vel)) return null;
    const d = fromPerHour(v.vel * conc, v.u, p);
    if (!Number.isFinite(d)) return { value: '—', interp: 'Informe o peso para doses por kg', level: 'warn' };
    return { label: 'Dose administrada', value: f(d, 3), unit: doseUnits.find((x) => x[1] === v.u)[0], extra: ex };
  },
});

C({
  id: 'diluicao', cat: 'farma', name: 'Preparo manual de infusão', desc: 'Quantidade de fármaco para que 1 mL/h = dose desejada',
  fields: [num('peso', 'Peso', 'kg'), num('dose', 'Dose por mL/h desejada', 'µg/kg/min', { def: 0.1 }), num('vol', 'Volume final da solução', 'mL', { def: 250 }), num('amp', 'Conteúdo por ampola', 'mg')],
  calc: (v) => {
    if (!ok(v.peso, v.dose, v.vol)) return null;
    const mg = v.dose * v.peso * 60 * v.vol / 1000;
    return { label: 'Adicionar ao soro', value: f(mg, 2), unit: 'mg', extra: ok(v.amp) && v.amp > 0 ? [['Ampolas', f(mg / v.amp, 2)]] : [], interp: `Nessa solução, 1 mL/h = ${f(v.dose, 3)} µg/kg/min`, level: 'ok' };
  },
});

C({
  id: 'paracetamol', cat: 'farma', name: 'Intoxicação por paracetamol', desc: 'Nomograma de Rumack-Matthew',
  fields: [num('h', 'Horas desde a ingestão', 'h'), num('nivel', 'Nível plasmático', 'µg/mL (mg/L)'), num('peso', 'Peso (opcional)', 'kg'), num('dose', 'Dose ingerida (opcional)', 'g')],
  calc: (v) => {
    const ex = [];
    if (ok(v.peso, v.dose)) ex.push(['Dose ingerida', f(v.dose * 1000 / v.peso, 0) + ' mg/kg' + (v.dose * 1000 / v.peso >= 150 ? ' (potencialmente tóxica)' : '')]);
    if (!ok(v.h, v.nivel)) return ex.length ? { value: '—', extra: ex } : null;
    if (v.h < 4) return { value: '—', extra: ex, interp: 'Dosar o nível após 4 h da ingestão', level: 'warn' };
    if (v.h > 24) return { value: '—', extra: ex, interp: 'Nomograma não validado após 24 h: tratar se nível detectável ou transaminases elevadas', level: 'warn' };
    const l150 = 150 * 2 ** (-(v.h - 4) / 4), l100 = 100 * 2 ** (-(v.h - 4) / 4);
    return { label: 'Linha de tratamento (150)', value: f(l150, 0), unit: 'µg/mL', extra: [['Linha de 100 (alto risco)', f(l100, 0) + ' µg/mL'], ...ex],
      ...(v.nivel >= l150 ? { interp: 'Acima da linha de tratamento: iniciar N-acetilcisteína', level: 'bad' } : v.nivel >= l100 ? { interp: 'Acima da linha 100: tratar se fatores de risco', level: 'warn' } : { interp: 'Abaixo da linha de tratamento', level: 'ok' }) };
  },
});

C({
  id: 'nac', cat: 'farma', name: 'N-acetilcisteína IV', desc: 'Esquema de 21 h (3 bolsas) na intoxicação por paracetamol',
  fields: [num('peso', 'Peso', 'kg')],
  calc: ({ peso }) => {
    if (!ok(peso)) return null;
    const p = Math.min(peso, 110);
    return { label: 'Dose total', value: f(300 * p / 1000, 1), unit: 'g',
      extra: [['1ª bolsa (1 h)', f(150 * p, 0) + ' mg em 200 mL SG5%'], ['2ª bolsa (4 h)', f(50 * p, 0) + ' mg em 500 mL SG5%'], ['3ª bolsa (16 h)', f(100 * p, 0) + ' mg em 1000 mL SG5%'],
        ['Volume NAC 20% (200 mg/mL)', f(150 * p / 200, 1) + ' / ' + f(50 * p / 200, 1) + ' / ' + f(100 * p / 200, 1) + ' mL']],
      interp: peso > 110 ? 'Dose calculada com peso máximo de 110 kg' : 'Total 300 mg/kg em 21 h', level: 'ok' };
  },
});

const corticoides = [['Hidrocortisona', 20], ['Cortisona', 25], ['Prednisona', 5], ['Prednisolona', 5], ['Metilprednisolona', 4], ['Triancinolona', 4], ['Deflazacorte', 7.5], ['Dexametasona', 0.75], ['Betametasona', 0.6]];
C({
  id: 'corticoides', cat: ['farma', 'conv'], name: 'Equivalência de corticoides', desc: 'Doses anti-inflamatórias equivalentes',
  fields: [sel('d', 'Corticoide', corticoides.map(([n], i) => [n, i])), num('dose', 'Dose', 'mg')],
  calc: ({ d, dose }) => {
    if (!ok(dose)) return null;
    const pred = dose / corticoides[d][1] * 5;
    return { label: 'Equivalente em prednisona', value: f(pred, 1), unit: 'mg', extra: corticoides.map(([n, e]) => [n, f(pred / 5 * e, 2) + ' mg']) };
  },
});

C({
  id: 'tih', cat: 'farma', name: 'Trombocitopenia por heparina (4T)', desc: 'Probabilidade pré-teste de TIH', score: true,
  fields: [sel('t', 'Trombocitopenia', [['Queda < 30% ou nadir < 10.000', 0], ['Queda 30–50% ou nadir 10–19.000', 1], ['Queda > 50% e nadir ≥ 20.000', 2]]),
    sel('tm', 'Tempo de início', [['< 4 dias sem exposição recente', 0], ['> 10º dia, tempo incerto ou ≤ 1 dia (heparina há 30–100 dias)', 1], ['5º–10º dia ou ≤ 1 dia (heparina < 30 dias)', 2]]),
    sel('tr', 'Trombose ou sequela', [['Nenhuma', 0], ['Progressiva/recorrente, lesões eritematosas ou suspeita', 1], ['Nova trombose, necrose cutânea ou reação sistêmica', 2]]),
    sel('o', 'Outras causas de plaquetopenia', [['Definida', 0], ['Possível', 1], ['Nenhuma aparente', 2]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 8', ...interp(_t, [[6, 'Probabilidade alta: suspender heparina e anticoagulante alternativo', 'bad'], [4, 'Probabilidade intermediária: testar anticorpos', 'warn'], [0, 'Probabilidade baixa (< 5%)', 'ok']]) }),
});

C({
  id: 'scorten', cat: 'farma', name: 'SCORTEN', desc: 'Mortalidade na necrólise epidérmica tóxica', score: true,
  fields: [chk('a', 'Idade ≥ 40 anos'), chk('b', 'Neoplasia associada'), chk('c', 'FC ≥ 120 bpm'), chk('d', 'Descolamento epidérmico > 10% da SC'), chk('e', 'Ureia > 60 mg/dL (BUN > 28)'),
    chk('g', 'Glicemia > 252 mg/dL'), chk('h', 'Bicarbonato < 20 mEq/L')],
  calc: ({ _t }) => {
    const m = ['3,2%', '3,2%', '12,1%', '35,3%', '58,3%'][_t] ?? '> 90%';
    return { value: _t, unit: 'pontos', extra: [['Mortalidade prevista', m]], ...interp(_t, [[3, 'Alto risco', 'bad'], [2, 'Risco moderado', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'ccp', cat: 'farma', name: 'Reversão de antagonista da vitamina K', desc: 'Dose de complexo protrombínico (CCP 4 fatores) pelo INR',
  fields: [num('peso', 'Peso', 'kg'), num('inr', 'INR')],
  calc: ({ peso, inr }) => {
    if (!ok(peso, inr)) return null;
    if (inr < 2) return { value: '—', interp: 'INR < 2: considerar vitamina K isolada ou 10–15 UI/kg conforme protocolo local', level: 'warn' };
    const u = inr < 4 ? 25 : inr <= 6 ? 35 : 50, d = Math.min(u * peso, u * 100);
    return { label: 'Dose de CCP', value: f(d, 0), unit: 'UI', extra: [['Dose por kg', u + ' UI/kg'], ['Associar', 'Vitamina K 10 mg IV']], interp: peso > 100 ? 'Dose máxima calculada para 100 kg' : 'Repetir INR 30 min após a infusão', level: 'ok' };
  },
});

C({
  id: 'parkland', cat: ['farma', 'eletro'], name: 'Parkland (queimados)', desc: 'Reposição volêmica nas primeiras 24 h',
  fields: [num('peso', 'Peso', 'kg'), num('scq', 'Superfície corporal queimada (2º/3º grau)', '%'), sel('k', 'Fórmula', [['Parkland 4 mL/kg/%', 4], ['Brooke modificada 2 mL/kg/%', 2]])],
  calc: ({ peso, scq, k }) => {
    if (!ok(peso, scq)) return null;
    const t = k * peso * scq;
    return { label: 'Ringer lactato em 24 h', value: f(t, 0), unit: 'mL', extra: [['Primeiras 8 h', f(t / 2, 0) + ' mL (' + f(t / 16, 0) + ' mL/h)'], ['16 h seguintes', f(t / 2, 0) + ' mL (' + f(t / 32, 0) + ' mL/h)']],
      interp: 'Ajustar pela diurese: 0,5–1 mL/kg/h', level: 'ok' };
  },
});
