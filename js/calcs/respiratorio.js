/* ===== Respiratório ===== */
C({
  id: 'pafi', cat: 'resp', name: 'PaO₂/FiO₂', desc: 'Relação PaFi e classificação de Berlim da SDRA',
  fields: [num('po2', 'PaO₂', 'mmHg'), num('fio2', 'FiO₂', '%', { def: 21 })],
  calc: ({ po2, fio2, _ped }) => {
    if (!ok(po2, fio2) || fio2 < 21) return null;
    const r = po2 / (fio2 / 100);
    if (_ped) return { value: f(r, 0), unit: 'mmHg', extra: [['Em ventilação invasiva', 'Use OI/OSI (calculadora SDRA pediátrica)']],
      ...interp(r, [[300.01, 'Acima do critério de PARDS', 'ok'], [100.01, 'PARDS leve/moderada em VNI (PaFi ≤ 300)', 'warn'], [0, 'PARDS grave em VNI (PaFi ≤ 100)', 'bad']]) };
    return { value: f(r, 0), unit: 'mmHg', ...interp(r, [[300.01, 'Sem critério de SDRA', 'ok'], [200.01, 'SDRA leve (200–300)', 'warn'], [100.01, 'SDRA moderada (100–200)', 'bad'], [0, 'SDRA grave (≤ 100)', 'bad']]) };
  },
});

C({
  id: 'spfi', cat: 'resp', name: 'SpO₂/FiO₂', desc: 'Relação SpFi e equivalência com PaFi',
  fields: [num('spo2', 'SpO₂', '%'), num('fio2', 'FiO₂', '%', { def: 21 })],
  calc: ({ spo2, fio2, _ped }) => {
    if (!ok(spo2, fio2) || fio2 < 21) return null;
    const r = spo2 / (fio2 / 100);
    if (_ped) return { value: f(r, 0), ...(spo2 > 97 ? { interp: 'SpO₂ > 97%: não usar para PARDS (titular para 88–97%)', level: 'warn' }
      : interp(r, [[250.01, 'Acima do critério de PARDS', 'ok'], [150.01, 'PARDS leve/moderada em VNI (SpFi ≤ 250)', 'warn'], [0, 'PARDS grave em VNI (SpFi ≤ 150)', 'bad']])) };
    return { value: f(r, 0), extra: [['PaFi estimada (Rice)', f((r - 64) / 0.84, 0) + ' mmHg']], ...(spo2 > 97 ? { interp: 'SpO₂ > 97%: relação pouco confiável', level: 'warn' } : interp(r, [[315, 'Equivale a PaFi > 300', 'ok'], [235, 'Equivale a PaFi 200–300', 'warn'], [0, 'Equivale a PaFi < 200', 'bad']])) };
  },
});

C({
  id: 'gaa', cat: 'resp', name: 'Gradiente alvéolo-arterial', desc: 'G(A-a)O₂ e PAO₂',
  fields: [num('po2', 'PaO₂', 'mmHg'), num('pco2', 'PaCO₂', 'mmHg'), num('fio2', 'FiO₂', '%', { def: 21 }), num('idade', 'Idade', 'anos'), num('patm', 'Pressão barométrica', 'mmHg', { def: 760 })],
  calc: (v) => {
    if (!ok(v.po2, v.pco2, v.fio2)) return null;
    const pA = (v.fio2 / 100) * ((v.patm || 760) - 47) - v.pco2 / 0.8, g = pA - v.po2;
    const esp = ok(v.idade) ? v.idade / 4 + 4 : null;
    return { value: f(g, 0), unit: 'mmHg', extra: [['PAO₂', f(pA, 0) + ' mmHg'], ['PaO₂/PAO₂', f(v.po2 / pA, 2)], ...(esp ? [['Gradiente esperado para a idade', '≤ ' + f(esp, 0) + ' mmHg']] : [])],
      ...(g > (esp || 15) ? { interp: 'Gradiente aumentado: alteração V/Q, shunt ou difusão', level: 'warn' } : { interp: 'Gradiente normal (hipoventilação se hipoxemia)', level: 'ok' }) };
  },
});

