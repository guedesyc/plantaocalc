/* ===== Conversores ===== */
C({
  id: 'temp', cat: 'conv', name: 'Temperatura', desc: 'Celsius, Fahrenheit e Kelvin',
  fields: [num('x', 'Valor', ''), sel('u', 'Unidade de origem', [['°C', 'c'], ['°F', 'f'], ['K', 'k']])],
  calc: ({ x, u }) => {
    if (!ok(x)) return null;
    const c = u === 'c' ? x : u === 'f' ? (x - 32) * 5 / 9 : x - 273.15;
    return { label: 'Celsius', value: f(c, 1), unit: '°C', extra: [['Fahrenheit', f(c * 9 / 5 + 32, 1) + ' °F'], ['Kelvin', f(c + 273.15, 2) + ' K']] };
  },
});

const pressoes = [['mmHg', 1], ['cmH₂O', 1.35951], ['kPa', 0.133322], ['bar', 0.00133322], ['mbar', 1.33322], ['psi', 0.0193368], ['atm', 0.00131579]];
C({
  id: 'pressao', cat: 'conv', name: 'Pressão', desc: 'mmHg, cmH₂O, kPa, bar, psi, atm',
  fields: [num('x', 'Valor', ''), sel('u', 'Unidade de origem', pressoes.map(([n], i) => [n, i]))],
  calc: ({ x, u }) => {
    if (!ok(x)) return null;
    const mm = x / pressoes[u][1];
    return { label: 'mmHg', value: f(mm, 2), extra: pressoes.slice(1).map(([n, k]) => [n, f(mm * k, 4)]) };
  },
});

C({
  id: 'metrico', cat: 'conv', name: 'Métrico ↔ imperial', desc: 'Peso, altura e volume',
  fields: [num('x', 'Valor', ''), sel('u', 'Converter', [['kg → lb', 'kglb'], ['lb → kg', 'lbkg'], ['cm → pol', 'cmin'], ['pol → cm', 'incm'], ['cm → pés/pol', 'cmft'], ['pés → cm', 'ftcm'], ['mL → fl oz', 'mloz'], ['fl oz → mL', 'ozml']])],
  calc: ({ x, u }) => {
    if (!ok(x)) return null;
    const m = { kglb: [x * 2.20462, 'lb'], lbkg: [x / 2.20462, 'kg'], cmin: [x / 2.54, 'pol'], incm: [x * 2.54, 'cm'], ftcm: [x * 30.48, 'cm'], mloz: [x / 29.5735, 'fl oz'], ozml: [x * 29.5735, 'mL'] };
    if (u === 'cmft') { const t = x / 2.54; return { value: `${Math.floor(t / 12)}′ ${f(t % 12, 1)}″`, unit: '' }; }
    return { value: f(m[u][0], 2), unit: m[u][1] };
  },
});

/* [nome, fator mg/dL → unidade SI, unidade SI] */
const analitos = [['Glicose', 0.05551, 'mmol/L'], ['Creatinina', 88.42, 'µmol/L'], ['Ureia', 0.1665, 'mmol/L'], ['BUN', 0.357, 'mmol/L'], ['Ácido úrico', 59.48, 'µmol/L'],
  ['Lactato', 0.111, 'mmol/L'], ['Fósforo', 0.3229, 'mmol/L'], ['Cálcio', 0.2495, 'mmol/L'], ['Magnésio', 0.4114, 'mmol/L'], ['Colesterol', 0.02586, 'mmol/L'], ['Triglicerídeos', 0.01129, 'mmol/L'],
  ['Bilirrubina', 17.1, 'µmol/L'], ['Amônia (µg/dL)', 0.5872, 'µmol/L']];
C({
  id: 'mgdl-mmol', cat: 'conv', name: 'mg/dL ↔ mmol/L', desc: 'Glicose, creatinina, ureia, lactato, fósforo, lipídios…',
  fields: [sel('a', 'Analito', analitos.map(([n], i) => [n, i])), num('x', 'Valor', ''), sel('d', 'Direção', [['mg/dL → SI', 'm'], ['SI → mg/dL', 's']])],
  calc: ({ a, x, d }) => {
    if (!ok(x)) return null;
    const [, k, u] = analitos[a];
    return d === 'm' ? { label: u, value: f(x * k, k > 10 ? 0 : 2), unit: u } : { label: 'mg/dL', value: f(x / k, 2), unit: 'mg/dL' };
  },
});
