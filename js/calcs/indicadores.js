/* ===== Prognóstico e UTI ===== */
C({
  id: 'apache2', cat: 'indic', name: 'APACHE II', desc: 'Gravidade e mortalidade na UTI (piores valores das primeiras 24 h)',
  fields: [num('idade', 'Idade', 'anos'), num('t', 'Temperatura retal', '°C'), num('pam', 'PAM', 'mmHg'), num('fc', 'Frequência cardíaca', 'bpm'), num('fr', 'Frequência respiratória', 'irpm'),
    num('fio2', 'FiO₂', '%'), num('po2', 'PaO₂', 'mmHg'), num('pco2', 'PaCO₂ (se FiO₂ ≥ 50%)', 'mmHg'), num('ph', 'pH arterial'), num('na', 'Sódio', 'mEq/L'), num('k', 'Potássio', 'mEq/L'),
    num('cr', 'Creatinina', 'mg/dL'), chk('ira', 'Insuficiência renal aguda (dobra pontos da creatinina)'), num('hto', 'Hematócrito', '%'), num('leuco', 'Leucócitos', '×10³/mm³'), num('gcs', 'Glasgow', '', { min: 3, max: 15 }),
    sel('cron', 'Doença crônica grave / imunossupressão', [['Não', 0], ['Sim – pós-operatório eletivo', 2], ['Sim – clínico ou pós-operatório de urgência', 5]])],
  calc: (v) => {
    const req = ['idade', 't', 'pam', 'fc', 'fr', 'fio2', 'po2', 'ph', 'na', 'k', 'cr', 'hto', 'leuco', 'gcs'];
    if (!req.every((k) => ok(v[k]))) return null;
    let o;
    if (v.fio2 >= 50) {
      const pco2 = ok(v.pco2) ? v.pco2 : 40, aa = (v.fio2 / 100) * 713 - pco2 / 0.8 - v.po2;
      o = band(aa, [[500, 4], [350, 3], [200, 2], [-1e9, 0]]);
    } else o = band(v.po2, [[70.01, 0], [61, 1], [55, 3], [-1e9, 4]]);
    const aps = band(v.t, [[41, 4], [39, 3], [38.5, 1], [36, 0], [34, 1], [32, 2], [30, 3], [-1e9, 4]])
      + band(v.pam, [[160, 4], [130, 3], [110, 2], [70, 0], [50, 2], [-1e9, 4]])
      + band(v.fc, [[180, 4], [140, 3], [110, 2], [70, 0], [55, 2], [40, 3], [-1e9, 4]])
      + band(v.fr, [[50, 4], [35, 3], [25, 1], [12, 0], [10, 1], [6, 2], [-1e9, 4]]) + o
      + band(v.ph, [[7.7, 4], [7.6, 3], [7.5, 1], [7.33, 0], [7.25, 2], [7.15, 3], [-1e9, 4]])
      + band(v.na, [[180, 4], [160, 3], [155, 2], [150, 1], [130, 0], [120, 2], [111, 3], [-1e9, 4]])
      + band(v.k, [[7, 4], [6, 3], [5.5, 1], [3.5, 0], [3, 1], [2.5, 2], [-1e9, 4]])
      + band(v.cr, [[3.5, 4], [2, 3], [1.5, 2], [0.6, 0], [-1e9, 2]]) * (v.ira ? 2 : 1)
      + band(v.hto, [[60, 4], [50, 2], [46, 1], [30, 0], [20, 2], [-1e9, 4]])
      + band(v.leuco, [[40, 4], [20, 2], [15, 1], [3, 0], [1, 2], [-1e9, 4]])
      + (15 - v.gcs);
    const ida = band(v.idade, [[75, 6], [65, 5], [55, 3], [45, 2], [-1e9, 0]]);
    const tot = aps + ida + v.cron;
    const m = tot >= 35 ? '~85%' : tot >= 30 ? '~75%' : tot >= 25 ? '~55%' : tot >= 20 ? '~40%' : tot >= 15 ? '~25%' : tot >= 10 ? '~15%' : tot >= 5 ? '~8%' : '~4%';
    return { value: tot, unit: 'pontos', extra: [['Fisiologia aguda (APS)', aps], ['Idade', ida], ['Doença crônica', v.cron], ['Mortalidade hospitalar estimada', m]],
      ...interp(tot, [[25, 'Gravidade muito alta', 'bad'], [15, 'Gravidade alta', 'bad'], [10, 'Gravidade moderada', 'warn'], [0, 'Gravidade baixa', 'ok']]) };
  },
});