C({
  id: 'rox', cat: 'resp', name: 'Índice ROX', desc: 'Preditor de falha da cânula nasal de alto fluxo',
  fields: [num('spo2', 'SpO₂', '%'), num('fio2', 'FiO₂', '%'), num('fr', 'Frequência respiratória', 'irpm'), sel('h', 'Tempo de CNAF', [['2 horas', 2.85], ['6 horas', 3.47], ['12 horas', 3.85]], { only: 'adulto' }),
    num('fc', 'Frequência cardíaca (para ROX-HR)', 'bpm', { only: 'ped' })],
  calc: ({ spo2, fio2, fr, h, fc, _ped }) => {
    if (!ok(spo2, fio2, fr) || fr <= 0) return null;
    const r = spo2 / (fio2 / 100) / fr;
    if (_ped) {
      const ex = [['Referência (UTI pediátrica mista)', '< 5,52 em 60 min associado a falha'], ['Referência (bronquiolite, 12 h)', 'corte entre 6,5 e 7,2']];
      if (ok(fc) && fc > 0) ex.unshift(['ROX-HR', f(r / fc * 100, 2) + (r / fc * 100 < 3 ? ' (< 3: associado a falha, ≤ 24 meses)' : '')]);
      return { value: f(r, 2), extra: ex, interp: 'Sem ponto de corte pediátrico validado: usar como tendência, junto com a avaliação clínica', level: 'warn' };
    }
    return { value: f(r, 2), ...(r >= 4.88 ? { interp: 'ROX ≥ 4,88: baixo risco de intubação', level: 'ok' } : r < h ? { interp: `ROX < ${f(h, 2)}: alto risco de falha – considerar intubação`, level: 'bad' } : { interp: 'Zona intermediária: reavaliar em 1–2 h', level: 'warn' }) };
  },
});

C({
  id: 'hacor', cat: 'resp', name: 'HACOR', desc: 'Preditor de falha da ventilação não invasiva (1 h)',
  fields: [num('fc', 'Frequência cardíaca', 'bpm'), num('ph', 'pH'), num('gcs', 'Glasgow', '', { min: 3, max: 15 }), num('pafi', 'PaO₂/FiO₂', 'mmHg'), num('fr', 'Frequência respiratória', 'irpm')],
  calc: (v) => {
    if (!ok(v.fc, v.ph, v.gcs, v.pafi, v.fr)) return null;
    const p = band(v.fc, [[121, 1], [-1e9, 0]]) + band(v.ph, [[7.35, 0], [7.30, 2], [7.25, 3], [-1e9, 4]]) + band(v.gcs, [[15, 0], [13, 2], [11, 5], [-1e9, 10]])
      + band(v.pafi, [[201, 0], [176, 2], [151, 3], [126, 4], [101, 5], [-1e9, 6]]) + band(v.fr, [[46, 4], [41, 3], [36, 2], [31, 1], [-1e9, 0]]);
    return { value: p, unit: 'pontos', ...(p > 5 ? { interp: 'HACOR > 5: alto risco de falha da VNI – considerar intubação precoce', level: 'bad' } : { interp: 'HACOR ≤ 5: baixo risco de falha da VNI', level: 'ok' }) };
  },
});

C({
  id: 'curb65', cat: 'resp', name: 'CURB-65', desc: 'Gravidade da pneumonia comunitária', score: true,
  fields: [chk('c', 'Confusão mental'), chk('u', 'Ureia > 42 mg/dL (BUN > 19)'), chk('r', 'FR ≥ 30 irpm'), chk('b', 'PAS < 90 ou PAD ≤ 60 mmHg'), chk('i', 'Idade ≥ 65 anos')],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', extra: [['Mortalidade em 30 dias', ['0,6%', '2,7%', '6,8%', '14%', '27,8%', '27,8%'][_t]]],
    ...interp(_t, [[3, 'Pneumonia grave: internação, avaliar UTI', 'bad'], [2, 'Considerar internação', 'warn'], [0, 'Tratamento ambulatorial', 'ok']]) }),
});

C({
  id: 'idsa', cat: 'resp', name: 'IDSA/ATS', desc: 'Critérios de pneumonia comunitária grave (indicação de UTI)',
  fields: [head('Critérios maiores'), chk('vm', 'Ventilação mecânica invasiva'), chk('choque', 'Choque séptico com vasopressor'), head('Critérios menores'),
    chk('a', 'FR ≥ 30 irpm'), chk('b', 'PaO₂/FiO₂ ≤ 250'), chk('c', 'Infiltrado multilobar'), chk('d', 'Confusão / desorientação'), chk('e', 'BUN ≥ 20 mg/dL (ureia ≥ 43)'),
    chk('g', 'Leucócitos < 4.000/mm³'), chk('h', 'Plaquetas < 100.000/mm³'), chk('i', 'Temperatura < 36 °C'), chk('j', 'Hipotensão com necessidade de reposição agressiva')],
  calc: (v) => {
    const mai = (v.vm ? 1 : 0) + (v.choque ? 1 : 0), men = ['a', 'b', 'c', 'd', 'e', 'g', 'h', 'i', 'j'].filter((k) => v[k]).length;
    const g = mai >= 1 || men >= 3;
    return { label: 'Critérios menores', value: men, unit: '/ 9', extra: [['Critérios maiores', mai]], ...(g ? { interp: 'PAC grave: indicação de UTI', level: 'bad' } : { interp: 'Não preenche critérios de PAC grave', level: 'ok' }) };
  },
});

