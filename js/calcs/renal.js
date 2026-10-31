/* ===== Renal ===== */
const kdigo = (g) => interp(g, [[90, 'G1 – normal ou alta', 'ok'], [60, 'G2 – levemente diminuída', 'ok'], [45, 'G3a – leve a moderada', 'warn'], [30, 'G3b – moderada a grave', 'warn'], [15, 'G4 – gravemente diminuída', 'bad'], [0, 'G5 – falência renal', 'bad']]);

C({
  id: 'cockcroft', cat: 'renal', name: 'Cockcroft-Gault', desc: 'Clearance de creatinina estimado',
  fields: [num('idade', 'Idade', 'anos'), num('peso', 'Peso', 'kg'), num('cr', 'Creatinina', 'mg/dL'), sexo(), num('alt', 'Altura (opcional, para peso ideal)', 'cm')],
  calc: (v) => {
    if (!ok(v.idade, v.peso, v.cr)) return null;
    const cg = (p) => ((140 - v.idade) * p / (72 * v.cr)) * (v.sexo === 'F' ? 0.85 : 1);
    const ex = [];
    if (ok(v.alt)) {
      const pi = pesoIdeal(v.alt, v.sexo), pa = pi + 0.4 * (v.peso - pi);
      ex.push(['Com peso ideal (' + f(pi, 0) + ' kg)', f(cg(pi), 0) + ' mL/min'], ['Com peso ajustado (' + f(pa, 0) + ' kg)', f(cg(pa), 0) + ' mL/min']);
    }
    const c = cg(v.peso);
    return { value: f(c, 0), unit: 'mL/min', extra: ex, ...kdigo(c) };
  },
});

C({
  id: 'ckdepi', cat: 'renal', name: 'TFG – CKD-EPI 2021', desc: 'Taxa de filtração glomerular estimada (creatinina e/ou cistatina C)',
  fields: [num('idade', 'Idade', 'anos'), sexo(), num('cr', 'Creatinina', 'mg/dL'), num('cys', 'Cistatina C (opcional)', 'mg/L')],
  calc: (v) => {
    if (!ok(v.idade, v.cr)) return null;
    const F = v.sexo === 'F', k = F ? 0.7 : 0.9, r = v.cr / k;
    const gcr = 142 * Math.min(r, 1) ** (F ? -0.241 : -0.302) * Math.max(r, 1) ** -1.2 * 0.9938 ** v.idade * (F ? 1.012 : 1);
    const ex = [['TFG por creatinina', f(gcr, 0) + ' mL/min/1,73m²']];
    let g = gcr;
    if (ok(v.cys)) {
      const c = v.cys / 0.8;
      const gcys = 133 * Math.min(c, 1) ** -0.499 * Math.max(c, 1) ** -1.328 * 0.996 ** v.idade * (F ? 0.932 : 1);
      g = 135 * Math.min(r, 1) ** (F ? -0.219 : -0.144) * Math.max(r, 1) ** -0.544 * Math.min(c, 1) ** -0.323 * Math.max(c, 1) ** -0.778 * 0.9961 ** v.idade * (F ? 0.963 : 1);
      ex.push(['TFG por cistatina C', f(gcys, 0) + ' mL/min/1,73m²']);
    }
    return { label: ok(v.cys) ? 'TFG creatinina + cistatina' : 'TFG estimada', value: f(g, 0), unit: 'mL/min/1,73m²', extra: ex, ...kdigo(g) };
  },
});

C({
  id: 'clcr', cat: 'renal', name: 'Clearance de creatinina (urina)', desc: 'Medido em urina de 6, 12 ou 24 h',
  fields: [num('ucr', 'Creatinina urinária', 'mg/dL'), num('vol', 'Volume urinário', 'mL'), num('h', 'Tempo de coleta', 'horas', { def: 24 }), num('pcr', 'Creatinina plasmática', 'mg/dL'),
    num('peso', 'Peso (opcional)', 'kg'), num('alt', 'Altura (opcional)', 'cm')],
  calc: (v) => {
    if (!ok(v.ucr, v.vol, v.h, v.pcr)) return null;
    const c = (v.ucr * v.vol) / (v.pcr * v.h * 60);
    const ex = [];
    if (ok(v.peso, v.alt)) ex.push(['Corrigido para 1,73 m²', f(c * 1.73 / asc(v.peso, v.alt), 0) + ' mL/min/1,73m²']);
    ex.push(['Creatinina excretada', f(v.ucr * v.vol / 100 * (24 / v.h), 0) + ' mg/24h']);
    return { value: f(c, 0), unit: 'mL/min', extra: ex, ...kdigo(c) };
  },
});

C({
  id: 'fena', cat: ['renal', 'eletro'], name: 'Excreção fracionada de sódio (FENa)', desc: 'Diferencia lesão renal pré-renal de necrose tubular',
  fields: [num('una', 'Sódio urinário', 'mEq/L'), num('pna', 'Sódio plasmático', 'mEq/L'), num('ucr', 'Creatinina urinária', 'mg/dL'), num('pcr', 'Creatinina plasmática', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.una, v.pna, v.ucr, v.pcr)) return null;
    const x = (v.una * v.pcr) / (v.pna * v.ucr) * 100;
    return { value: f(x, 2), unit: '%', ...interp(x, [[2, 'FENa > 2%: lesão renal intrínseca (NTA)', 'bad'], [1, 'FENa 1–2%: indeterminado', 'warn'], [0, 'FENa < 1%: pré-renal (não confiável com diuréticos)', 'ok']]) };
  },
});

