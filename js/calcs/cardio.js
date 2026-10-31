/* ===== Cardiovascular ===== */
C({
  id: 'pam', cat: 'cardio', name: 'PAM', desc: 'Pressão arterial média',
  fields: [num('pas', 'PA sistólica', 'mmHg'), num('pad', 'PA diastólica', 'mmHg')],
  calc: ({ pas, pad }) => {
    if (!ok(pas, pad)) return null;
    const v = (pas + 2 * pad) / 3;
    return { value: f(v, 0), unit: 'mmHg', extra: [['Pressão de pulso', f(pas - pad, 0) + ' mmHg']],
      ...interp(v, [[110, 'PAM elevada', 'warn'], [65, 'PAM adequada (≥ 65 mmHg)', 'ok'], [0, 'PAM baixa: risco de hipoperfusão', 'bad']]) };
  },
});

C({
  id: 'qtc', cat: 'cardio', name: 'QTc', desc: 'Intervalo QT corrigido (Bazett, Fridericia, Framingham, Hodges)',
  fields: [num('qt', 'QT medido', 'ms'), num('fc', 'Frequência cardíaca', 'bpm'), sexo()],
  calc: ({ qt, fc, sexo }) => {
    if (!ok(qt, fc) || fc <= 0) return null;
    const rr = 60 / fc;
    const baz = qt / Math.sqrt(rr), fri = qt / Math.cbrt(rr), fra = qt + 154 * (1 - rr), hod = qt + 1.75 * (fc - 60);
    const lim = sexo === 'F' ? 460 : 450;
    return {
      label: 'QTc (Bazett)', value: f(baz, 0), unit: 'ms',
      extra: [['Fridericia', f(fri, 0) + ' ms'], ['Framingham', f(fra, 0) + ' ms'], ['Hodges', f(hod, 0) + ' ms'], ['Intervalo RR', f(rr, 2) + ' s']],
      ...(baz > 500 ? { interp: 'QTc > 500 ms: alto risco de torsades de pointes', level: 'bad' }
        : baz > lim ? { interp: `QTc prolongado (> ${lim} ms)`, level: 'warn' }
        : { interp: 'QTc normal', level: 'ok' }),
    };
  },
});

C({
  id: 'cha2ds2vasc', cat: 'cardio', name: 'CHA₂DS₂-VASc', desc: 'Risco tromboembólico na fibrilação atrial', score: true,
  fields: [chk('icc', 'Insuficiência cardíaca / disfunção VE'), chk('has', 'Hipertensão'), chk('i75', 'Idade ≥ 75 anos', 2),
    chk('dm', 'Diabetes mellitus'), chk('avc', 'AVC / AIT / tromboembolismo prévio', 2), chk('vasc', 'Doença vascular (IAM, DAP, placa aórtica)'),
    chk('i65', 'Idade 65–74 anos'), chk('fem', 'Sexo feminino')],
  calc: ({ _t }) => {
    const risk = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2][Math.min(_t, 9)];
    return { value: _t, unit: 'pontos', extra: [['Risco anual de AVC', f(risk) + '%']],
      ...interp(_t, [[2, 'Anticoagulação oral recomendada (≥2 homens / ≥3 mulheres)', 'bad'], [1, 'Considerar anticoagulação (homem com 1 ponto)', 'warn'], [0, 'Baixo risco: sem anticoagulação', 'ok']]) };
  },
});

