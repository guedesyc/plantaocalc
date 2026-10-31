/* ===== Pediatria ===== */
/* Faixas etárias (em meses) usadas pelo pSOFA / PELOD-2 */
const faixaPed = (m) => (m < 1 ? 0 : m < 12 ? 1 : m < 24 ? 2 : m < 60 ? 3 : m < 144 ? 4 : m <= 216 ? 5 : 6);
const pamMinPed = [46, 55, 60, 62, 65, 67, 70];
const idadeMeses = (o = {}) => num('meses', 'Idade', 'meses', o);

C({
  id: 'pards', cat: ['resp', 'ped'], ages: 'ped', name: 'SDRA pediátrica (PALICC-2)', desc: 'Diagnóstico e gravidade da PARDS por OI, OSI, PaFi ou SpFi',
  fields: [sel('sup', 'Suporte ventilatório', [['Ventilação invasiva', 'imv'], ['VNI com máscara facial (CPAP ≥ 5)', 'niv'], ['CNAF ou CPAP nasal', 'nasal']]),
    num('fio2', 'FiO₂', '%'), num('po2', 'PaO₂ (se houver gasometria)', 'mmHg'), num('spo2', 'SpO₂ (88–97%)', '%'), num('pm', 'Pressão média de vias aéreas (invasiva)', 'cmH₂O')],
  calc: (v) => {
    if (!ok(v.fio2) || (!ok(v.po2) && !ok(v.spo2))) return null;
    const ex = [];
    const spoOk = ok(v.spo2) && v.spo2 <= 97;
    if (ok(v.spo2) && !spoOk) ex.push(['Atenção', 'SpO₂ > 97%: não usar para o diagnóstico (titular O₂ para 88–97%)']);
    if (v.sup === 'imv') {
      if (!ok(v.pm)) return null;
      const oi = ok(v.po2) ? v.pm * v.fio2 / v.po2 : NaN, osi = spoOk ? v.pm * v.fio2 / v.spo2 : NaN;
      if (!ok(oi) && !ok(osi)) return { value: '—', extra: ex, interp: 'Informe PaO₂ ou SpO₂ ≤ 97%', level: 'warn' };
      if (ok(oi)) ex.unshift(['Índice de oxigenação (OI)', f(oi, 1)]);
      if (ok(osi)) ex.unshift(['Índice de saturação (OSI)', f(osi, 1)]);
      const grave = ok(oi) ? oi >= 16 : osi >= 12, pards = ok(oi) ? oi >= 4 : osi >= 5;
      return { label: ok(oi) ? 'OI' : 'OSI', value: f(ok(oi) ? oi : osi, 1), extra: ex,
        ...(grave ? { interp: 'PARDS grave (OI ≥ 16 ou OSI ≥ 12)', level: 'bad' } : pards ? { interp: 'PARDS leve/moderada (OI 4–16 ou OSI 5–12)', level: 'warn' } : { interp: 'Abaixo do critério de PARDS (OI < 4 / OSI < 5)', level: 'ok' }),
        };
    }
    const pf = ok(v.po2) ? v.po2 / (v.fio2 / 100) : NaN, sf = spoOk ? v.spo2 / (v.fio2 / 100) : NaN;
    if (!ok(pf) && !ok(sf)) return { value: '—', extra: ex, interp: 'Informe PaO₂ ou SpO₂ ≤ 97%', level: 'warn' };
    if (ok(pf)) ex.unshift(['PaO₂/FiO₂', f(pf, 0)]);
    if (ok(sf)) ex.unshift(['SpO₂/FiO₂', f(sf, 0)]);
    const crit = ok(pf) ? pf <= 300 : sf <= 250, grave = ok(pf) ? pf <= 100 : sf <= 150;
    const lbl = ok(pf) ? 'PaO₂/FiO₂' : 'SpO₂/FiO₂', val = f(ok(pf) ? pf : sf, 0);
    if (v.sup === 'nasal') {
      return { label: lbl, value: val, extra: [...ex, ['Requisito', 'CNAF ≥ 1,5 L/kg/min ou ≥ 30 L/min']],
        ...(crit ? { interp: 'PARDS possível (suporte nasal)', level: 'warn' } : { interp: 'Abaixo do critério de PARDS possível', level: 'ok' }) };
    }
    return { label: lbl, value: val, extra: ex,
      ...(grave ? { interp: 'PARDS grave em VNI (PaFi ≤ 100 ou SpFi ≤ 150)', level: 'bad' } : crit ? { interp: 'PARDS leve/moderada em VNI', level: 'warn' } : { interp: 'Abaixo do critério de PARDS (PaFi ≤ 300 / SpFi ≤ 250)', level: 'ok' }) };
  },
});