C({
  id: 'psi', cat: 'resp', name: 'PSI / PORT', desc: 'Pneumonia Severity Index (Fine)',
  fields: [num('idade', 'Idade', 'anos'), sexo(), chk('casa', 'Residente em casa de repouso', 10), head('Comorbidades'),
    chk('neo', 'Neoplasia', 30), chk('fig', 'Doença hepática', 20), chk('icc', 'Insuficiência cardíaca', 10), chk('cer', 'Doença cerebrovascular', 10), chk('ren', 'Doença renal', 10),
    head('Exame físico'), chk('conf', 'Alteração do estado mental', 20), chk('fr', 'FR ≥ 30 irpm', 20), chk('pas', 'PAS < 90 mmHg', 20), chk('t', 'Temperatura < 35 ou ≥ 40 °C', 15), chk('fc', 'FC ≥ 125 bpm', 10),
    head('Laboratório e imagem'), chk('ph', 'pH < 7,35', 30), chk('bun', 'BUN ≥ 30 mg/dL (ureia ≥ 64)', 20), chk('na', 'Sódio < 130 mEq/L', 20), chk('gli', 'Glicemia ≥ 250 mg/dL', 10),
    chk('hto', 'Hematócrito < 30%', 10), chk('po2', 'PaO₂ < 60 mmHg ou SpO₂ < 90%', 10), chk('der', 'Derrame pleural', 10)],
  calc: (v, def) => {
    if (!ok(v.idade)) return null;
    let p = v.sexo === 'F' ? v.idade - 10 : v.idade;
    for (const fl of def.fields) if (fl.t === 'chk' && v[fl.id]) p += fl.pts;
    const comorb = ['neo', 'fig', 'icc', 'cer', 'ren'].some((k) => v[k]);
    const cl = v.idade < 50 && !comorb && p < 51 && !['conf', 'fr', 'pas', 't', 'fc'].some((k) => v[k]) ? ['I', '0,1%', 'ok', 'Ambulatorial']
      : p <= 70 ? ['II', '0,6%', 'ok', 'Ambulatorial'] : p <= 90 ? ['III', '0,9–2,8%', 'warn', 'Ambulatorial ou internação breve']
      : p <= 130 ? ['IV', '8,2–9,3%', 'bad', 'Internação'] : ['V', '27–31%', 'bad', 'Internação (avaliar UTI)'];
    return { label: 'Classe ' + cl[0], value: p, unit: 'pontos', extra: [['Mortalidade', cl[1]]], interp: cl[3], level: cl[2] };
  },
});

C({
  id: 'cpis', cat: 'resp', name: 'CPIS', desc: 'Clinical Pulmonary Infection Score (pneumonia associada à VM)', score: true,
  fields: [sel('t', 'Temperatura', [['36,5–38,4 °C', 0], ['38,5–38,9 °C', 1], ['≥ 39 ou ≤ 36 °C', 2]]),
    sel('l', 'Leucócitos', [['4.000–11.000', 0], ['< 4.000 ou > 11.000', 1], ['< 4.000 ou > 11.000 + bastões ≥ 50%', 2]]),
    sel('s', 'Secreção traqueal', [['Ausente / escassa', 0], ['Abundante não purulenta', 1], ['Abundante purulenta', 2]]),
    sel('o', 'Oxigenação (PaO₂/FiO₂)', [['> 240 ou SDRA', 0], ['≤ 240 sem SDRA', 2]]),
    sel('rx', 'Radiografia de tórax', [['Sem infiltrado', 0], ['Infiltrado difuso', 1], ['Infiltrado localizado', 2]]),
    sel('c', 'Cultura do aspirado traqueal', [['Negativa / escassa', 0], ['Moderada / abundante', 1], ['Mesma bactéria no Gram', 2]])],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...interp(_t, [[7, 'CPIS > 6: pneumonia associada à ventilação provável', 'bad'], [0, 'CPIS ≤ 6: PAV pouco provável', 'ok']]) }),
});