C({
  id: 'sofa', cat: 'indic', name: 'SOFA', desc: 'Avaliação sequencial de falência orgânica',
  fields: [num('pafi', 'PaO₂/FiO₂', 'mmHg'), chk('vm', 'Em suporte ventilatório'), num('plq', 'Plaquetas', '×10³/µL'), num('bili', 'Bilirrubina', 'mg/dL'),
    sel('cv', 'Cardiovascular', [['PAM ≥ 70 mmHg', 0], ['PAM < 70 mmHg', 1], ['Dopamina ≤ 5 ou dobutamina (qualquer dose)', 2], ['Dopamina > 5, nora/adrenalina ≤ 0,1 µg/kg/min', 3], ['Dopamina > 15, nora/adrenalina > 0,1 µg/kg/min', 4]]),
    num('gcs', 'Glasgow', '', { min: 3, max: 15 }), num('cr', 'Creatinina', 'mg/dL'), num('diu', 'Diurese (opcional)', 'mL/dia')],
  calc: (v) => {
    if (!ok(v.pafi, v.plq, v.bili, v.gcs, v.cr)) return null;
    let r = band(v.pafi, [[400, 0], [300, 1], [200, 2], [100, 3], [-1e9, 4]]);
    if (!v.vm && r > 2) r = 2;
    let ren = band(v.cr, [[5, 4], [3.5, 3], [2, 2], [1.2, 1], [-1e9, 0]]);
    if (ok(v.diu)) ren = Math.max(ren, v.diu < 200 ? 4 : v.diu < 500 ? 3 : 0);
    const parts = [['Respiratório', r], ['Coagulação', band(v.plq, [[150, 0], [100, 1], [50, 2], [20, 3], [-1e9, 4]])], ['Hepático', band(v.bili, [[12, 4], [6, 3], [2, 2], [1.2, 1], [-1e9, 0]])],
      ['Cardiovascular', v.cv], ['Neurológico', band(v.gcs, [[15, 0], [13, 1], [10, 2], [6, 3], [-1e9, 4]])], ['Renal', ren]];
    const t = parts.reduce((s, p) => s + p[1], 0);
    return { value: t, unit: '/ 24', extra: parts, ...interp(t, [[15, 'Mortalidade > 80%', 'bad'], [10, 'Mortalidade ~40–50%', 'bad'], [7, 'Mortalidade ~15–20%', 'warn'], [2, 'Disfunção orgânica (SOFA ≥ 2: critério de sepse)', 'warn'], [0, 'Sem disfunção orgânica significativa', 'ok']]) };
  },
});

C({
  id: 'qsofa', cat: 'indic', name: 'qSOFA', desc: 'Triagem rápida de sepse fora da UTI', score: true,
  fields: [chk('fr', 'FR ≥ 22 irpm'), chk('mental', 'Alteração do estado mental'), chk('pas', 'PAS ≤ 100 mmHg')],
  calc: ({ _t }) => ({ value: _t, unit: '/ 3', ...interp(_t, [[2, 'qSOFA ≥ 2: alto risco de desfecho desfavorável – investigar sepse', 'bad'], [0, 'qSOFA < 2', 'ok']]) }),
});

