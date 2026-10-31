/* ===== Eletrólitos ===== */
const aguaCorporal = sel('act', 'Água corporal total', [['Homem adulto (0,6)', 0.6], ['Mulher adulta (0,5)', 0.5], ['Homem idoso (0,5)', 0.5], ['Mulher idosa (0,45)', 0.45], ['Criança (0,6)', 0.6]]);

C({
  id: 'na-corrigido', cat: 'eletro', name: 'Sódio corrigido', desc: 'Correção do sódio na hiperglicemia',
  fields: [num('na', 'Sódio medido', 'mEq/L'), num('gli', 'Glicemia', 'mg/dL')],
  calc: ({ na, gli }) => {
    if (!ok(na, gli)) return null;
    const d = Math.max(0, gli - 100) / 100;
    return { label: 'Na corrigido (Hillier, 2,4)', value: f(na + 2.4 * d, 1), unit: 'mEq/L', extra: [['Na corrigido (Katz, 1,6)', f(na + 1.6 * d, 1) + ' mEq/L']] };
  },
});

C({
  id: 'ca-corrigido', cat: 'eletro', name: 'Cálcio corrigido', desc: 'Correção pela albumina',
  fields: [num('ca', 'Cálcio total', 'mg/dL'), num('alb', 'Albumina', 'g/dL')],
  calc: ({ ca, alb }) => {
    if (!ok(ca, alb)) return null;
    const c = ca + 0.8 * (4 - alb);
    return { value: f(c, 2), unit: 'mg/dL', extra: [['Em mmol/L', f(c / 4.008, 2)]], ...interp(c, [[10.51, 'Hipercalcemia', 'bad'], [8.5, 'Normal (8,5–10,5)', 'ok'], [0, 'Hipocalcemia', 'bad']]) };
  },
});

C({
  id: 'deficit-na', cat: 'eletro', name: 'Déficit de sódio', desc: 'Hiponatremia: sódio necessário para atingir o alvo',
  fields: [num('peso', 'Peso', 'kg'), num('na', 'Sódio atual', 'mEq/L'), num('alvo', 'Sódio alvo', 'mEq/L'), aguaCorporal],
  calc: (v) => {
    if (!ok(v.peso, v.na, v.alvo)) return null;
    const act = v.peso * v.act, d = act * (v.alvo - v.na);
    return { value: f(d, 0), unit: 'mEq', extra: [['Água corporal total', f(act, 1) + ' L'], ['Equivale a NaCl 3%', f(d / 0.513, 0) + ' mL'], ['Equivale a NaCl 0,9%', f(d / 0.154, 0) + ' mL']],
      interp: 'Não corrigir mais que 8–10 mEq/L em 24 h (risco de desmielinização osmótica)', level: v.alvo - v.na > 10 ? 'bad' : 'warn' };
  },
});

C({
  id: 'deficit-agua', cat: 'eletro', name: 'Déficit de água livre', desc: 'Hipernatremia',
  fields: [num('peso', 'Peso', 'kg'), num('na', 'Sódio atual', 'mEq/L'), num('alvo', 'Sódio desejado', 'mEq/L', { def: 140 }), aguaCorporal],
  calc: (v) => {
    if (!ok(v.peso, v.na)) return null;
    const act = v.peso * v.act, d = act * (v.na / (v.alvo || 140) - 1);
    return { value: f(d, 2), unit: 'L', extra: [['Água corporal total', f(act, 1) + ' L'], ['Reposição em 48 h', f(d * 1000 / 48, 0) + ' mL/h + perdas']], interp: 'Reduzir o sódio no máximo 10 mEq/L em 24 h', level: 'warn' };
  },
});

