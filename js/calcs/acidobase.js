/* ===== Ácido-base ===== */
C({
  id: 'gsa', cat: ['acido', 'resp'], name: 'Interpretação da gasometria', desc: 'Distúrbio primário, compensação esperada e ânion gap',
  fields: [num('ph', 'pH'), num('pco2', 'PaCO₂', 'mmHg'), num('hco3', 'HCO₃⁻', 'mEq/L'), sel('tempo', 'Evolução (se respiratório)', [['Aguda', 'a'], ['Crônica', 'c']]),
    head('Opcional (ânion gap)'), num('na', 'Sódio', 'mEq/L'), num('cl', 'Cloro', 'mEq/L'), num('alb', 'Albumina', 'g/dL')],
  calc: (v) => {
    if (!ok(v.ph, v.pco2, v.hco3)) return null;
    const ex = [], msgs = [];
    let prim, lvl = 'warn';
    const hh = 6.1 + Math.log10(v.hco3 / (0.03 * v.pco2));
    if (Math.abs(hh - v.ph) > 0.04) ex.push(['Coerência (Henderson-Hasselbalch)', 'pH calculado ' + f(hh, 2) + ' – revisar dados']);
    if (v.ph < 7.35) {
      if (v.hco3 < 22) {
        prim = 'Acidose metabólica';
        const e = 1.5 * v.hco3 + 8;
        ex.push(['PaCO₂ esperada (Winter)', f(e - 2, 0) + '–' + f(e + 2, 0) + ' mmHg']);
        if (v.pco2 > e + 2) msgs.push('acidose respiratória associada'); else if (v.pco2 < e - 2) msgs.push('alcalose respiratória associada'); else msgs.push('compensada');
      } else {
        prim = 'Acidose respiratória ' + (v.tempo === 'a' ? 'aguda' : 'crônica');
        const e = 24 + (v.tempo === 'a' ? 0.1 : 0.35) * (v.pco2 - 40);
        ex.push(['HCO₃⁻ esperado', f(e - 2, 1) + '–' + f(e + 2, 1) + ' mEq/L']);
        if (v.hco3 > e + 2) msgs.push('alcalose metabólica associada'); else if (v.hco3 < e - 2) msgs.push('acidose metabólica associada');
      }
      lvl = 'bad';
    } else if (v.ph > 7.45) {
      if (v.hco3 > 26) {
        prim = 'Alcalose metabólica';
        const e = 0.7 * v.hco3 + 21;
        ex.push(['PaCO₂ esperada', f(e - 2, 0) + '–' + f(e + 2, 0) + ' mmHg']);
        if (v.pco2 > e + 2) msgs.push('acidose respiratória associada'); else if (v.pco2 < e - 2) msgs.push('alcalose respiratória associada');
      } else {
        prim = 'Alcalose respiratória ' + (v.tempo === 'a' ? 'aguda' : 'crônica');
        const e = 24 - (v.tempo === 'a' ? 0.2 : 0.4) * (40 - v.pco2);
        ex.push(['HCO₃⁻ esperado', f(e - 2, 1) + '–' + f(e + 2, 1) + ' mEq/L']);
        if (v.hco3 > e + 2) msgs.push('alcalose metabólica associada'); else if (v.hco3 < e - 2) msgs.push('acidose metabólica associada');
      }
      lvl = 'bad';
    } else {
      prim = 'pH normal';
      lvl = 'ok';
      if (v.pco2 > 45 && v.hco3 > 26) { msgs.push('acidose respiratória + alcalose metabólica'); lvl = 'warn'; }
      else if (v.pco2 < 35 && v.hco3 < 22) { msgs.push('alcalose respiratória + acidose metabólica'); lvl = 'warn'; }
    }
    if (ok(v.na, v.cl)) {
      const ag = v.na - v.cl - v.hco3, agc = ok(v.alb) ? ag + 2.5 * (4 - v.alb) : ag;
      ex.push(['Ânion gap', f(ag, 0) + (ok(v.alb) ? ' (corrigido ' + f(agc, 1) + ')' : '') + ' mEq/L']);
      if (agc > 12) {
        const dd = (agc - 12) / (24 - v.hco3);
        ex.push(['Delta/delta', f(dd, 2)]);
        msgs.push('ânion gap elevado');
        if (dd > 2) msgs.push('alcalose metabólica concomitante'); else if (dd < 1) msgs.push('acidose hiperclorêmica concomitante');
      } else if (v.hco3 < 22) msgs.push('ânion gap normal (hiperclorêmica)');
    }
    return { value: prim, extra: ex, interp: msgs.length ? msgs.join('; ').replace(/^./, (c) => c.toUpperCase()) : 'Sem distúrbio misto identificado', level: lvl };
  },
});