C({
  id: 'charlson', cat: 'indic', name: 'Charlson', desc: 'Índice de comorbidades e sobrevida em 10 anos',
  fields: [sel('idade', 'Idade', [['< 50 anos', 0], ['50–59 anos', 1], ['60–69 anos', 2], ['70–79 anos', 3], ['≥ 80 anos', 4]]),
    chk('iam', 'Infarto do miocárdio'), chk('icc', 'Insuficiência cardíaca'), chk('dap', 'Doença arterial periférica'), chk('avc', 'Doença cerebrovascular / AIT'), chk('dem', 'Demência'),
    chk('dpoc', 'Doença pulmonar crônica'), chk('tec', 'Doença do tecido conjuntivo'), chk('ulc', 'Úlcera péptica'), chk('hep', 'Hepatopatia leve'), chk('dm', 'Diabetes sem lesão de órgão-alvo'),
    chk('hemi', 'Hemiplegia', 2), chk('ren', 'Doença renal moderada a grave', 2), chk('dmlo', 'Diabetes com lesão de órgão-alvo', 2), chk('tum', 'Tumor sólido (sem metástase)', 2),
    chk('leu', 'Leucemia', 2), chk('lin', 'Linfoma', 2), chk('hepg', 'Hepatopatia moderada a grave', 3), chk('met', 'Tumor sólido metastático', 6), chk('aids', 'AIDS', 6)],
  calc: (v, def) => {
    let t = 0;
    for (const fl of def.fields) if (fl.t === 'chk' && v[fl.id]) t += fl.pts;
    const ta = t + v.idade, s = 100 * 0.983 ** Math.exp(ta * 0.9);
    return { label: 'Charlson ajustado por idade', value: ta, unit: 'pontos', extra: [['Sem ajuste por idade', t], ['Sobrevida estimada em 10 anos', f(s, 0) + '%']],
      ...interp(ta, [[5, 'Comorbidade muito alta', 'bad'], [3, 'Comorbidade alta', 'warn'], [1, 'Comorbidade moderada', 'ok'], [0, 'Sem comorbidade', 'ok']]) };
  },
});

C({
  id: 'karnofsky', cat: ['indic', 'func'], name: 'Karnofsky e ECOG', desc: 'Capacidade funcional no paciente oncológico', score: true,
  fields: [sel('k', 'Karnofsky', [[100, 'Normal, sem queixas'], [90, 'Atividade normal; sinais menores'], [80, 'Atividade normal com esforço'], [70, 'Cuida de si; incapaz de atividade normal'], [60, 'Requer assistência ocasional'],
    [50, 'Requer assistência considerável'], [40, 'Incapacitado; cuidados especiais'], [30, 'Gravemente incapacitado; hospitalização'], [20, 'Muito doente; suporte ativo'], [10, 'Moribundo'], [0, 'Óbito']].map(([n, t]) => [`${n}% – ${t}`, n]))],
  calc: ({ k }) => {
    const ecog = k >= 90 ? 0 : k >= 70 ? 1 : k >= 50 ? 2 : k >= 30 ? 3 : k > 0 ? 4 : 5;
    return { value: k + '%', extra: [['ECOG equivalente', ecog]], ...interp(k, [[80, 'Capaz de atividade normal', 'ok'], [50, 'Incapaz de trabalhar; vive em casa', 'warn'], [0, 'Incapaz de cuidar de si', 'bad']]) };
  },
});