C({
  id: 'feurea', cat: ['renal', 'eletro'], name: 'Excreção fracionada de ureia (FEUreia)', desc: 'Útil em pacientes em uso de diuréticos',
  fields: [num('uu', 'Ureia urinária', 'mg/dL'), num('pu', 'Ureia plasmática', 'mg/dL'), num('ucr', 'Creatinina urinária', 'mg/dL'), num('pcr', 'Creatinina plasmática', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.uu, v.pu, v.ucr, v.pcr)) return null;
    const x = (v.uu * v.pcr) / (v.pu * v.ucr) * 100;
    return { value: f(x, 1), unit: '%', ...interp(x, [[50, 'FEUreia > 50%: lesão renal intrínseca', 'bad'], [35, 'FEUreia 35–50%: indeterminado', 'warn'], [0, 'FEUreia < 35%: pré-renal', 'ok']]) };
  },
});

C({
  id: 'femg', cat: ['renal', 'eletro'], name: 'Excreção fracionada de magnésio', desc: 'Perda renal vs. extrarrenal de magnésio',
  fields: [num('umg', 'Magnésio urinário', 'mg/dL'), num('pmg', 'Magnésio plasmático', 'mg/dL'), num('ucr', 'Creatinina urinária', 'mg/dL'), num('pcr', 'Creatinina plasmática', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.umg, v.pmg, v.ucr, v.pcr)) return null;
    const x = (v.umg * v.pcr) / (0.7 * v.pmg * v.ucr) * 100;
    return { value: f(x, 1), unit: '%', ...interp(x, [[4, 'FEMg > 4%: perda renal de magnésio (com hipomagnesemia)', 'bad'], [2, 'FEMg 2–4%: possível perda renal', 'warn'], [0, 'FEMg < 2%: perda extrarrenal', 'ok']]) };
  },
});

C({
  id: 'ureabun', cat: ['renal', 'conv'], name: 'Ureia ↔ BUN', desc: 'Conversor ureia / nitrogênio ureico',
  fields: [num('x', 'Valor', 'mg/dL'), sel('de', 'Converter de', [['Ureia → BUN', 'u'], ['BUN → Ureia', 'b']])],
  calc: ({ x, de }) => {
    if (!ok(x)) return null;
    return de === 'u' ? { label: 'BUN', value: f(x / 2.14, 1), unit: 'mg/dL', extra: [['Ureia em mmol/L', f(x / 6.006, 1)]] }
      : { label: 'Ureia', value: f(x * 2.14, 1), unit: 'mg/dL', extra: [['Ureia em mmol/L', f(x / 2.8, 1)]] };
  },
});

C({
  id: 'mehran', cat: 'renal', name: 'Nefropatia por contraste (Mehran)', desc: 'Risco de nefropatia após intervenção coronariana',
  fields: [chk('hipo', 'Hipotensão (PAS < 80 mmHg por ≥ 1 h com inotrópico)', 5), chk('bia', 'Balão intra-aórtico', 5), chk('icc', 'ICC (NYHA III/IV ou EAP)', 5), chk('idade', 'Idade > 75 anos', 4),
    chk('an', 'Anemia (Hto < 39% H / < 36% M)', 3), chk('dm', 'Diabetes', 3), num('vol', 'Volume de contraste', 'mL'),
    sel('ren', 'Função renal', [['TFG ≥ 60 e Cr ≤ 1,5', 0], ['Creatinina > 1,5 mg/dL', 4], ['TFG 40–60', 2], ['TFG 20–40', 4], ['TFG < 20', 6]])],
  calc: (v, def) => {
    if (!ok(v.vol)) return null;
    let p = Math.floor(v.vol / 100) + v.ren;
    for (const fl of def.fields) if (fl.t === 'chk' && v[fl.id]) p += fl.pts;
    const r = p <= 5 ? ['7,5%', '0,04%', 'ok'] : p <= 10 ? ['14%', '0,12%', 'warn'] : p <= 15 ? ['26,1%', '1,09%', 'bad'] : ['57,3%', '12,6%', 'bad'];
    return { value: p, unit: 'pontos', extra: [['Risco de nefropatia', r[0]], ['Risco de diálise', r[1]]], interp: `Risco de nefropatia por contraste: ${r[0]}`, level: r[2] };
  },
});