C({
  id: 'hh', cat: 'acido', name: 'Henderson-Hasselbalch', desc: 'Calcula o HCO₃⁻ (ou o pH) a partir dos demais',
  fields: [num('ph', 'pH (deixe vazio para calcular)'), num('pco2', 'PaCO₂', 'mmHg'), num('hco3', 'HCO₃⁻ (deixe vazio para calcular)', 'mEq/L')],
  calc: ({ ph, pco2, hco3 }) => {
    if (!ok(pco2)) return null;
    if (ok(ph) && !ok(hco3)) return { label: 'HCO₃⁻ calculado', value: f(0.03 * pco2 * 10 ** (ph - 6.1), 1), unit: 'mEq/L', extra: [['[H⁺]', f(10 ** (9 - ph), 1) + ' nmol/L']] };
    if (ok(hco3)) {
      const p = 6.1 + Math.log10(hco3 / (0.03 * pco2));
      return { label: 'pH calculado', value: f(p, 2), extra: [['[H⁺]', f(10 ** (9 - p), 1) + ' nmol/L'], ...(ok(ph) ? [['Diferença do medido', f(p - ph, 2) + (Math.abs(p - ph) > 0.04 ? ' (incoerente)' : ' (coerente)')]] : [])] };
    }
    return null;
  },
});

C({
  id: 'ag', cat: 'acido', name: 'Ânion gap', desc: 'Brecha aniônica, corrigida pela albumina',
  fields: [num('na', 'Sódio', 'mEq/L'), num('cl', 'Cloro', 'mEq/L'), num('hco3', 'HCO₃⁻', 'mEq/L'), num('k', 'Potássio (opcional)', 'mEq/L'), num('alb', 'Albumina (opcional)', 'g/dL')],
  calc: (v) => {
    if (!ok(v.na, v.cl, v.hco3)) return null;
    const ag = v.na - v.cl - v.hco3, ex = [];
    if (ok(v.k)) ex.push(['AG com potássio', f(ag + v.k, 0) + ' mEq/L (normal 12–16)']);
    const agc = ok(v.alb) ? ag + 2.5 * (4 - v.alb) : ag;
    if (ok(v.alb)) ex.push(['AG corrigido pela albumina', f(agc, 1) + ' mEq/L']);
    return { value: f(ag, 0), unit: 'mEq/L', extra: ex, ...interp(agc, [[12.01, 'Ânion gap elevado: cetoacidose, lactato, IRA, tóxicos (GOLDMARK)', 'bad'], [8, 'Ânion gap normal (8–12)', 'ok'], [-99, 'Ânion gap baixo: hipoalbuminemia, paraproteínas, lítio', 'warn']]) };
  },
});