C({
  id: 'chads2', cat: 'cardio', name: 'CHADS₂', desc: 'Risco tromboembólico na fibrilação atrial', score: true,
  fields: [chk('icc', 'Insuficiência cardíaca'), chk('has', 'Hipertensão'), chk('i75', 'Idade ≥ 75 anos'), chk('dm', 'Diabetes'), chk('avc', 'AVC / AIT prévio', 2)],
  calc: ({ _t }) => {
    const r = [1.9, 2.8, 4.0, 5.9, 8.5, 12.5, 18.2][_t];
    return { value: _t, unit: 'pontos', extra: [['Risco anual de AVC', f(r) + '%']],
      ...interp(_t, [[2, 'Alto risco: anticoagulação', 'bad'], [1, 'Risco moderado', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'hasbled', cat: 'cardio', name: 'HAS-BLED', desc: 'Risco de sangramento com anticoagulação', score: true,
  fields: [chk('h', 'Hipertensão (PAS > 160 mmHg)'), chk('ren', 'Função renal alterada (diálise, transplante, Cr ≥ 2,26)'), chk('hep', 'Função hepática alterada (cirrose, bilirrubina > 2× ou TGO/TGP > 3×)'),
    chk('s', 'AVC prévio'), chk('b', 'Sangramento prévio ou predisposição'), chk('l', 'INR lábil'), chk('e', 'Idade > 65 anos'),
    chk('d', 'Fármacos (antiagregantes, AINE)'), chk('a', 'Álcool (≥ 8 doses/semana)')],
  calc: ({ _t }) => {
    const r = [1.13, 1.02, 1.88, 3.74, 8.70, 12.5][Math.min(_t, 5)];
    return { value: _t, unit: 'pontos', extra: [['Sangramentos maiores', f(r) + ' /100 pacientes-ano']],
      ...interp(_t, [[3, 'Alto risco de sangramento: corrigir fatores modificáveis e vigiar', 'bad'], [2, 'Risco moderado', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'timi-sest', cat: 'cardio', name: 'TIMI (SCA sem supra ST)', desc: 'Risco em angina instável / IAM sem supra de ST', score: true,
  fields: [chk('a', 'Idade ≥ 65 anos'), chk('b', '≥ 3 fatores de risco para DAC'), chk('c', 'DAC conhecida (estenose ≥ 50%)'), chk('d', 'Uso de AAS nos últimos 7 dias'),
    chk('e', '≥ 2 episódios de angina em 24 h'), chk('g', 'Desvio do ST ≥ 0,5 mm'), chk('h', 'Marcadores de necrose elevados')],
  calc: ({ _t }) => {
    const r = [4.7, 4.7, 8.3, 13.2, 19.9, 26.2, 40.9, 40.9][_t];
    return { value: _t, unit: 'pontos', extra: [['Morte/IAM/revasc. urgente em 14 dias', f(r) + '%']],
      ...interp(_t, [[5, 'Alto risco', 'bad'], [3, 'Risco intermediário', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'timi-cest', cat: 'cardio', name: 'TIMI (IAM com supra ST)', desc: 'Mortalidade em 30 dias no IAMCSST', score: true,
  fields: [sel('idade', 'Idade', [['< 65 anos', 0], ['65–74 anos', 2], ['≥ 75 anos', 3]]), chk('dm', 'Diabetes, HAS ou angina'), chk('pas', 'PAS < 100 mmHg', 3),
    chk('fc', 'FC > 100 bpm', 2), chk('k', 'Killip II–IV', 2), chk('p', 'Peso < 67 kg'), chk('ant', 'Supra ST anterior ou BRE'), chk('t', 'Tempo até tratamento > 4 h')],
  calc: ({ _t }) => {
    const r = [0.8, 1.6, 2.2, 4.4, 7.3, 12.4, 16.1, 23.4, 26.8][_t] ?? 35.9;
    return { value: _t, unit: 'pontos', extra: [['Mortalidade em 30 dias', f(r) + '%']],
      ...interp(_t, [[5, 'Alto risco', 'bad'], [3, 'Risco intermediário', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'grace', cat: 'cardio', name: 'GRACE', desc: 'Mortalidade hospitalar na síndrome coronariana aguda',
  fields: [num('idade', 'Idade', 'anos'), num('fc', 'Frequência cardíaca', 'bpm'), num('pas', 'PA sistólica', 'mmHg'), num('cr', 'Creatinina', 'mg/dL'),
    sel('killip', 'Classe Killip', [['I – sem IC', 0], ['II – estertores/B3', 20], ['III – edema agudo de pulmão', 39], ['IV – choque cardiogênico', 59]]),
    chk('pcr', 'Parada cardíaca na admissão', 39), chk('st', 'Desvio do segmento ST', 28), chk('enz', 'Enzimas cardíacas elevadas', 14)],
  calc: (v) => {
    if (!ok(v.idade, v.fc, v.pas, v.cr)) return null;
    const p = band(v.idade, [[90, 100], [80, 91], [70, 75], [60, 58], [50, 41], [40, 25], [30, 8], [-1e9, 0]])
      + band(v.fc, [[200, 46], [150, 38], [110, 24], [90, 15], [70, 9], [50, 3], [-1e9, 0]])
      + band(v.pas, [[200, 0], [160, 10], [140, 24], [120, 34], [100, 43], [80, 53], [-1e9, 58]])
      + band(v.cr, [[4, 28], [2, 21], [1.6, 13], [1.2, 10], [0.8, 7], [0.4, 4], [-1e9, 1]])
      + v.killip + (v.pcr ? 39 : 0) + (v.st ? 28 : 0) + (v.enz ? 14 : 0);
    return { value: p, unit: 'pontos',
      ...interp(p, [[141, 'Alto risco: mortalidade hospitalar > 3%', 'bad'], [109, 'Risco intermediário: 1–3%', 'warn'], [0, 'Baixo risco: < 1%', 'ok']]) };
  },
});

C({
  id: 'crusade', cat: 'cardio', name: 'CRUSADE', desc: 'Risco de sangramento maior na SCA sem supra ST',
  fields: [num('hto', 'Hematócrito', '%'), num('clcr', 'Clearance de creatinina', 'mL/min'), num('fc', 'Frequência cardíaca', 'bpm'), num('pas', 'PA sistólica', 'mmHg'),
    sexo(), chk('icc', 'Sinais de IC na apresentação', 7), chk('vasc', 'Doença vascular prévia (DAP ou AVC)', 6), chk('dm', 'Diabetes mellitus', 6)],
  calc: (v) => {
    if (!ok(v.hto, v.clcr, v.fc, v.pas)) return null;
    const p = band(v.hto, [[40, 0], [37, 2], [34, 3], [31, 7], [-1e9, 9]])
      + band(v.clcr, [[120.01, 0], [90.01, 7], [60.01, 17], [30.01, 28], [15.01, 35], [-1e9, 39]])
      + band(v.fc, [[121, 11], [111, 10], [101, 8], [91, 6], [81, 3], [71, 1], [-1e9, 0]])
      + band(v.pas, [[201, 5], [181, 3], [121, 1], [101, 5], [91, 8], [-1e9, 10]])
      + (v.sexo === 'F' ? 8 : 0) + (v.icc ? 7 : 0) + (v.vasc ? 6 : 0) + (v.dm ? 6 : 0);
    const r = p <= 20 ? ['Muito baixo', 3.1, 'ok'] : p <= 30 ? ['Baixo', 5.5, 'ok'] : p <= 40 ? ['Moderado', 8.6, 'warn'] : p <= 50 ? ['Alto', 11.9, 'bad'] : ['Muito alto', 19.5, 'bad'];
    return { value: p, unit: 'pontos', interp: `Risco ${r[0].toLowerCase()} de sangramento maior: ${f(r[1])}%`, level: r[2] };
  },
});

C({
  id: 'euroscore2', cat: 'cardio', name: 'EuroSCORE II', desc: 'Mortalidade em cirurgia cardíaca',
  fields: [num('idade', 'Idade', 'anos'), sexo(),
    sel('renal', 'Função renal (ClCr)', [['> 85 mL/min', 0], ['50–85 mL/min', 0.303553], ['≤ 50 mL/min', 0.8592256], ['Diálise', 0.6421508]]),
    chk('arter', 'Arteriopatia extracardíaca', 0.5360268), chk('mob', 'Mobilidade reduzida', 0.2407181), chk('prev', 'Cirurgia cardíaca prévia', 1.118599),
    chk('dpoc', 'Doença pulmonar crônica', 0.1886564), chk('endo', 'Endocardite ativa', 0.6194522), chk('crit', 'Estado pré-operatório crítico', 1.086517),
    chk('dm', 'Diabetes em uso de insulina', 0.3542749),
    sel('nyha', 'Classe NYHA', [['I', 0], ['II', 0.1070545], ['III', 0.2958358], ['IV', 0.5597929]]),
    chk('ccs4', 'Angina CCS classe 4', 0.2226147),
    sel('fe', 'Fração de ejeção VE', [['Boa (> 50%)', 0], ['Moderada (31–50%)', 0.3150652], ['Ruim (21–30%)', 0.8084096], ['Muito ruim (≤ 20%)', 0.9346919]]),
    chk('iam', 'IAM recente (≤ 90 dias)', 0.1528943),
    sel('hp', 'PSAP', [['< 31 mmHg', 0], ['31–55 mmHg', 0.1788899], ['> 55 mmHg', 0.3491475]]),
    sel('urg', 'Urgência', [['Eletiva', 0], ['Urgente', 0.3174673], ['Emergência', 0.7039121], ['Resgate (salvage)', 1.362947]]),
    sel('peso', 'Peso da intervenção', [['RM isolada', 0], ['1 procedimento não-RM', 0.0062118], ['2 procedimentos', 0.5521478], ['3 procedimentos', 0.9724533]]),
    chk('aorta', 'Cirurgia de aorta torácica', 0.6527205)],
  calc: (v) => {
    if (!ok(v.idade)) return null;
    let y = -5.324537 + 0.0285181 * Math.max(1, v.idade - 59) + (v.sexo === 'F' ? 0.2196434 : 0);
    for (const k of ['renal', 'nyha', 'fe', 'hp', 'urg', 'peso']) y += v[k];
    for (const [k, c] of [['arter', 0.5360268], ['mob', 0.2407181], ['prev', 1.118599], ['dpoc', 0.1886564], ['endo', 0.6194522], ['crit', 1.086517], ['dm', 0.3542749], ['ccs4', 0.2226147], ['iam', 0.1528943], ['aorta', 0.6527205]]) if (v[k]) y += c;
    const m = 100 * Math.exp(y) / (1 + Math.exp(y));
    return { label: 'Mortalidade prevista', value: f(m, 2), unit: '%',
      ...interp(m, [[10, 'Risco muito alto', 'bad'], [4, 'Risco alto', 'bad'], [2, 'Risco intermediário', 'warn'], [0, 'Baixo risco', 'ok']]) };
  },
});

C({
  id: 'sgarbossa', cat: 'cardio', name: 'Sgarbossa', desc: 'Critérios ECG de IAM com bloqueio de ramo esquerdo', score: true,
  fields: [chk('a', 'Supra ST ≥ 1 mm concordante com QRS', 5), chk('b', 'Infra ST ≥ 1 mm em V1–V3', 3), chk('c', 'Supra ST ≥ 5 mm discordante com QRS', 2)],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...interp(_t, [[3, 'Sugestivo de IAM (especificidade ~90%)', 'bad'], [0, 'Não diagnóstico (não exclui IAM)', 'ok']]) }),
});

C({
  id: 'wells-tep', cat: 'cardio', name: 'Wells (TEP)', desc: 'Probabilidade clínica de tromboembolismo pulmonar', score: true,
  fields: [chk('a', 'Sinais clínicos de TVP', 3), chk('b', 'TEP é o diagnóstico mais provável', 3), chk('c', 'FC > 100 bpm', 1.5), chk('d', 'Imobilização ≥ 3 dias ou cirurgia < 4 semanas', 1.5),
    chk('e', 'TVP ou TEP prévios', 1.5), chk('f', 'Hemoptise', 1), chk('g', 'Câncer ativo', 1)],
  calc: ({ _t }) => ({ value: f(_t), unit: 'pontos', extra: [['Modelo dicotômico', _t > 4 ? 'TEP provável' : 'TEP improvável (D-dímero)']],
    ...interp(_t, [[6.01, 'Probabilidade alta', 'bad'], [2, 'Probabilidade moderada', 'warn'], [0, 'Probabilidade baixa', 'ok']]) }),
});

C({
  id: 'genebra', cat: 'cardio', name: 'Genebra revisado (TEP)', desc: 'Probabilidade clínica de TEP',
  fields: [chk('a', 'Idade > 65 anos', 1), chk('b', 'TVP ou TEP prévios', 3), chk('c', 'Cirurgia ou fratura no último mês', 2), chk('d', 'Câncer ativo', 2),
    chk('e', 'Dor unilateral em membro inferior', 3), chk('g', 'Hemoptise', 2), num('fc', 'Frequência cardíaca', 'bpm'), chk('h', 'Dor à palpação venosa e edema unilateral', 4)],
  calc: (v) => {
    if (!ok(v.fc)) return null;
    const p = [['a', 1], ['b', 3], ['c', 2], ['d', 2], ['e', 3], ['g', 2], ['h', 4]].reduce((s, [k, n]) => s + (v[k] ? n : 0), 0) + band(v.fc, [[95, 5], [75, 3], [-1e9, 0]]);
    return { value: p, unit: 'pontos', ...interp(p, [[11, 'Probabilidade alta (~74%)', 'bad'], [4, 'Probabilidade intermediária (~28%)', 'warn'], [0, 'Probabilidade baixa (~8%)', 'ok']]) };
  },
});

C({
  id: 'spesi', cat: 'cardio', name: 'sPESI', desc: 'Índice de gravidade do TEP simplificado', score: true,
  fields: [chk('a', 'Idade > 80 anos'), chk('b', 'Câncer'), chk('c', 'Doença cardiopulmonar crônica'), chk('d', 'FC ≥ 110 bpm'), chk('e', 'PAS < 100 mmHg'), chk('g', 'SpO₂ < 90%')],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...(_t ? { interp: 'Alto risco: mortalidade em 30 dias ~10,9%', level: 'bad' } : { interp: 'Baixo risco: mortalidade em 30 dias ~1%', level: 'ok' }) }),
});

C({
  id: 'wells-tvp', cat: 'cardio', name: 'Wells (TVP)', desc: 'Probabilidade clínica de trombose venosa profunda', score: true,
  fields: [chk('a', 'Câncer ativo'), chk('b', 'Paralisia, paresia ou imobilização gessada recente'), chk('c', 'Acamado > 3 dias ou cirurgia maior < 12 semanas'),
    chk('d', 'Dor localizada no trajeto venoso profundo'), chk('e', 'Edema de todo o membro'), chk('g', 'Panturrilha > 3 cm maior que a contralateral'),
    chk('h', 'Edema depressível no membro sintomático'), chk('i', 'Veias colaterais superficiais'), chk('j', 'TVP prévia documentada'), chk('k', 'Diagnóstico alternativo tão provável quanto TVP', -2)],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...interp(_t, [[2, 'TVP provável', 'bad'], [-10, 'TVP improvável: dosar D-dímero', 'ok']]) }),
});

C({
  id: 'hemodin', cat: 'cardio', name: 'Hemodinâmica (PiCCO / DC)', desc: 'Índice cardíaco, volume sistólico e resistências',
  fields: [num('dc', 'Débito cardíaco', 'L/min'), num('fc', 'Frequência cardíaca', 'bpm'), num('pam', 'PAM', 'mmHg'), num('pvc', 'PVC', 'mmHg'),
    num('peso', 'Peso', 'kg'), num('alt', 'Altura', 'cm')],
  calc: (v) => {
    if (!ok(v.dc, v.fc, v.pam, v.peso, v.alt)) return null;
    const s = asc(v.peso, v.alt), ic = v.dc / s, vs = v.dc * 1000 / v.fc, pvc = ok(v.pvc) ? v.pvc : 0;
    const rvs = 80 * (v.pam - pvc) / v.dc;
    return { label: 'Índice cardíaco', value: f(ic, 2), unit: 'L/min/m²',
      extra: [['Superfície corporal', f(s, 2) + ' m²'], ['Volume sistólico', f(vs, 0) + ' mL'], ['Índice sistólico', f(vs / s, 0) + ' mL/m²'],
        ['RVS', f(rvs, 0) + ' dyn·s/cm⁵'], ['IRVS', f(rvs * s, 0) + ' dyn·s·m²/cm⁵'], ['Potência cardíaca', f(v.pam * v.dc / 451, 2) + ' W']],
      ...interp(ic, [[4.2, 'IC elevado (hiperdinâmico)', 'warn'], [2.5, 'IC normal (2,5–4,2)', 'ok'], [2.2, 'IC limítrofe', 'warn'], [0, 'IC baixo: considerar baixo débito', 'bad']]) };
  },
});