C({
  id: 'lis', cat: 'resp', name: 'LIS (Murray)', desc: 'Lung Injury Score',
  fields: [sel('rx', 'Quadrantes com consolidação na radiografia', pts(['0', '1', '2', '3', '4'])), num('pafi', 'PaO₂/FiO₂', 'mmHg'), num('peep', 'PEEP', 'cmH₂O'), num('comp', 'Complacência estática (opcional)', 'mL/cmH₂O')],
  calc: (v) => {
    if (!ok(v.pafi, v.peep)) return null;
    const s = [v.rx, band(v.pafi, [[300, 0], [225, 1], [175, 2], [100, 3], [-1e9, 4]]), band(v.peep, [[15, 4], [12, 3], [9, 2], [6, 1], [-1e9, 0]])];
    if (ok(v.comp)) s.push(band(v.comp, [[80, 0], [60, 1], [40, 2], [20, 3], [-1e9, 4]]));
    const x = s.reduce((a, b) => a + b, 0) / s.length;
    return { value: f(x, 2), ...interp(x, [[2.51, 'Lesão pulmonar grave (SDRA)', 'bad'], [0.1, 'Lesão pulmonar leve a moderada', 'warn'], [0, 'Sem lesão pulmonar', 'ok']]) };
  },
});

C({
  id: 'oi', cat: 'resp', name: 'Índice de oxigenação / AOI', desc: 'IO = Pmédia × FiO₂ / PaO₂; AOI = idade + IO',
  fields: [num('pm', 'Pressão média de vias aéreas', 'cmH₂O'), num('fio2', 'FiO₂', '%'), num('po2', 'PaO₂', 'mmHg'), num('idade', 'Idade (para AOI)', 'anos', { only: 'adulto' })],
  calc: (v) => {
    if (!ok(v.pm, v.fio2, v.po2)) return null;
    const io = v.pm * v.fio2 / v.po2;
    if (v._ped) return { label: 'Índice de oxigenação', value: f(io, 1),
      ...interp(io, [[16, 'PARDS grave (OI ≥ 16)', 'bad'], [4, 'PARDS leve/moderada (OI 4–16)', 'warn'], [0, 'Abaixo do critério de PARDS (OI < 4)', 'ok']]) };
    const aoi = ok(v.idade) ? v.idade + io : null;
    return { label: 'Índice de oxigenação', value: f(io, 1),
      extra: aoi != null ? [['AOI score', f(aoi, 1)], ['Mortalidade (AOI)', aoi >= 80 ? '≥ 80%' : aoi >= 60 ? '≥ 50%' : '< 50%']] : [],
      ...interp(io, [[40, 'IO ≥ 40: hipoxemia muito grave (considerar ECMO)', 'bad'], [25, 'IO 25–40: hipoxemia grave', 'bad'], [15, 'IO 15–25: hipoxemia moderada', 'warn'], [0, 'IO < 15', 'ok']]) };
  },
});

C({
  id: 'apps', cat: 'resp', name: 'APPS', desc: 'Age, PaFi, Plateau Score na SDRA', score: true,
  fields: [sel('i', 'Idade', [['< 47 anos', 1], ['47–66 anos', 2], ['> 66 anos', 3]]), sel('pf', 'PaO₂/FiO₂', [['> 158', 1], ['105–158', 2], ['< 105', 3]]), sel('pp', 'Pressão de platô', [['< 27 cmH₂O', 1], ['27–30 cmH₂O', 2], ['> 30 cmH₂O', 3]])],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...interp(_t, [[8, 'Grau III: mortalidade hospitalar ~58%', 'bad'], [5, 'Grau II: mortalidade ~36%', 'warn'], [0, 'Grau I: mortalidade ~15%', 'ok']]) }),
});

C({
  id: 'resp-ecmo', cat: 'resp', name: 'RESP score', desc: 'Sobrevida em ECMO respiratória', score: true,
  fields: [sel('i', 'Idade', [['18–49 anos', 0], ['50–59 anos', -2], ['≥ 60 anos', -3]]), chk('imu', 'Imunocomprometido', -2),
    sel('vm', 'VM antes da ECMO', [['< 48 h', 3], ['48 h – 7 dias', 1], ['> 7 dias', 0]]),
    sel('dx', 'Diagnóstico', [['Pneumonia viral', 3], ['Pneumonia bacteriana', 3], ['Asma', 11], ['Trauma / queimadura', 3], ['Aspiração', 5], ['Outra causa aguda', 1], ['Não respiratória / crônica', 0]]),
    chk('snc', 'Disfunção do SNC prévia', -7), chk('inf', 'Infecção não pulmonar associada', -3), chk('bnm', 'Bloqueio neuromuscular antes da ECMO', 1),
    chk('no', 'Óxido nítrico inalado', -1), chk('bic', 'Infusão de bicarbonato', -2), chk('pcr', 'Parada cardíaca prévia', -2), chk('co2', 'PaCO₂ ≥ 75 mmHg', -1), chk('pip', 'Pressão de pico ≥ 42 cmH₂O', -1)],
  calc: ({ _t }) => {
    const t = _t - 2;
    return { value: t, unit: 'pontos', ...interp(t, [[6, 'Classe I: sobrevida ~92%', 'ok'], [3, 'Classe II: sobrevida ~76%', 'ok'], [-1, 'Classe III: sobrevida ~57%', 'warn'], [-5, 'Classe IV: sobrevida ~33%', 'bad'], [-99, 'Classe V: sobrevida ~18%', 'bad']]) };
  },
});