C({
  id: 'delta', cat: 'acido', name: 'Delta gap / Delta ratio', desc: 'Distúrbios mistos na acidose com ânion gap elevado',
  fields: [num('na', 'Sódio', 'mEq/L'), num('cl', 'Cloro', 'mEq/L'), num('hco3', 'HCO₃⁻', 'mEq/L'), num('alb', 'Albumina (opcional)', 'g/dL')],
  calc: (v) => {
    if (!ok(v.na, v.cl, v.hco3)) return null;
    let ag = v.na - v.cl - v.hco3;
    if (ok(v.alb)) ag += 2.5 * (4 - v.alb);
    const dag = ag - 12, dhco3 = 24 - v.hco3, r = dhco3 !== 0 ? dag / dhco3 : NaN;
    return { label: 'Delta ratio', value: f(r, 2), extra: [['Ânion gap', f(ag, 1)], ['Δ AG', f(dag, 1)], ['Δ HCO₃⁻', f(dhco3, 1)], ['HCO₃⁻ corrigido (HCO₃ + ΔAG)', f(v.hco3 + dag, 1)]],
      ...interp(r, [[2.01, 'Acidose com AG elevado + alcalose metabólica', 'warn'], [1, 'Acidose com AG elevado pura', 'ok'], [0.4, 'Acidose com AG elevado + acidose hiperclorêmica', 'warn'], [-99, 'Acidose hiperclorêmica (AG normal)', 'warn']]) };
  },
});

C({
  id: 'ag-urina', cat: 'acido', name: 'Ânion gap urinário', desc: 'Acidose hiperclorêmica: renal vs. gastrointestinal',
  fields: [num('na', 'Sódio urinário', 'mEq/L'), num('k', 'Potássio urinário', 'mEq/L'), num('cl', 'Cloro urinário', 'mEq/L')],
  calc: ({ na, k, cl }) => {
    if (!ok(na, k, cl)) return null;
    const g = na + k - cl;
    return { value: f(g, 0), unit: 'mEq/L', ...(g < 0 ? { interp: 'Negativo: excreção de amônio preservada (perdas GI, diarreia)', level: 'ok' } : { interp: 'Positivo: excreção de amônio reduzida (acidose tubular renal)', level: 'warn' }) };
  },
});

C({
  id: 'stewart', cat: 'acido', name: 'Stewart (físico-químico)', desc: 'SID aparente, SID efetivo e SIG',
  fields: [num('ph', 'pH'), num('pco2', 'PaCO₂', 'mmHg'), num('na', 'Sódio', 'mEq/L'), num('k', 'Potássio', 'mEq/L'), num('cl', 'Cloro', 'mEq/L'),
    num('cai', 'Cálcio iônico', 'mmol/L'), num('mg', 'Magnésio', 'mg/dL'), num('lac', 'Lactato', 'mmol/L'), num('alb', 'Albumina', 'g/dL'), num('p', 'Fósforo', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.ph, v.pco2, v.na, v.k, v.cl, v.alb, v.p)) return null;
    const ca = ok(v.cai) ? v.cai * 2 : 0, mg = ok(v.mg) ? v.mg / 2.431 * 2 : 0, lac = ok(v.lac) ? v.lac : 0;
    const sida = v.na + v.k + ca + mg - v.cl - lac;
    const hco3 = 0.03 * v.pco2 * 10 ** (v.ph - 6.1);
    const sidE = hco3 + v.alb * 10 * (0.123 * v.ph - 0.631) + (v.p / 3.097) * (0.309 * v.ph - 0.469);
    const sig = sida - sidE;
    return { label: 'SIG (strong ion gap)', value: f(sig, 1), unit: 'mEq/L', extra: [['SID aparente', f(sida, 1) + ' mEq/L (normal ~40–42)'], ['SID efetivo', f(sidE, 1) + ' mEq/L'], ['HCO₃⁻ calculado', f(hco3, 1) + ' mEq/L'], ['Diferença Na–Cl', f(v.na - v.cl, 0) + ' (normal ~36–38)']],
      ...(sig > 2 ? { interp: 'SIG elevado: ânions não medidos (cetonas, sulfatos, toxinas)', level: 'bad' } : { interp: sida < 38 ? 'SIDa baixo: acidose por íons fortes (ex. hipercloremia)' : 'Sem ânions não medidos significativos', level: sida < 38 ? 'warn' : 'ok' }) };
  },
});