C({
  id: 'crrt-dose', cat: 'renal', name: 'Dose de HDFVVC', desc: 'Dose de efluente prescrita com correção da pré-diluição',
  fields: [num('peso', 'Peso', 'kg'), num('dose', 'Dose alvo', 'mL/kg/h', { def: 25 }), num('qb', 'Fluxo de sangue (Qb)', 'mL/min'), num('hto', 'Hematócrito', '%'), num('pre', 'Fração de reposição pré-filtro', '%', { def: 0 })],
  calc: (v) => {
    if (!ok(v.peso, v.dose)) return null;
    const ef = v.peso * v.dose;
    const ex = [];
    let efc = ef;
    if (ok(v.qb, v.hto) && v.pre > 0) {
      const qp = v.qb * 60 * (1 - v.hto / 100);
      // Efluente total necessário (E) tal que E × Qp/(Qp + Qpre) = alvo, com Qpre = pre% × E
      const p = v.pre / 100;
      efc = ef * qp / (qp - p * ef);
      ex.push(['Fluxo plasmático', f(qp, 0) + ' mL/h'], ['Reposição pré-filtro', f(efc * p, 0) + ' mL/h']);
    }
    return { label: 'Efluente necessário', value: f(efc, 0), unit: 'mL/h', extra: [['Efluente sem correção', f(ef, 0) + ' mL/h'], ...ex], interp: 'Dose recomendada (KDIGO): 20–25 mL/kg/h efetivamente administrados', level: 'ok' };
  },
});

C({
  id: 'crrt-ff', cat: 'renal', name: 'Fração de filtração (HDFVVC)', desc: 'Risco de coagulação do filtro',
  fields: [num('qb', 'Fluxo de sangue (Qb)', 'mL/min'), num('hto', 'Hematócrito', '%'), num('pre', 'Reposição pré-filtro', 'mL/h'), num('pos', 'Reposição pós-filtro', 'mL/h'), num('uf', 'Ultrafiltração líquida (perda)', 'mL/h')],
  calc: (v) => {
    if (!ok(v.qb, v.hto)) return null;
    const qp = v.qb * 60 * (1 - v.hto / 100), pre = v.pre || 0, pos = v.pos || 0, uf = v.uf || 0;
    const ff = (pre + pos + uf) / (qp + pre) * 100;
    return { value: f(ff, 1), unit: '%', extra: [['Fluxo plasmático', f(qp, 0) + ' mL/h']], ...interp(ff, [[25, 'FF > 25%: alto risco de coagulação do filtro', 'bad'], [20, 'FF 20–25%: limite', 'warn'], [0, 'FF < 20%: adequada', 'ok']]) };
  },
});

C({
  id: 'vpc', cat: ['renal', 'conv'], name: 'Volume plasmático (plasmaférese)', desc: 'Volume de plasma circulante e volume a tratar',
  fields: [num('peso', 'Peso', 'kg'), num('hto', 'Hematócrito', '%'), num('vol', 'Volumes plasmáticos a trocar', '', { def: 1 })],
  calc: ({ peso, hto, vol }) => {
    if (!ok(peso, hto)) return null;
    const vp = 0.065 * peso * (1 - hto / 100) * 1000;
    return { label: 'Volume plasmático', value: f(vp, 0), unit: 'mL', extra: [['Volume a tratar', f(vp * (vol || 1), 0) + ' mL'], ['Volemia estimada', f(65 * peso, 0) + ' mL']], interp: '1 volume remove ~63% e 1,5 volume ~78% da substância intravascular', level: 'ok' };
  },
});

C({
  id: 'bn', cat: ['renal', 'nutri'], name: 'Balanço nitrogenado', desc: 'A partir da ureia urinária de 24 h',
  fields: [num('prot', 'Proteína administrada', 'g/24h'), num('uu', 'Ureia urinária', 'g/L'), num('vol', 'Diurese de 24 h', 'mL'), num('extra', 'Perdas extras (fístulas, TRRC)', 'g N', { def: 0 })],
  calc: (v) => {
    if (!ok(v.prot, v.uu, v.vol)) return null;
    const nIn = v.prot / 6.25, nuu = v.uu * (v.vol / 1000) * 0.467, bal = nIn - (nuu + 4 + (v.extra || 0));
    return { value: f(bal, 1), unit: 'g N/24h', extra: [['Nitrogênio ofertado', f(nIn, 1) + ' g'], ['Nitrogênio ureico urinário', f(nuu, 1) + ' g'], ['Perdas insensíveis', '4 g']],
      ...interp(bal, [[0, 'Balanço positivo / anabolismo', 'ok'], [-5, 'Catabolismo leve a moderado', 'warn'], [-99, 'Catabolismo grave', 'bad']]) };
  },
});

C({
  id: 'ica', cat: ['renal', 'nutri'], name: 'Índice creatinina/altura', desc: 'Estimativa da massa muscular',
  fields: [num('ucr', 'Creatinina urinária de 24 h', 'mg/24h'), num('alt', 'Altura', 'cm'), sexo()],
  calc: ({ ucr, alt, sexo }) => {
    if (!ok(ucr, alt)) return null;
    const ideal = pesoIdeal(alt, sexo) * (sexo === 'F' ? 18 : 23), x = ucr / ideal * 100;
    return { value: f(x, 0), unit: '%', extra: [['Creatinina ideal', f(ideal, 0) + ' mg/24h']], ...interp(x, [[80, 'Massa muscular normal', 'ok'], [60, 'Depleção moderada', 'warn'], [0, 'Depleção grave', 'bad']]) };
  },
});