C({
  id: 'ecmonet', cat: 'resp', name: 'ECMOnet', desc: 'Risco de morte em ECMO (H1N1 / SDRA)',
  fields: [num('dias', 'Dias de internação antes da ECMO', 'dias'), num('br', 'Bilirrubina', 'mg/dL'), num('cr', 'Creatinina', 'mg/dL'), num('hto', 'Hematócrito', '%'), num('pam', 'PAM', 'mmHg')],
  calc: (v) => {
    if (!ok(v.dias, v.br, v.cr, v.hto, v.pam)) return null;
    const p = band(v.dias, [[11.01, 2], [7.01, 1.5], [3.01, 1], [0, 0.5]]) + band(v.br, [[2.151, 2.5], [1.651, 2], [1.151, 1.5], [0.651, 1], [0.151, 0.5], [-1e9, 0]])
      + band(v.cr, [[2.301, 3.5], [2.001, 3], [1.701, 2.5], [1.401, 2], [1.101, 1.5], [0.801, 1], [0.501, 0.5], [-1e9, 0]])
      + band(v.hto, [[40.01, 0.5], [35.01, 1], [30.01, 1.5], [-1e9, 2]]) + band(v.pam, [[90.01, 0], [60.01, 0.5], [-1e9, 1]]) - 1;
    const lg = 5.7708 + 0.4191 * v.dias + 0.83983 * v.br + 1.9983 * v.cr - 0.1904 * v.hto - 0.0804 * v.pam;
    const r = 100 * Math.exp(lg) / (1 + Math.exp(lg));
    return { label: 'Risco de morte', value: f(r, 1), unit: '%', extra: [['ECMOnet', f(p, 1) + ' pontos']], ...interp(p, [[4.5, 'Escore > 4,5: alto risco', 'bad'], [0, 'Escore ≤ 4,5', 'ok']]) };
  },
});

C({
  id: 'mp-vcv', cat: 'resp', name: 'Poder mecânico (VCV)', desc: 'Ventilação controlada a volume – fórmula simplificada de Gattinoni',
  fields: [num('fr', 'Frequência respiratória', 'irpm'), num('vt', 'Volume corrente', 'mL'), num('ppico', 'Pressão de pico', 'cmH₂O'), num('pplat', 'Pressão de platô', 'cmH₂O'), num('peep', 'PEEP', 'cmH₂O')],
  calc: (v) => {
    if (!ok(v.fr, v.vt, v.ppico, v.pplat, v.peep)) return null;
    const mp = 0.098 * v.fr * (v.vt / 1000) * (v.ppico - 0.5 * (v.pplat - v.peep));
    return { value: f(mp, 1), unit: 'J/min', extra: [['Driving pressure', f(v.pplat - v.peep, 0) + ' cmH₂O'], ['Complacência estática', f(v.vt / (v.pplat - v.peep), 1) + ' mL/cmH₂O']],
      ...interp(mp, [[17, 'Poder mecânico > 17 J/min: associado a maior mortalidade', 'bad'], [12, 'Poder mecânico elevado (> 12 J/min)', 'warn'], [0, 'Poder mecânico aceitável', 'ok']]) };
  },
});

C({
  id: 'mp-pcv', cat: 'resp', name: 'Poder mecânico (PCV)', desc: 'Ventilação controlada a pressão – fórmula simplificada',
  fields: [num('fr', 'Frequência respiratória', 'irpm'), num('vt', 'Volume corrente', 'mL'), num('dp', 'Pressão inspiratória acima da PEEP (ΔPinsp)', 'cmH₂O'), num('peep', 'PEEP', 'cmH₂O')],
  calc: (v) => {
    if (!ok(v.fr, v.vt, v.dp, v.peep)) return null;
    const mp = 0.098 * v.fr * (v.vt / 1000) * (v.dp + v.peep);
    return { value: f(mp, 1), unit: 'J/min', ...interp(mp, [[17, 'Poder mecânico > 17 J/min: associado a maior mortalidade', 'bad'], [12, 'Poder mecânico elevado (> 12 J/min)', 'warn'], [0, 'Poder mecânico aceitável', 'ok']]) };
  },
});

