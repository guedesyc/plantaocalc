/* ===== Digestivo ===== */
C({
  id: 'child', cat: 'digest', name: 'Child-Pugh', desc: 'Gravidade da cirrose hepática',
  fields: [num('bili', 'Bilirrubina total', 'mg/dL'), num('alb', 'Albumina', 'g/dL'), num('inr', 'INR'),
    sel('asc', 'Ascite', [['Ausente', 1], ['Leve', 2], ['Moderada / grave', 3]]),
    sel('enc', 'Encefalopatia', [['Ausente', 1], ['Grau I–II', 2], ['Grau III–IV', 3]])],
  calc: (v) => {
    if (!ok(v.bili, v.alb, v.inr)) return null;
    const p = band(v.bili, [[3.01, 3], [2, 2], [-1e9, 1]]) + band(v.alb, [[3.51, 1], [2.8, 2], [-1e9, 3]]) + band(v.inr, [[2.31, 3], [1.7, 2], [-1e9, 1]]) + v.asc + v.enc;
    const c = p <= 6 ? ['A', '100%', '85%', 'ok'] : p <= 9 ? ['B', '81%', '57%', 'warn'] : ['C', '45%', '35%', 'bad'];
    return { label: 'Classe ' + c[0], value: p, unit: 'pontos', extra: [['Sobrevida em 1 ano', c[1]], ['Sobrevida em 2 anos', c[2]]], interp: `Child-Pugh ${c[0]}`, level: c[3] };
  },
});

C({
  id: 'meld', cat: 'digest', name: 'MELD / MELD-Na', desc: 'Prognóstico na cirrose (também usado na hepatite alcoólica)',
  fields: [num('bili', 'Bilirrubina', 'mg/dL'), num('inr', 'INR'), num('cr', 'Creatinina', 'mg/dL'), num('na', 'Sódio', 'mEq/L'),
    chk('dial', 'Diálise ≥ 2× na última semana')],
  calc: (v) => {
    if (!ok(v.bili, v.inr, v.cr)) return null;
    const b = Math.max(1, v.bili), i = Math.max(1, v.inr), c = v.dial ? 4 : Math.min(4, Math.max(1, v.cr));
    let m = Math.round(10 * (0.957 * Math.log(c) + 0.378 * Math.log(b) + 1.12 * Math.log(i) + 0.643) * 10) / 10;
    let mna = m;
    if (ok(v.na) && m > 11) {
      const na = Math.min(137, Math.max(125, v.na));
      mna = m + 1.32 * (137 - na) - 0.033 * m * (137 - na);
    }
    const mort = (x) => (x >= 40 ? '71,3%' : x >= 30 ? '52,6%' : x >= 20 ? '19,6%' : x >= 10 ? '6,0%' : '1,9%');
    return { label: ok(v.na) ? 'MELD-Na' : 'MELD', value: f(Math.round(mna), 0), unit: 'pontos',
      extra: [['MELD clássico', f(Math.round(m), 0)], ['Mortalidade em 3 meses', mort(mna)]],
      ...interp(mna, [[30, 'Gravidade muito alta', 'bad'], [20, 'Gravidade alta', 'bad'], [10, 'Gravidade moderada', 'warn'], [0, 'Gravidade baixa', 'ok']]) };
  },
});

C({
  id: 'maddrey', cat: 'digest', name: 'Maddrey', desc: 'Função discriminante na hepatite alcoólica',
  fields: [num('tp', 'Tempo de protrombina do paciente', 's'), num('tpc', 'Tempo de protrombina controle', 's'), num('bili', 'Bilirrubina', 'mg/dL')],
  calc: ({ tp, tpc, bili }) => {
    if (!ok(tp, tpc, bili)) return null;
    const d = 4.6 * (tp - tpc) + bili;
    return { value: f(d), unit: '', ...interp(d, [[32, 'Hepatite alcoólica grave: considerar corticoide', 'bad'], [-1e9, 'Hepatite alcoólica não grave', 'ok']]) };
  },
});

C({
  id: 'lille', cat: 'digest', name: 'Lille', desc: 'Resposta ao corticoide na hepatite alcoólica (dia 7)',
  fields: [num('idade', 'Idade', 'anos'), num('alb', 'Albumina (dia 0)', 'g/dL'), num('b0', 'Bilirrubina dia 0', 'mg/dL'), num('b7', 'Bilirrubina dia 7', 'mg/dL'),
    num('tp', 'Tempo de protrombina', 's'), chk('ir', 'Insuficiência renal (Cr > 1,3 mg/dL)')],
  calc: (v) => {
    if (!ok(v.idade, v.alb, v.b0, v.b7, v.tp)) return null;
    const b0 = v.b0 * 17.1, b7 = v.b7 * 17.1;
    const r = 3.19 - 0.101 * v.idade + 0.147 * v.alb * 10 + 0.0165 * (b0 - b7) - 0.206 * (v.ir ? 1 : 0) - 0.0065 * b0 - 0.0096 * v.tp;
    const l = Math.exp(-r) / (1 + Math.exp(-r));
    return { value: f(l, 3), ...interp(l, [[0.45, 'Não respondedor: suspender corticoide (sobrevida 6 meses ~25%)', 'bad'], [0, 'Respondedor: manter corticoide (sobrevida 6 meses ~85%)', 'ok']]) };
  },
});