C({
  id: 'adrogue', cat: 'eletro', name: 'Adrogué-Madias', desc: 'Variação prevista do sódio por litro infundido',
  fields: [num('peso', 'Peso', 'kg'), num('na', 'Sódio sérico', 'mEq/L'), aguaCorporal,
    sel('sol', 'Solução infundida', [['NaCl 3% (513 mEq/L)', 513], ['NaCl 5% (855 mEq/L)', 855], ['NaCl 0,9% (154 mEq/L)', 154], ['Ringer lactato (130 mEq/L)', 130], ['NaCl 0,45% (77 mEq/L)', 77], ['SG 5% (0 mEq/L)', 0]]),
    num('k', 'Potássio adicionado à solução', 'mEq/L', { def: 0 })],
  calc: (v) => {
    if (!ok(v.peso, v.na)) return null;
    const act = v.peso * v.act, d = (v.sol + (v.k || 0) - v.na) / (act + 1);
    const ex = [['Água corporal total', f(act, 1) + ' L']];
    if (d !== 0) ex.push(['Volume para variar 8 mEq/L', f(Math.abs(8 / d) * 1000, 0) + ' mL'], ['Velocidade (24 h)', f(Math.abs(8 / d) * 1000 / 24, 0) + ' mL/h']);
    return { label: 'Δ Na por litro', value: (d > 0 ? '+' : '') + f(d, 2), unit: 'mEq/L', extra: ex };
  },
});

C({
  id: 'osm', cat: ['eletro', 'farma'], name: 'Osmolaridade sérica e gap osmolar', desc: 'Inclui estimativa de álcoois tóxicos pelo gap',
  fields: [num('na', 'Sódio', 'mEq/L'), num('gli', 'Glicose', 'mg/dL'), num('bun', 'Ureia', 'mg/dL'), num('osm', 'Osmolalidade medida (opcional)', 'mOsm/kg'), num('etoh', 'Etanol (opcional)', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.na, v.gli, v.bun)) return null;
    const calc = 2 * v.na + v.gli / 18 + v.bun / 6 + (ok(v.etoh) ? v.etoh / 4.6 : 0), ef = 2 * v.na + v.gli / 18;
    const ex = [['Osmolaridade efetiva (tonicidade)', f(ef, 0) + ' mOsm/L']];
    let it = interp(calc, [[296, 'Hiperosmolar', 'warn'], [275, 'Normal (275–295)', 'ok'], [0, 'Hipo-osmolar', 'warn']]);
    if (ok(v.osm)) {
      const gap = v.osm - calc;
      ex.push(['Gap osmolar', f(gap, 0) + ' mOsm'], ['Metanol estimado', f(Math.max(0, gap) * 3.2, 0) + ' mg/dL'], ['Etilenoglicol estimado', f(Math.max(0, gap) * 6.2, 0) + ' mg/dL'], ['Etanol estimado', f(Math.max(0, gap) * 4.6, 0) + ' mg/dL']);
      if (gap > 10) it = { interp: 'Gap osmolar > 10: suspeitar de álcoois tóxicos, manitol, glicerol', level: 'bad' };
    }
    return { label: 'Osmolaridade calculada', value: f(calc, 0), unit: 'mOsm/L', extra: ex, ...it };
  },
});

C({
  id: 'osm-urina', cat: 'eletro', name: 'Osmolaridade urinária', desc: 'Estimada a partir dos solutos urinários',
  fields: [num('na', 'Sódio urinário', 'mEq/L'), num('k', 'Potássio urinário', 'mEq/L'), num('ur', 'Ureia urinária', 'mg/dL'), num('gli', 'Glicose urinária', 'mg/dL', { def: 0 })],
  calc: (v) => {
    if (!ok(v.na, v.k, v.ur)) return null;
    const o = 2 * (v.na + v.k) + v.ur / 6 + (v.gli || 0) / 18;
    return { value: f(o, 0), unit: 'mOsm/L', extra: [['Osmolaridade eletrolítica', f(2 * (v.na + v.k), 0) + ' mOsm/L']] };
  },
});