C({
  id: 'mecanica', cat: 'resp', name: 'Mecânica respiratória', desc: 'Driving pressure, complacências e resistência de vias aéreas',
  fields: [num('vt', 'Volume corrente', 'mL'), num('ppico', 'Pressão de pico', 'cmH₂O'), num('pplat', 'Pressão de platô', 'cmH₂O'), num('peep', 'PEEP total', 'cmH₂O'), num('fluxo', 'Fluxo inspiratório (opcional)', 'L/min')],
  calc: (v) => {
    if (!ok(v.vt, v.pplat, v.peep)) return null;
    const dp = v.pplat - v.peep, ex = [['Complacência estática', f(v.vt / dp, 1) + ' mL/cmH₂O']];
    if (ok(v.ppico)) ex.push(['Complacência dinâmica', f(v.vt / (v.ppico - v.peep), 1) + ' mL/cmH₂O']);
    if (ok(v.ppico, v.fluxo) && v.fluxo > 0) ex.push(['Resistência de vias aéreas', f((v.ppico - v.pplat) / (v.fluxo / 60), 1) + ' cmH₂O/L/s']);
    return { label: 'Driving pressure', value: f(dp, 0), unit: 'cmH₂O', extra: ex,
      ...(dp > 15 ? { interp: 'ΔP > 15 cmH₂O: associado a maior mortalidade', level: 'bad' } : v.pplat > (v._ped ? 28 : 30) ? { interp: `Platô > ${v._ped ? 28 : 30} cmH₂O`, level: 'bad' } : { interp: 'ΔP ≤ 15 e platô adequado', level: 'ok' }) };
  },
});

C({
  id: 'pco2-vm', cat: 'resp', name: 'Correção de PCO₂ por Volume Minuto', desc: 'VM necessário para atingir a PCO₂ desejada',
  fields: [num('pco2', 'PCO₂ da gasometria', 'mmHg'), num('vm', 'Volume minuto atual', 'L/min'), num('alvo', 'PCO₂ esperada', 'mmHg'),
    head('Opcional – sugestão de ajuste'), num('vt', 'Volume corrente atual', 'mL'), num('fr', 'Frequência respiratória atual', 'irpm')],
  calc: ({ pco2, vm, alvo, vt, fr }) => {
    if (!ok(pco2, vm, alvo) || alvo <= 0) return null;
    const novo = pco2 * vm / alvo, d = novo - vm;
    const ex = [['Variação do VM', (d > 0 ? '+' : '') + f(d, 2) + ' L/min (' + (d > 0 ? '+' : '') + f(d / vm * 100, 0) + '%)']];
    if (ok(vt) && vt > 0) ex.push(['Nova FR (mantendo o VC)', f(novo * 1000 / vt, 0) + ' irpm']);
    if (ok(fr) && fr > 0) ex.push(['Novo VC (mantendo a FR)', f(novo * 1000 / fr, 0) + ' mL']);
    return { label: 'Novo volume minuto', value: f(novo, 2), unit: 'L/min', extra: ex,
      interp: d > 0 ? 'Aumentar o volume minuto (FR ou volume corrente)' : d < 0 ? 'Reduzir o volume minuto (FR ou volume corrente)' : 'Manter o volume minuto', level: 'ok' };
  },
});

C({
  id: 'pbw', cat: ['resp', 'nutri'], name: 'Peso predito e volume corrente', desc: 'Ventilação protetora (ARDSNet)',
  fields: [num('alt', 'Altura', 'cm', { only: 'adulto' }), sexo('sexo', { only: 'adulto' }), num('peso', 'Peso ideal para a idade (ou peso real)', 'kg', { only: 'ped' })],
  calc: ({ alt, sexo, peso, _ped }) => {
    if (_ped) {
      if (!ok(peso)) return null;
      return { label: 'VC alvo (6–8 mL/kg)', value: f(peso * 6, 0) + '–' + f(peso * 8, 0), unit: 'mL', extra: [['4 mL/kg', f(peso * 4, 0) + ' mL'], ['6 mL/kg', f(peso * 6, 0) + ' mL'], ['8 mL/kg', f(peso * 8, 0) + ' mL'], ['Platô', '≤ 28 cmH₂O (≤ 32 se parede torácica rígida)']],
        interp: 'PALICC-2: 6–8 mL/kg; 4–6 mL/kg se necessário para manter platô e driving pressure', level: 'ok' };
    }
    if (!ok(alt)) return null;
    const p = pesoIdeal(alt, sexo);
    return { label: 'Peso predito', value: f(p, 1), unit: 'kg', extra: [['VC 4 mL/kg', f(p * 4, 0) + ' mL'], ['VC 6 mL/kg', f(p * 6, 0) + ' mL'], ['VC 8 mL/kg', f(p * 8, 0) + ' mL']], interp: 'Volume corrente protetor: 6 mL/kg (4–8)', level: 'ok' };
  },
});