C({
  id: 'psofa', cat: ['indic', 'ped'], ages: 'ped', name: 'pSOFA', desc: 'SOFA pediátrico com cortes ajustados à idade (Matics 2017)',
  fields: [idadeMeses(), num('pafi', 'PaO₂/FiO₂ (ou deixe vazio e use SpFi)', 'mmHg'), num('spfi', 'SpO₂/FiO₂', ''), chk('vm', 'Em suporte respiratório (VNI ou invasivo)'),
    num('plq', 'Plaquetas', '×10³/µL'), num('bili', 'Bilirrubina', 'mg/dL'), num('pam', 'PAM', 'mmHg'),
    sel('vaso', 'Vasoativos', [['Nenhum', 0], ['Dopamina ≤ 5 ou dobutamina (qualquer dose)', 2], ['Dopamina > 5 ou nora/adrenalina ≤ 0,1 µg/kg/min', 3], ['Dopamina > 15 ou nora/adrenalina > 0,1 µg/kg/min', 4]]),
    num('gcs', 'Glasgow (pediátrico)', '', { min: 3, max: 15 }), num('cr', 'Creatinina', 'mg/dL')],
  calc: (v) => {
    if (!ok(v.meses, v.plq, v.bili, v.pam, v.gcs, v.cr) || (!ok(v.pafi) && !ok(v.spfi))) return null;
    const fx = faixaPed(v.meses);
    let r = ok(v.pafi) ? band(v.pafi, [[400, 0], [300, 1], [200, 2], [100, 3], [-1e9, 4]]) : band(v.spfi, [[292, 0], [264, 1], [220, 2], [148, 3], [-1e9, 4]]);
    if (!v.vm && r > 2) r = 2;
    const crCut = [[0.8, 1.0, 1.2, 1.6], [0.3, 0.5, 0.8, 1.2], [0.4, 0.6, 1.1, 1.5], [0.6, 0.9, 1.6, 2.3], [0.7, 1.1, 1.8, 2.6], [1.0, 1.7, 2.9, 4.2], [1.2, 2.0, 3.5, 5.0]][fx];
    const ren = crCut.filter((c) => v.cr >= c).length;
    const cv = v.vaso || (v.pam < pamMinPed[fx] ? 1 : 0);
    const parts = [['Respiratório', r], ['Coagulação', band(v.plq, [[150, 0], [100, 1], [50, 2], [20, 3], [-1e9, 4]])], ['Hepático', band(v.bili, [[12, 4], [6, 3], [2, 2], [1.2, 1], [-1e9, 0]])],
      ['Cardiovascular', cv], ['Neurológico', band(v.gcs, [[15, 0], [13, 1], [10, 2], [6, 3], [-1e9, 4]])], ['Renal', ren]];
    const t = parts.reduce((s, p) => s + p[1], 0);
    return { value: t, unit: '/ 24', extra: [...parts, ['PAM mínima para a idade', '≥ ' + pamMinPed[fx] + ' mmHg']],
      ...interp(t, [[8, 'Disfunção orgânica grave', 'bad'], [2, 'Disfunção orgânica (aumento ≥ 2 sugere sepse)', 'warn'], [0, 'Sem disfunção orgânica significativa', 'ok']]) };
  },
});

C({
  id: 'schwartz', cat: ['renal', 'ped'], ages: 'ped', name: 'TFG – Schwartz à beira-leito', desc: 'Filtração glomerular estimada em crianças de 1 a 18 anos (2009)',
  fields: [num('alt', 'Altura', 'cm'), num('cr', 'Creatinina', 'mg/dL')],
  calc: ({ alt, cr }) => {
    if (!ok(alt, cr) || cr <= 0) return null;
    const g = 0.413 * alt / cr;
    return { value: f(g, 0), unit: 'mL/min/1,73m²', ...kdigo(g) };
  },
});

C({
  id: 'schofield', cat: ['nutri', 'ped'], ages: 'ped', name: 'Schofield', desc: 'Taxa metabólica basal em crianças e adolescentes (OMS)',
  fields: [sexo(), num('anos', 'Idade', 'anos'), num('peso', 'Peso', 'kg'),
    sel('fe', 'Fator de estresse', [['Sem correção (1,0)', 1], ['Pós-operatório / infecção leve (1,2)', 1.2], ['Sepse / trauma (1,3)', 1.3], ['Queimadura extensa (1,5)', 1.5]])],
  calc: (v) => {
    if (!ok(v.anos, v.peso)) return null;
    if (v.anos >= 18) return { value: '—', interp: 'Acima de 18 anos: usar fórmulas de adulto', level: 'warn' };
    const F = v.sexo === 'F';
    const [a, b] = v.anos < 3 ? (F ? [58.317, -31.1] : [59.512, -30.4]) : v.anos < 10 ? (F ? [20.315, 485.9] : [22.706, 504.3]) : (F ? [13.384, 692.6] : [17.686, 658.2]);
    const tmb = a * v.peso + b;
    return { label: 'Taxa metabólica basal', value: f(tmb, 0), unit: 'kcal/dia', extra: [['Com fator de estresse', f(tmb * v.fe, 0) + ' kcal/dia'], ['Por kg', f(tmb * v.fe / v.peso, 1) + ' kcal/kg/dia']],
      interp: 'Na UTI pediátrica, evitar hiperalimentação: meta próxima ao gasto basal na fase aguda', level: 'ok' };
  },
});