C({
  id: 'bicarb', cat: ['eletro', 'acido'], name: 'Déficit de bicarbonato', desc: 'Reposição na acidose metabólica',
  fields: [num('peso', 'Peso', 'kg'), num('hco3', 'Bicarbonato atual', 'mEq/L'), num('alvo', 'Bicarbonato alvo', 'mEq/L', { def: 15 }), sel('dist', 'Espaço de distribuição', [['0,5 × peso', 0.5], ['0,4 × peso', 0.4], ['0,3 × peso', 0.3]])],
  calc: (v) => {
    if (!ok(v.peso, v.hco3, v.alvo)) return null;
    const d = v.dist * v.peso * (v.alvo - v.hco3);
    return { value: f(d, 0), unit: 'mEq', extra: [['Administrar 50% inicialmente', f(d / 2, 0) + ' mEq'], ['NaHCO₃ 8,4% (1 mEq/mL)', f(d, 0) + ' mL'], ['NaHCO₃ 1/6 M (0,167 mEq/mL)', f(d / 0.167, 0) + ' mL']], interp: 'Repor metade em 2–4 h e reavaliar gasometria', level: 'warn' };
  },
});

C({
  id: 'ssh', cat: 'eletro', name: 'Preparo de salina hipertônica', desc: 'Volume de NaCl concentrado + SF 0,9% para a concentração desejada',
  fields: [num('vf', 'Volume final', 'mL', { def: 500 }), num('alvo', 'Concentração desejada', '%', { def: 3 }), sel('amp', 'Ampola de NaCl', [['NaCl 20%', 20], ['NaCl 17,7%', 17.7], ['NaCl 10%', 10]]),
    sel('base', 'Diluente', [['SF 0,9%', 0.9], ['Água destilada / SG 5%', 0]])],
  calc: (v) => {
    if (!ok(v.vf, v.alvo)) return null;
    if (v.alvo >= v.amp || v.alvo <= v.base) return { value: '—', interp: 'Concentração desejada fora do intervalo possível', level: 'bad' };
    const x = v.vf * (v.alvo - v.base) / (v.amp - v.base);
    return { label: `NaCl ${f(v.amp)}%`, value: f(x, 0), unit: 'mL', extra: [['Diluente', f(v.vf - x, 0) + ' mL'], ['Sódio final', f(v.alvo * 171.1, 0) + ' mEq/L'], ['Osmolaridade', f(v.alvo * 342.2, 0) + ' mOsm/L']] };
  },
});

const ions = [['Sódio (Na⁺)', 22.99, 1], ['Potássio (K⁺)', 39.1, 1], ['Cloro (Cl⁻)', 35.45, 1], ['Cálcio (Ca²⁺)', 40.08, 2], ['Magnésio (Mg²⁺)', 24.31, 2], ['Fósforo (P)', 30.97, 1.8], ['Bicarbonato (HCO₃⁻)', 61.02, 1],
  ['NaCl', 58.44, 1], ['KCl', 74.55, 1], ['Gluconato de cálcio', 430.37, 2], ['Cloreto de cálcio (CaCl₂·2H₂O)', 147.01, 2], ['Sulfato de magnésio (MgSO₄·7H₂O)', 246.47, 2], ['Bicarbonato de sódio', 84.01, 1]];
C({
  id: 'mg-meq', cat: ['eletro', 'conv'], name: 'Conversor mg ⇔ mmol ⇔ mEq', desc: 'Eletrólitos e sais',
  fields: [sel('i', 'Substância', ions.map(([n], i) => [n, i])), num('x', 'Valor', ''), sel('u', 'Unidade', [['mg', 'mg'], ['mmol', 'mmol'], ['mEq', 'meq']])],
  calc: ({ i, x, u }) => {
    if (!ok(x)) return null;
    const [, pm, val] = ions[i];
    const mmol = u === 'mg' ? x / pm : u === 'mmol' ? x : x / val;
    return { label: 'mEq', value: f(mmol * val, 2), extra: [['mmol', f(mmol, 2)], ['mg', f(mmol * pm, 1)], ['g', f(mmol * pm / 1000, 3)]] };
  },
});