C({
  id: 'ranson', cat: 'digest', name: 'Ranson', desc: 'Prognóstico na pancreatite aguda (alcoólica ou biliar)',
  fields: [sel('etio', 'Etiologia', [['Não biliar / alcoólica', 'a'], ['Biliar', 'b']]), head('Na admissão'),
    chk('idade', 'Idade > 55 (biliar > 70) anos'), chk('leuco', 'Leucócitos > 16.000 (biliar > 18.000)'), chk('glic', 'Glicemia > 200 (biliar > 220) mg/dL'),
    chk('ldh', 'LDH > 350 (biliar > 400) UI/L'), chk('ast', 'TGO > 250 UI/L'), head('Nas primeiras 48 h'),
    chk('hto', 'Queda do hematócrito > 10%'), chk('bun', 'Aumento da ureia (BUN) > 5 (biliar > 2) mg/dL'), chk('ca', 'Cálcio < 8 mg/dL'),
    chk('po2', 'PaO₂ < 60 mmHg (apenas não biliar)'), chk('be', 'Déficit de bases > 4 (biliar > 5) mEq/L'), chk('liq', 'Sequestro de líquidos > 6 L (biliar > 4 L)')],
  calc: (v) => {
    const keys = ['idade', 'leuco', 'glic', 'ldh', 'ast', 'hto', 'bun', 'ca', 'be', 'liq'].concat(v.etio === 'a' ? ['po2'] : []);
    const p = keys.filter((k) => v[k]).length;
    return { value: p, unit: 'critérios', ...interp(p, [[7, 'Mortalidade ~100%', 'bad'], [5, 'Mortalidade ~40%', 'bad'], [3, 'Pancreatite grave: mortalidade ~15%', 'warn'], [0, 'Pancreatite leve: mortalidade < 3%', 'ok']]) };
  },
});

C({
  id: 'bisap', cat: 'digest', name: 'BISAP', desc: 'Mortalidade na pancreatite aguda (primeiras 24 h)', score: true,
  fields: [chk('a', 'BUN > 25 mg/dL (ureia > 53,5)'), chk('b', 'Alteração do estado mental (Glasgow < 15)'), chk('c', 'SIRS (≥ 2 critérios)'), chk('d', 'Idade > 60 anos'), chk('e', 'Derrame pleural')],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', extra: [['Mortalidade', ['0,1%', '0,4%', '1,6%', '3,6%', '7,4%', '9,5%'][_t]]],
    ...interp(_t, [[3, 'Alto risco de mortalidade e pancreatite grave', 'bad'], [0, 'Baixo risco', 'ok']]) }),
});

C({
  id: 'balthazar', cat: 'digest', name: 'Balthazar (CTSI)', desc: 'Índice de gravidade tomográfico da pancreatite', score: true,
  fields: [sel('g', 'Grau tomográfico', [['A – pâncreas normal', 0], ['B – aumento focal ou difuso', 1], ['C – inflamação peripancreática', 2], ['D – uma coleção líquida', 3], ['E – ≥ 2 coleções ou gás', 4]]),
    sel('n', 'Necrose', [['Ausente', 0], ['< 30%', 2], ['30–50%', 4], ['> 50%', 6]])],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...interp(_t, [[7, 'Grave: mortalidade ~17%, morbidade ~92%', 'bad'], [4, 'Moderada: mortalidade ~6%', 'warn'], [0, 'Leve: mortalidade ~3%', 'ok']]) }),
});

C({
  id: 'fib4', cat: 'digest', name: 'FIB-4 e APRI', desc: 'Fibrose hepática não invasiva',
  fields: [num('idade', 'Idade', 'anos'), num('ast', 'AST (TGO)', 'UI/L'), num('alt', 'ALT (TGP)', 'UI/L'), num('plq', 'Plaquetas', '×10³/µL'), num('lsn', 'Limite superior normal da AST', 'UI/L', { def: 40 })],
  calc: (v) => {
    if (!ok(v.idade, v.ast, v.alt, v.plq)) return null;
    const fib = (v.idade * v.ast) / (v.plq * Math.sqrt(v.alt));
    const apri = ((v.ast / (v.lsn || 40)) / v.plq) * 100;
    const lo = v.idade > 65 ? 2.0 : 1.3;
    return { label: 'FIB-4', value: f(fib, 2), extra: [['APRI', f(apri, 2) + (apri > 2 ? ' (sugere cirrose)' : apri > 1.5 ? ' (fibrose significativa)' : apri < 0.5 ? ' (baixa probabilidade)' : ' (indeterminado)')]],
      ...interp(fib, [[2.67, 'Alta probabilidade de fibrose avançada (F3–F4)', 'bad'], [lo, 'Indeterminado: considerar elastografia', 'warn'], [0, 'Baixa probabilidade de fibrose avançada', 'ok']]) };
  },
});