C({
  id: 'tobin', cat: ['resp', 'func'], name: 'Índice de Tobin (IRRS)', desc: 'Índice de respiração rápida e superficial – desmame',
  fields: [num('fr', 'Frequência respiratória', 'irpm'), num('vt', 'Volume corrente', 'mL'), num('peso', 'Peso', 'kg', { only: 'ped' })],
  calc: ({ fr, vt, peso, _ped }) => {
    if (!ok(fr, vt) || vt <= 0) return null;
    if (_ped) {
      if (!ok(peso) || peso <= 0) return null;
      const ri = fr / (vt / peso);
      return { label: 'IRRS indexado ao peso', value: f(ri, 1), unit: 'irpm/mL/kg', extra: [['VC por kg', f(vt / peso, 1) + ' mL/kg'], ['Cortes na literatura', '4,6 a 8 (mais citado: 6,7)']],
        ...interp(ri, [[8, 'Alto risco de falha na extubação', 'bad'], [6.7, 'Risco aumentado de falha (≥ 6,7)', 'warn'], [0, 'Favorável à extubação (< 6,7)', 'ok']]) };
    }
    const r = fr / (vt / 1000);
    return { value: f(r, 0), unit: 'irpm/L', ...interp(r, [[105, 'IRRS ≥ 105: alta probabilidade de falha no desmame', 'bad'], [0, 'IRRS < 105: preditor de sucesso no desmame', 'ok']]) };
  },
});

C({
  id: 'ri', cat: 'resp', name: 'Relação R/I', desc: 'Recrutabilidade pulmonar (Recruitment-to-Inflation ratio)',
  fields: [num('ph', 'PEEP alta', 'cmH₂O'), num('pl', 'PEEP baixa', 'cmH₂O'), num('vt', 'Volume corrente', 'mL'), num('pplat', 'Platô na PEEP baixa', 'cmH₂O'), num('vlib', 'Volume liberado ao reduzir a PEEP', 'mL')],
  calc: (v) => {
    if (!ok(v.ph, v.pl, v.vt, v.pplat, v.vlib)) return null;
    const dpeep = v.ph - v.pl, crs = v.vt / (v.pplat - v.pl), vrec = v.vlib - crs * dpeep, crec = vrec / dpeep, ri = crec / crs;
    return { value: f(ri, 2), extra: [['Volume recrutado', f(vrec, 0) + ' mL'], ['Complacência recrutada', f(crec, 1) + ' mL/cmH₂O'], ['Crs na PEEP baixa', f(crs, 1) + ' mL/cmH₂O']],
      ...interp(ri, [[0.5, 'Alta recrutabilidade: PEEP mais alta pode beneficiar', 'ok'], [-99, 'Baixa recrutabilidade: preferir PEEP mais baixa', 'warn']]) };
  },
});

C({
  id: 'pneumotorax', cat: 'resp', name: 'Pneumotórax (Light)', desc: 'Percentual de colapso pulmonar',
  fields: [num('l', 'Diâmetro do pulmão colapsado', 'cm'), num('h', 'Diâmetro do hemitórax', 'cm')],
  calc: ({ l, h }) => {
    if (!ok(l, h) || h <= 0) return null;
    const p = 100 * (1 - (l ** 3) / (h ** 3));
    return { value: f(p, 0), unit: '%', ...interp(p, [[20, 'Pneumotórax grande', 'bad'], [0, 'Pneumotórax pequeno', 'warn']]) };
  },
});

C({
  id: 'gold', cat: 'resp', name: 'GOLD – espirometria', desc: 'Gravidade da obstrução na DPOC',
  fields: [num('rel', 'VEF₁/CVF pós-broncodilatador', '%'), num('vef', 'VEF₁ (% do predito)', '%')],
  calc: ({ rel, vef }) => {
    if (!ok(rel, vef)) return null;
    if (rel >= 70) return { value: 'Sem obstrução', interp: 'VEF₁/CVF ≥ 0,70: não confirma DPOC', level: 'ok' };
    const g = vef >= 80 ? ['GOLD 1', 'Leve', 'ok'] : vef >= 50 ? ['GOLD 2', 'Moderada', 'warn'] : vef >= 30 ? ['GOLD 3', 'Grave', 'bad'] : ['GOLD 4', 'Muito grave', 'bad'];
    return { value: g[0], interp: 'Obstrução ' + g[1].toLowerCase(), level: g[2] };
  },
});