C({
  id: 'holliday', cat: ['eletro', 'ped'], ages: 'ped', name: 'Holliday-Segar', desc: 'Hidratação de manutenção (regra 4-2-1)',
  fields: [num('peso', 'Peso', 'kg')],
  calc: ({ peso }) => {
    if (!ok(peso) || peso <= 0) return null;
    const h = peso <= 10 ? 4 * peso : peso <= 20 ? 40 + 2 * (peso - 10) : 60 + (peso - 20);
    const d = peso <= 10 ? 100 * peso : peso <= 20 ? 1000 + 50 * (peso - 10) : 1500 + 20 * (peso - 20);
    return { label: 'Manutenção', value: f(Math.min(h, 100), 0), unit: 'mL/h', extra: [['Volume em 24 h', f(Math.min(d, 2400), 0) + ' mL']],
      interp: h > 100 ? 'Limitado ao máximo de adulto (~100 mL/h)' : 'Preferir solução isotônica com glicose', level: 'ok' };
  },
});

C({
  id: 'bradenq', cat: ['func', 'ped'], ages: 'ped', name: 'Braden Q', desc: 'Risco de lesão por pressão em crianças (Curley 2003)', score: true,
  fields: [sel('mob', 'Mobilidade', [['4 – Sem limitação', 4], ['3 – Levemente limitada', 3], ['2 – Muito limitada', 2], ['1 – Completamente imóvel', 1]]),
    sel('ati', 'Atividade', [['4 – Todos os pacientes jovens demais para deambular ou anda frequentemente', 4], ['3 – Anda ocasionalmente', 3], ['2 – Restrito à cadeira', 2], ['1 – Acamado', 1]]),
    sel('sen', 'Percepção sensorial', [['4 – Sem limitação', 4], ['3 – Levemente limitada', 3], ['2 – Muito limitada', 2], ['1 – Completamente limitada', 1]]),
    sel('umi', 'Umidade', [['4 – Raramente úmida', 4], ['3 – Ocasionalmente úmida', 3], ['2 – Muito úmida', 2], ['1 – Constantemente úmida', 1]]),
    sel('fri', 'Fricção e cisalhamento', [['4 – Sem problema', 4], ['3 – Problema potencial', 3], ['2 – Problema', 2], ['1 – Problema significativo', 1]]),
    sel('nut', 'Nutrição', [['4 – Excelente', 4], ['3 – Adequada', 3], ['2 – Inadequada', 2], ['1 – Muito pobre', 1]]),
    sel('per', 'Perfusão tecidual e oxigenação', [['4 – Excelente', 4], ['3 – Adequada', 3], ['2 – Limitada', 2], ['1 – Extremamente comprometida', 1]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 28', ...interp(_t, [[17, 'Sem risco aumentado', 'ok'], [13, 'Em risco (≤ 16)', 'warn'], [0, 'Risco alto', 'bad']]) }),
});

C({
  id: 'humpty', cat: ['func', 'ped'], ages: 'ped', name: 'Humpty Dumpty', desc: 'Risco de quedas em crianças', score: true,
  fields: [sel('i', 'Idade', [['< 3 anos', 4], ['3 a < 7 anos', 3], ['7 a < 13 anos', 2], ['≥ 13 anos', 1]]), sel('s', 'Sexo', [['Masculino', 2], ['Feminino', 1]]),
    sel('d', 'Diagnóstico', [['Neurológico', 4], ['Alteração da oxigenação (respiratório, desidratação, anemia, síncope)', 3], ['Psiquiátrico / comportamental', 2], ['Outro', 1]]),
    sel('c', 'Comprometimento cognitivo', [['Não tem consciência das limitações', 3], ['Esquece as limitações', 2], ['Orientado quanto às próprias capacidades', 1]]),
    sel('a', 'Fatores ambientais', [['Histórico de quedas ou lactente/criança pequena em cama', 4], ['Usa dispositivo de auxílio ou criança em berço / móveis / iluminação', 3], ['Paciente em leito', 2], ['Área ambulatorial', 1]]),
    sel('cir', 'Cirurgia / sedação / anestesia', [['Nas últimas 24 h', 3], ['Nas últimas 48 h', 2], ['Há mais de 48 h ou nenhuma', 1]]),
    sel('m', 'Medicações', [['Várias: sedativos, hipnóticos, barbitúricos, fenotiazinas, antidepressivos, laxantes/diuréticos, opioides', 3], ['Uma das listadas', 2], ['Outras ou nenhuma', 1]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 23', ...interp(_t, [[12, 'Alto risco de quedas', 'bad'], [0, 'Baixo risco de quedas', 'ok']]) }),
});