/* ===== Neurológico ===== */
C({
  id: 'glasgow', cat: 'neuro', name: 'Escala de Coma de Glasgow', desc: 'Nível de consciência (com resposta pupilar opcional)', score: true,
  fields: [sel('o', 'Abertura ocular', [['4 – Espontânea', 4], ['3 – Ao som / voz', 3], ['2 – À pressão / dor', 2], ['1 – Ausente', 1]]),
    sel('v', 'Resposta verbal', [['5 – Orientada', 5], ['4 – Confusa', 4], ['3 – Palavras', 3], ['2 – Sons', 2], ['1 – Ausente', 1]]),
    sel('m', 'Resposta motora', [['6 – Obedece comandos', 6], ['5 – Localiza', 5], ['4 – Flexão normal (retirada)', 4], ['3 – Flexão anormal (decorticação)', 3], ['2 – Extensão (descerebração)', 2], ['1 – Ausente', 1]])],
  calc: ({ _t, o, v, m }) => ({ value: _t, unit: '/ 15', extra: [['Fórmula', `O${o} V${v} M${m}`]], ...interp(_t, [[13, 'TCE leve (13–15)', 'ok'], [9, 'TCE moderado (9–12)', 'warn'], [0, 'TCE grave (≤ 8): considerar via aérea definitiva', 'bad']]) }),
});

C({
  id: 'nihss', cat: 'neuro', name: 'NIHSS', desc: 'Escala de AVC do National Institutes of Health', score: true,
  fields: [sel('1a', '1a. Nível de consciência', pts(['Alerta', 'Sonolento', 'Estuporoso', 'Coma'])), sel('1b', '1b. Perguntas (mês e idade)', pts(['Ambas corretas', 'Uma correta', 'Nenhuma correta'])),
    sel('1c', '1c. Comandos (olhos e mão)', pts(['Ambos corretos', 'Um correto', 'Nenhum correto'])), sel('2', '2. Olhar conjugado', pts(['Normal', 'Paralisia parcial', 'Desvio forçado'])),
    sel('3', '3. Campos visuais', pts(['Sem perda', 'Hemianopsia parcial', 'Hemianopsia completa', 'Hemianopsia bilateral'])), sel('4', '4. Paralisia facial', pts(['Normal', 'Leve', 'Parcial', 'Completa'])),
    ...[['5a', '5a. Motor – braço esquerdo'], ['5b', '5b. Motor – braço direito']].map(([id, l]) => sel(id, l, pts(['Sem queda', 'Queda antes de 10 s', 'Algum esforço contra gravidade', 'Sem esforço contra gravidade', 'Nenhum movimento']))),
    ...[['6a', '6a. Motor – perna esquerda'], ['6b', '6b. Motor – perna direita']].map(([id, l]) => sel(id, l, pts(['Sem queda', 'Queda antes de 5 s', 'Algum esforço contra gravidade', 'Sem esforço contra gravidade', 'Nenhum movimento']))),
    sel('7', '7. Ataxia de membros', pts(['Ausente', 'Em um membro', 'Em dois membros'])), sel('8', '8. Sensibilidade', pts(['Normal', 'Perda leve a moderada', 'Perda grave ou total'])),
    sel('9', '9. Linguagem', pts(['Normal', 'Afasia leve a moderada', 'Afasia grave', 'Mutismo / afasia global'])), sel('10', '10. Disartria', pts(['Normal', 'Leve a moderada', 'Grave'])),
    sel('11', '11. Extinção / negligência', pts(['Ausente', 'Uma modalidade', 'Mais de uma modalidade']))],
  calc: ({ _t }) => ({ value: _t, unit: '/ 42', ...interp(_t, [[21, 'AVC grave', 'bad'], [16, 'AVC moderado a grave', 'bad'], [5, 'AVC moderado', 'warn'], [1, 'AVC leve', 'ok'], [0, 'Sem déficit', 'ok']]) }),
});