C({
  id: 'cat', cat: 'resp', name: 'CAT (DPOC)', desc: 'COPD Assessment Test', score: true,
  fields: [['tosse', 'Tosse', 'Nunca tusso', 'Tusso o tempo todo'], ['cat', 'Catarro', 'Nenhum catarro', 'Peito cheio de catarro'], ['aperto', 'Aperto no peito', 'Nenhum aperto', 'Muito apertado'],
    ['subir', 'Falta de ar ao subir ladeira/escada', 'Sem falta de ar', 'Muita falta de ar'], ['ativ', 'Atividades em casa', 'Sem limitação', 'Muito limitado'],
    ['sair', 'Confiança para sair de casa', 'Totalmente confiante', 'Nada confiante'], ['sono', 'Sono', 'Durmo bem', 'Não durmo bem'], ['energ', 'Energia', 'Muita energia', 'Nenhuma energia']]
    .map(([id, l, a, b]) => sel(id, l, [[`0 – ${a}`, 0], ['1', 1], ['2', 2], ['3', 3], ['4', 4], [`5 – ${b}`, 5]])),
  calc: ({ _t }) => ({ value: _t, unit: '/ 40', ...interp(_t, [[31, 'Impacto muito alto', 'bad'], [21, 'Impacto alto', 'bad'], [10, 'Impacto médio', 'warn'], [0, 'Impacto baixo', 'ok']]) }),
});

C({
  id: 'mmrc', cat: 'resp', name: 'mMRC', desc: 'Escala de dispneia modificada do Medical Research Council', score: true,
  fields: [sel('g', 'Grau de dispneia', [['0 – Só com exercício intenso', 0], ['1 – Ao andar rápido ou subir ladeira leve', 1], ['2 – Anda mais devagar que pessoas da mesma idade ou precisa parar', 2], ['3 – Para após ~100 m ou poucos minutos', 3], ['4 – Não sai de casa ou dispneia ao vestir-se', 4]])],
  calc: ({ _t }) => ({ value: _t, unit: 'grau', ...(_t >= 2 ? { interp: 'Mais sintomático (mMRC ≥ 2)', level: 'warn' } : { interp: 'Menos sintomático (mMRC 0–1)', level: 'ok' }) }),
});

C({
  id: 'gold-grupos', cat: 'resp', name: 'GOLD – grupos A/B/E', desc: 'Avaliação combinada da DPOC (GOLD 2023)',
  fields: [num('exac', 'Exacerbações moderadas no último ano', ''), num('hosp', 'Exacerbações com internação no último ano', ''), num('mmrc', 'mMRC', '', { min: 0, max: 4 }), num('cat', 'CAT (opcional)', '')],
  calc: (v) => {
    if (!ok(v.exac, v.hosp) || (!ok(v.mmrc) && !ok(v.cat))) return null;
    if (v.exac >= 2 || v.hosp >= 1) return { value: 'Grupo E', interp: 'Exacerbador: LABA + LAMA (considerar CI se eos ≥ 300)', level: 'bad' };
    const sint = (ok(v.mmrc) && v.mmrc >= 2) || (ok(v.cat) && v.cat >= 10);
    return sint ? { value: 'Grupo B', interp: 'Mais sintomas: LABA + LAMA', level: 'warn' } : { value: 'Grupo A', interp: 'Poucos sintomas: broncodilatador', level: 'ok' };
  },
});

C({
  id: 'bode', cat: 'resp', name: 'BODE', desc: 'Prognóstico na DPOC',
  fields: [num('vef', 'VEF₁ (% do predito)', '%'), num('tc6', 'Distância no TC6', 'm'), sel('mmrc', 'mMRC', pts(['0', '1', '2', '3', '4'])), num('imc', 'IMC', 'kg/m²')],
  calc: (v) => {
    if (!ok(v.vef, v.tc6, v.imc)) return null;
    const p = band(v.vef, [[65, 0], [50, 1], [36, 2], [-1e9, 3]]) + band(v.tc6, [[350, 0], [250, 1], [150, 2], [-1e9, 3]]) + [0, 0, 1, 2, 3][v.mmrc] + (v.imc > 21 ? 0 : 1);
    return { value: p, unit: '/ 10', ...interp(p, [[7, 'Quartil 4: sobrevida em 4 anos ~18%', 'bad'], [5, 'Quartil 3: sobrevida ~57%', 'warn'], [3, 'Quartil 2: sobrevida ~67%', 'warn'], [0, 'Quartil 1: sobrevida ~80%', 'ok']]) };
  },
});