C({
  id: 'forns', cat: 'digest', name: 'Índice de Forns', desc: 'Fibrose hepática na hepatite C',
  fields: [num('idade', 'Idade', 'anos'), num('plq', 'Plaquetas', '×10³/µL'), num('ggt', 'GGT', 'UI/L'), num('col', 'Colesterol total', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.idade, v.plq, v.ggt, v.col)) return null;
    const x = 7.811 - 3.131 * Math.log(v.plq) + 0.781 * Math.log(v.ggt) + 3.467 * Math.log(v.idade) - 0.014 * v.col;
    return { value: f(x, 2), ...interp(x, [[6.9, 'Fibrose significativa provável (F2–F4)', 'bad'], [4.2, 'Indeterminado', 'warn'], [-1e9, 'Exclui fibrose significativa (VPN ~96%)', 'ok']]) };
  },
});

C({
  id: 'nfs', cat: 'digest', name: 'NAFLD Fibrosis Score', desc: 'Fibrose na doença hepática gordurosa',
  fields: [num('idade', 'Idade', 'anos'), num('imc', 'IMC', 'kg/m²'), chk('dm', 'Glicemia de jejum alterada ou diabetes'), num('ast', 'AST', 'UI/L'), num('alt', 'ALT', 'UI/L'),
    num('plq', 'Plaquetas', '×10³/µL'), num('alb', 'Albumina', 'g/dL')],
  calc: (v) => {
    if (!ok(v.idade, v.imc, v.ast, v.alt, v.plq, v.alb)) return null;
    const x = -1.675 + 0.037 * v.idade + 0.094 * v.imc + 1.13 * (v.dm ? 1 : 0) + 0.99 * (v.ast / v.alt) - 0.013 * v.plq - 0.66 * v.alb;
    return { value: f(x, 3), ...interp(x, [[0.676, 'Fibrose avançada provável (F3–F4)', 'bad'], [-1.455, 'Indeterminado', 'warn'], [-1e9, 'Fibrose avançada improvável', 'ok']]) };
  },
});

C({
  id: 'clifcad', cat: 'digest', name: 'CLIF-C AD', desc: 'Mortalidade na cirrose descompensada sem ACLF',
  fields: [num('idade', 'Idade', 'anos'), num('leuco', 'Leucócitos', '/mm³'), num('cr', 'Creatinina', 'mg/dL'), num('inr', 'INR'), num('na', 'Sódio', 'mEq/L')],
  calc: (v) => {
    if (!ok(v.idade, v.leuco, v.cr, v.inr, v.na)) return null;
    const s = 10 * (0.03 * v.idade + 0.66 * Math.log(v.cr) + 1.71 * Math.log(v.inr) + 0.88 * Math.log(v.leuco / 1000) - 0.05 * v.na + 8);
    const p = (a, b) => f(100 * (1 - Math.exp(-a * Math.exp(b * s))), 0) + '%';
    return { value: f(s, 0), unit: 'pontos', extra: [['Mortalidade 1 mês', p(0.00012, 0.1083)], ['3 meses', p(0.00056, 0.1007)], ['6 meses', p(0.00173, 0.0889)], ['12 meses', p(0.00879, 0.0698)]],
      ...interp(s, [[60, 'Alto risco', 'bad'], [45, 'Risco intermediário', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'gasa', cat: 'digest', name: 'GASA', desc: 'Gradiente de albumina soro-ascite',
  fields: [num('as', 'Albumina sérica', 'g/dL'), num('aa', 'Albumina no líquido ascítico', 'g/dL'), num('pt', 'Proteínas totais no líquido (opcional)', 'g/dL')],
  calc: ({ as, aa, pt }) => {
    if (!ok(as, aa)) return null;
    const g = as - aa;
    let x = '';
    if (ok(pt)) x = g >= 1.1 ? (pt >= 2.5 ? 'Proteínas ≥ 2,5: sugere causa cardíaca / Budd-Chiari' : 'Proteínas < 2,5: sugere cirrose') : (pt >= 2.5 ? 'Sugere carcinomatose, TB ou pancreatite' : 'Sugere síndrome nefrótica');
    return { value: f(g, 2), unit: 'g/dL', extra: x ? [['Proteínas', x]] : [],
      ...(g >= 1.1 ? { interp: 'GASA ≥ 1,1: hipertensão portal (transudato)', level: 'warn' } : { interp: 'GASA < 1,1: sem hipertensão portal (exsudato)', level: 'ok' }) };
  },
});