C({
  id: 'rankin', cat: ['neuro', 'func'], name: 'Rankin modificada', desc: 'Grau de incapacidade após AVC', score: true,
  fields: [sel('r', 'Grau', [['0 – Sem sintomas', 0], ['1 – Sintomas sem incapacidade significativa', 1], ['2 – Incapacidade leve: independente', 2], ['3 – Incapacidade moderada: anda sem ajuda', 3],
    ['4 – Moderadamente grave: não anda sem ajuda', 4], ['5 – Incapacidade grave: acamado, cuidados constantes', 5], ['6 – Óbito', 6]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 6', ...interp(_t, [[4, 'Dependente', 'bad'], [3, 'Dependência moderada', 'warn'], [0, 'Independente (bom desfecho: mRS 0–2)', 'ok']]) }),
});

C({
  id: 'ich', cat: 'neuro', name: 'ICH score', desc: 'Mortalidade em 30 dias na hemorragia intracerebral', score: true,
  fields: [sel('g', 'Glasgow', [['13–15', 0], ['5–12', 1], ['3–4', 2]]), chk('v', 'Volume do hematoma ≥ 30 mL'), chk('ivh', 'Hemorragia intraventricular'), chk('inf', 'Origem infratentorial'), chk('i', 'Idade ≥ 80 anos')],
  calc: ({ _t }) => ({ value: _t, unit: '/ 6', extra: [['Mortalidade em 30 dias', ['0%', '13%', '26%', '72%', '97%', '100%', '100%'][_t]]], ...interp(_t, [[3, 'Alto risco', 'bad'], [2, 'Risco moderado', 'warn'], [0, 'Baixo risco', 'ok']]) }),
});

C({
  id: 'mmse', cat: ['neuro', 'func'], name: 'Mini-Exame do Estado Mental', desc: 'Rastreio cognitivo (MEEM)', score: true,
  fields: [sel('ot', 'Orientação temporal (dia, mês, ano, dia da semana, hora)', pts(['0', '1', '2', '3', '4', '5'])), sel('oe', 'Orientação espacial (local, andar, bairro, cidade, estado)', pts(['0', '1', '2', '3', '4', '5'])),
    sel('mi', 'Memória imediata (3 palavras)', pts(['0', '1', '2', '3'])), sel('at', 'Atenção e cálculo (100 − 7 seriado)', pts(['0', '1', '2', '3', '4', '5'])), sel('ev', 'Evocação (3 palavras)', pts(['0', '1', '2', '3'])),
    sel('no', 'Nomeação (relógio e caneta)', pts(['0', '1', '2'])), sel('re', 'Repetição ("nem aqui, nem ali, nem lá")', pts(['0', '1'])), sel('co', 'Comando de 3 estágios', pts(['0', '1', '2', '3'])),
    sel('le', 'Leitura ("feche os olhos")', pts(['0', '1'])), sel('es', 'Escrever uma frase', pts(['0', '1'])), sel('cp', 'Copiar desenho (pentágonos)', pts(['0', '1'])),
    sel('esc', 'Escolaridade (pontos de corte – Brucki)', [['Analfabeto (corte 20)', 20], ['1–4 anos (corte 25)', 25], ['5–8 anos (corte 26,5)', 26.5], ['9–11 anos (corte 28)', 28], ['> 11 anos (corte 29)', 29]])],
  calc: ({ _t, esc }) => {
    const t = _t - esc;
    return { value: t, unit: '/ 30', extra: [['Ponto de corte para a escolaridade', f(esc)]], ...(t < esc ? { interp: 'Abaixo do esperado para a escolaridade: investigar déficit cognitivo', level: 'bad' } : { interp: 'Dentro do esperado para a escolaridade', level: 'ok' }) };
  },
});

C({
  id: 'rass', cat: ['neuro', 'indic'], name: 'RASS', desc: 'Richmond Agitation-Sedation Scale', score: true,
  fields: [sel('r', 'Nível', [['+4 Combativo', 4], ['+3 Muito agitado', 3], ['+2 Agitado', 2], ['+1 Inquieto', 1], ['0 Alerta e calmo', 0], ['−1 Sonolento (> 10 s ao chamado)', -1], ['−2 Sedação leve (< 10 s)', -2],
    ['−3 Sedação moderada (movimento sem contato visual)', -3], ['−4 Sedação profunda (resposta só ao estímulo físico)', -4], ['−5 Não despertável', -5]], { def: 0 })],
  calc: ({ _t }) => ({ value: (_t > 0 ? '+' : '') + _t, ...(_t > 0 ? { interp: 'Agitação', level: _t >= 3 ? 'bad' : 'warn' } : _t >= -2 ? { interp: 'Sedação leve / alvo habitual (0 a −2)', level: 'ok' } : { interp: 'Sedação profunda', level: _t <= -4 ? 'bad' : 'warn' }) }),
});

C({
  id: 'cam-icu', cat: ['neuro', 'indic'], name: 'CAM-ICU', desc: 'Diagnóstico de delirium na UTI (RASS ≥ −3)',
  fields: [chk('f1', '1. Alteração aguda ou flutuação do estado mental'), chk('f2', '2. Desatenção (≥ 3 erros no teste das letras)'), chk('f3', '3. Nível de consciência alterado (RASS ≠ 0)'), chk('f4', '4. Pensamento desorganizado (≥ 2 erros)')],
  calc: (v) => (v.f1 && v.f2 && (v.f3 || v.f4) ? { value: 'Positivo', interp: 'Delirium presente', level: 'bad' } : { value: 'Negativo', interp: 'Sem delirium (critérios 1 + 2 + (3 ou 4) não preenchidos)', level: 'ok' }),
});

/* ===== Funcional e dependência ===== */
C({
  id: 'barthel', cat: 'func', name: 'Índice de Barthel', desc: 'Independência nas atividades básicas de vida diária', score: true,
  fields: [sel('al', 'Alimentação', [['Independente', 10], ['Precisa de ajuda (cortar, passar manteiga)', 5], ['Dependente', 0]]),
    sel('ba', 'Banho', [['Independente', 5], ['Dependente', 0]]), sel('hi', 'Higiene pessoal', [['Independente (rosto, cabelo, dentes, barba)', 5], ['Dependente', 0]]),
    sel('ve', 'Vestir-se', [['Independente', 10], ['Precisa de ajuda (faz metade)', 5], ['Dependente', 0]]),
    sel('in', 'Intestino', [['Continente', 10], ['Acidente ocasional', 5], ['Incontinente', 0]]), sel('be', 'Bexiga', [['Continente', 10], ['Acidente ocasional', 5], ['Incontinente / sondado', 0]]),
    sel('sa', 'Uso do sanitário', [['Independente', 10], ['Precisa de alguma ajuda', 5], ['Dependente', 0]]),
    sel('tr', 'Transferência cama-cadeira', [['Independente', 15], ['Pequena ajuda', 10], ['Grande ajuda, mas senta', 5], ['Incapaz', 0]]),
    sel('mo', 'Mobilidade', [['Anda 50 m independente', 15], ['Anda com ajuda de uma pessoa', 10], ['Independente em cadeira de rodas', 5], ['Imóvel', 0]]),
    sel('es', 'Escadas', [['Independente', 10], ['Precisa de ajuda', 5], ['Incapaz', 0]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 100', ...interp(_t, [[100, 'Independente', 'ok'], [60, 'Dependência leve', 'ok'], [40, 'Dependência moderada', 'warn'], [20, 'Dependência grave', 'bad'], [0, 'Dependência total', 'bad']]) }),
});

C({
  id: 'lawton', cat: 'func', name: 'Lawton-Brody', desc: 'Atividades instrumentais de vida diária', score: true,
  fields: [['tel', 'Usar o telefone'], ['comp', 'Fazer compras'], ['com', 'Preparar refeições'], ['casa', 'Cuidar da casa'], ['roupa', 'Lavar roupa'], ['transp', 'Usar transporte'], ['med', 'Controlar medicação'], ['din', 'Manejar dinheiro']]
    .map(([id, l]) => sel(id, l, [['Independente', 3], ['Com ajuda parcial', 2], ['Incapaz / dependente', 1]])),
  calc: ({ _t }) => ({ value: _t, unit: '/ 24', ...interp(_t, [[24, 'Independente', 'ok'], [17, 'Dependência leve', 'ok'], [9, 'Dependência moderada', 'warn'], [0, 'Dependência grave', 'bad']]) }),
});

C({
  id: 'mrc', cat: 'func', name: 'MRC – soma muscular', desc: 'Fraqueza adquirida na UTI (0–60)', score: true,
  fields: [['abd', 'Abdução do ombro'], ['flex', 'Flexão do cotovelo'], ['ext', 'Extensão do punho'], ['quad', 'Flexão do quadril'], ['joe', 'Extensão do joelho'], ['dor', 'Dorsiflexão do tornozelo']]
    .flatMap(([id, l]) => ['D', 'E'].map((s) => sel(id + s, `${l} – ${s === 'D' ? 'direito' : 'esquerdo'}`, [['5 – Força normal', 5], ['4 – Contra resistência', 4], ['3 – Contra a gravidade', 3], ['2 – Sem gravidade', 2], ['1 – Contração visível', 1], ['0 – Nenhuma contração', 0]]))),
  calc: ({ _t }) => ({ value: _t, unit: '/ 60', ...interp(_t, [[48, 'Sem fraqueza adquirida na UTI', 'ok'], [36, 'Fraqueza adquirida na UTI (< 48)', 'warn'], [0, 'Fraqueza grave (< 36)', 'bad']]) }),
});

C({
  id: 'braden', cat: 'func', name: 'Escala de Braden', desc: 'Risco de lesão por pressão', score: true,
  fields: [sel('s', 'Percepção sensorial', [['4 – Sem limitação', 4], ['3 – Levemente limitada', 3], ['2 – Muito limitada', 2], ['1 – Totalmente limitada', 1]]),
    sel('u', 'Umidade', [['4 – Raramente úmida', 4], ['3 – Ocasionalmente úmida', 3], ['2 – Muito úmida', 2], ['1 – Constantemente úmida', 1]]),
    sel('a', 'Atividade', [['4 – Anda frequentemente', 4], ['3 – Anda ocasionalmente', 3], ['2 – Restrito à cadeira', 2], ['1 – Acamado', 1]]),
    sel('m', 'Mobilidade', [['4 – Sem limitação', 4], ['3 – Levemente limitada', 3], ['2 – Muito limitada', 2], ['1 – Totalmente imóvel', 1]]),
    sel('n', 'Nutrição', [['4 – Excelente', 4], ['3 – Adequada', 3], ['2 – Provavelmente inadequada', 2], ['1 – Muito pobre', 1]]),
    sel('fr', 'Fricção e cisalhamento', [['3 – Sem problema aparente', 3], ['2 – Problema potencial', 2], ['1 – Problema', 1]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 23', ...interp(_t, [[19, 'Sem risco', 'ok'], [15, 'Risco leve', 'ok'], [13, 'Risco moderado', 'warn'], [10, 'Risco alto', 'bad'], [0, 'Risco muito alto', 'bad']]) }),
});

C({
  id: 'morse', cat: 'func', name: 'Escala de Morse', desc: 'Risco de quedas', score: true,
  fields: [chk('h', 'Histórico de quedas (últimos 3 meses)', 25), chk('d', 'Diagnóstico secundário', 15),
    sel('aux', 'Auxílio na deambulação', [['Nenhum / acamado / auxiliado por profissional', 0], ['Muletas, bengala ou andador', 15], ['Apoia-se nos móveis', 30]]),
    chk('iv', 'Terapia endovenosa / dispositivo heparinizado', 20),
    sel('mar', 'Marcha', [['Normal / sem deambulação / acamado', 0], ['Fraca', 10], ['Comprometida / cambaleante', 20]]),
    sel('men', 'Estado mental', [['Orientado / ciente da capacidade', 0], ['Superestima capacidade / esquece limitações', 15]])],
  calc: ({ _t }) => ({ value: _t, unit: 'pontos', ...interp(_t, [[45, 'Alto risco de quedas', 'bad'], [25, 'Risco moderado', 'warn'], [0, 'Baixo risco', 'ok']]) }),
});
