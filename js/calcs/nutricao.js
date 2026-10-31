/* ===== Nutrição ===== */
const baseNutri = [num('peso', 'Peso', 'kg'), num('alt', 'Altura', 'cm'), num('idade', 'Idade', 'anos'), sexo()];
const mifflin = (v) => 10 * v.peso + 6.25 * v.alt - 5 * v.idade + (v.sexo === 'F' ? -161 : 5);
const hb = (v) => (v.sexo === 'F' ? 655.1 + 9.563 * v.peso + 1.85 * v.alt - 4.676 * v.idade : 66.47 + 13.75 * v.peso + 5.003 * v.alt - 6.755 * v.idade);

C({
  id: 'antropo', cat: ['nutri', 'farma'], name: 'Antropometria e peso de dosificação', desc: 'Peso ideal, %PI, IMC, superfície corporal, massa magra e peso ajustado',
  fields: [num('peso', 'Peso real', 'kg'), num('alt', 'Altura', 'cm'), sexo()],
  calc: ({ peso, alt, sexo, _ped }) => {
    if (!ok(peso, alt)) return null;
    if (_ped) {
      const im = peso / (alt / 100) ** 2;
      return { label: 'IMC', value: f(im, 1), unit: 'kg/m²', extra: [['Superfície corporal (Mosteller)', f(asc(peso, alt), 2) + ' m²']],
        interp: 'Em crianças, interpretar o IMC por percentil ou escore-z para idade e sexo (curvas OMS)', level: 'neutral' };
    }
    const pi = pesoIdeal(alt, sexo), imc = peso / (alt / 100) ** 2, mm = sexo === 'F' ? 0.252 * peso + 0.473 * alt - 48.3 : 0.407 * peso + 0.267 * alt - 19.2;
    const dub = 0.007184 * peso ** 0.425 * alt ** 0.725;
    return { label: 'IMC', value: f(imc, 1), unit: 'kg/m²',
      extra: [['Peso ideal (Devine)', f(pi, 1) + ' kg'], ['% do peso ideal', f(peso / pi * 100, 0) + '%'], ['Peso ajustado (PI + 0,4 × excesso)', f(pi + 0.4 * (peso - pi), 1) + ' kg'],
        ['Massa magra (Boer)', f(mm, 1) + ' kg'], ['Superfície corporal (Mosteller)', f(asc(peso, alt), 2) + ' m²'], ['Superfície corporal (DuBois)', f(dub, 2) + ' m²']],
      ...interp(imc, [[40, 'Obesidade grau III', 'bad'], [35, 'Obesidade grau II', 'bad'], [30, 'Obesidade grau I', 'warn'], [25, 'Sobrepeso', 'warn'], [18.5, 'Eutrofia', 'ok'], [0, 'Baixo peso', 'warn']]) };
  },
});

C({
  id: 'necessidades', cat: 'nutri', name: 'Suporte nutricional', desc: 'Metas calórica e proteica no paciente crítico (ASPEN/ESPEN)',
  fields: [num('peso', 'Peso', 'kg'), num('alt', 'Altura (para obesos)', 'cm'), sexo(), sel('fase', 'Fase', [['Aguda inicial (dias 1–3)', 'a'], ['Após dia 4 / recuperação', 'r']])],
  calc: (v) => {
    if (!ok(v.peso)) return null;
    let p = v.peso, nota = 'Peso real';
    const imc = ok(v.alt) ? v.peso / (v.alt / 100) ** 2 : null;
    if (imc && imc >= 30) {
      const pi = pesoIdeal(v.alt, v.sexo);
      return { label: 'Meta calórica (obeso)', value: imc < 50 ? f(11 * v.peso, 0) + '–' + f(14 * v.peso, 0) : f(22 * pi, 0) + '–' + f(25 * pi, 0), unit: 'kcal/dia',
        extra: [['IMC', f(imc, 1)], ['Proteína', imc < 40 ? f(2 * pi, 0) + ' g/dia (2 g/kg PI)' : f(2.5 * pi, 0) + ' g/dia (2,5 g/kg PI)']], interp: 'Dieta hipocalórica e hiperproteica no obeso crítico', level: 'ok' };
    }
    const k = v.fase === 'a' ? [15, 20] : [25, 30];
    return { label: 'Meta calórica', value: f(k[0] * p, 0) + '–' + f(k[1] * p, 0), unit: 'kcal/dia', extra: [['Proteína', f(1.2 * p, 0) + '–' + f(2 * p, 0) + ' g/dia (1,2–2 g/kg)'], ['Peso utilizado', nota]],
      interp: v.fase === 'a' ? 'Fase aguda: 70% da meta, progredir em 3–7 dias' : 'Meta plena', level: 'ok' };
  },
});

C({
  id: 'harris', cat: 'nutri', name: 'Harris-Benedict', desc: 'Gasto energético basal com fatores de atividade e estresse',
  fields: [...baseNutri, sel('fa', 'Fator de atividade', [['Acamado (1,2)', 1.2], ['Deambulando (1,3)', 1.3], ['Sem correção (1,0)', 1]]),
    sel('fe', 'Fator de estresse', [['Sem estresse (1,0)', 1], ['Cirurgia eletiva (1,1)', 1.1], ['Trauma / infecção (1,3)', 1.3], ['Sepse (1,4)', 1.4], ['Grande queimado (1,8)', 1.8]])],
  calc: (v) => {
    if (!ok(v.peso, v.alt, v.idade)) return null;
    const b = hb(v), t = b * v.fa * v.fe;
    return { label: 'Gasto energético total', value: f(t, 0), unit: 'kcal/dia', extra: [['Gasto basal (GEB)', f(b, 0) + ' kcal'], ['Por kg', f(t / v.peso, 1) + ' kcal/kg']] };
  },
});

C({
  id: 'mifflin', cat: 'nutri', name: 'Mifflin-St Jeor', desc: 'Gasto energético de repouso (paciente não crítico)',
  fields: baseNutri,
  calc: (v) => (ok(v.peso, v.alt, v.idade) ? { value: f(mifflin(v), 0), unit: 'kcal/dia', extra: [['Por kg', f(mifflin(v) / v.peso, 1) + ' kcal/kg']] } : null),
});

C({
  id: 'penn', cat: 'nutri', name: 'Penn State', desc: 'Gasto energético em pacientes ventilados (2003b / 2010)',
  fields: [...baseNutri, num('ve', 'Volume minuto', 'L/min'), num('tmax', 'Temperatura máxima (24 h)', '°C')],
  calc: (v) => {
    if (!ok(v.peso, v.alt, v.idade, v.ve, v.tmax)) return null;
    const m = mifflin(v), imc = v.peso / (v.alt / 100) ** 2;
    const a = m * 0.96 + v.tmax * 167 + v.ve * 31 - 6212, b = m * 0.71 + v.tmax * 85 + v.ve * 64 - 3085;
    const use2010 = v.idade >= 60 && imc >= 30;
    return { label: use2010 ? 'Penn State 2010 (idoso obeso)' : 'Penn State 2003b', value: f(use2010 ? b : a, 0), unit: 'kcal/dia', extra: [['PSU 2003b', f(a, 0) + ' kcal'], ['PSU 2010', f(b, 0) + ' kcal'], ['Mifflin', f(m, 0) + ' kcal']] };
  },
});

C({
  id: 'ireton', cat: 'nutri', name: 'Ireton-Jones (1992)', desc: 'Pacientes ventilados ou em respiração espontânea',
  fields: [num('peso', 'Peso', 'kg'), num('idade', 'Idade', 'anos'), sexo(), sel('vent', 'Ventilação', [['Ventilação mecânica', 'v'], ['Respiração espontânea', 'e']]),
    chk('trauma', 'Trauma'), chk('quem', 'Queimadura'), chk('obes', 'Obesidade (IMC > 30)')],
  calc: (v) => {
    if (!ok(v.peso, v.idade)) return null;
    const x = v.vent === 'v' ? 1784 - 11 * v.idade + 5 * v.peso + (v.sexo === 'M' ? 244 : 0) + (v.trauma ? 239 : 0) + (v.quem ? 804 : 0)
      : 629 - 11 * v.idade + 25 * v.peso - (v.obes ? 609 : 0);
    return { value: f(x, 0), unit: 'kcal/dia', extra: [['Por kg', f(x / v.peso, 1) + ' kcal/kg']] };
  },
});

C({
  id: 'faisy', cat: 'nutri', name: 'Faisy', desc: 'Pacientes clínicos ventilados',
  fields: [num('peso', 'Peso', 'kg'), num('alt', 'Altura', 'cm'), num('ve', 'Volume minuto', 'L/min'), num('t', 'Temperatura', '°C')],
  calc: (v) => (ok(v.peso, v.alt, v.ve, v.t) ? { value: f(8 * v.peso + 14 * v.alt + 32 * v.ve + 94 * v.t - 4834, 0), unit: 'kcal/dia' } : null),
});

C({
  id: 'swinamer', cat: 'nutri', name: 'Swinamer', desc: 'Pacientes ventilados',
  fields: [num('peso', 'Peso', 'kg'), num('alt', 'Altura', 'cm'), num('idade', 'Idade', 'anos'), num('t', 'Temperatura', '°C'), num('fr', 'Frequência respiratória', 'irpm'), num('vt', 'Volume corrente', 'L')],
  calc: (v) => (ok(v.peso, v.alt, v.idade, v.t, v.fr, v.vt) ? { value: f(945 * asc(v.peso, v.alt) - 6.4 * v.idade + 108 * v.t + 24.2 * v.fr + 817 * v.vt - 4349, 0), unit: 'kcal/dia' } : null),
});

C({
  id: 'roza', cat: 'nutri', name: 'Roza e Shizgal', desc: 'Harris-Benedict revisada (adultos com baixo peso)',
  fields: baseNutri,
  calc: (v) => {
    if (!ok(v.peso, v.alt, v.idade)) return null;
    const x = v.sexo === 'F' ? 447.593 + 9.247 * v.peso + 3.098 * v.alt - 4.33 * v.idade : 88.362 + 13.397 * v.peso + 4.799 * v.alt - 5.677 * v.idade;
    return { value: f(x, 0), unit: 'kcal/dia', extra: [['Por kg', f(x / v.peso, 1) + ' kcal/kg']] };
  },
});

C({
  id: 'nutric', cat: 'nutri', name: 'NUTRIC modificado', desc: 'Risco nutricional no paciente crítico (sem IL-6)', score: true,
  fields: [sel('i', 'Idade', [['< 50 anos', 0], ['50–74 anos', 1], ['≥ 75 anos', 2]]), sel('a', 'APACHE II', [['< 15', 0], ['15–19', 1], ['20–27', 2], ['≥ 28', 3]]),
    sel('s', 'SOFA', [['< 6', 0], ['6–9', 1], ['≥ 10', 2]]), sel('c', 'Comorbidades', [['0–1', 0], ['≥ 2', 1]]), sel('d', 'Dias de internação antes da UTI', [['0', 0], ['≥ 1', 1]])],
  calc: ({ _t }) => ({ value: _t, unit: '/ 9', ...(_t >= 5 ? { interp: 'Alto risco nutricional: maior benefício da terapia nutricional agressiva', level: 'bad' } : { interp: 'Baixo risco nutricional', level: 'ok' }) }),
});

C({
  id: 'realimentacao', cat: 'nutri', name: 'Síndrome de realimentação', desc: 'Critérios de risco (NICE) e oferta inicial',
  fields: [num('peso', 'Peso', 'kg'), head('Um ou mais destes'), chk('a1', 'IMC < 16 kg/m²'), chk('a2', 'Perda de peso > 15% em 3–6 meses'), chk('a3', 'Ingesta mínima > 10 dias'), chk('a4', 'K, P ou Mg baixos antes de alimentar'),
    head('Ou dois ou mais destes'), chk('b1', 'IMC < 18,5 kg/m²'), chk('b2', 'Perda de peso > 10% em 3–6 meses'), chk('b3', 'Ingesta mínima > 5 dias'), chk('b4', 'Alcoolismo ou drogas (insulina, quimioterapia, antiácidos, diuréticos)'),
    head('Risco extremo'), chk('x', 'IMC < 14 ou ingesta mínima > 15 dias')],
  calc: (v) => {
    const a = ['a1', 'a2', 'a3', 'a4'].some((k) => v[k]), b = ['b1', 'b2', 'b3', 'b4'].filter((k) => v[k]).length >= 2;
    if (v.x) return { value: 'Risco extremo', extra: ok(v.peso) ? [['Oferta inicial', f(5 * v.peso, 0) + ' kcal/dia (5 kcal/kg)']] : [], interp: 'Iniciar com 5 kcal/kg/dia, tiamina e reposição de K, P, Mg. Monitorar ECG.', level: 'bad' };
    if (a || b) return { value: 'Alto risco', extra: ok(v.peso) ? [['Oferta inicial', f(10 * v.peso, 0) + ' kcal/dia (10 kcal/kg)']] : [], interp: 'Iniciar com 10 kcal/kg/dia, progredir em 4–7 dias. Tiamina 200–300 mg/dia.', level: 'bad' };
    return { value: 'Sem alto risco', interp: 'Não preenche critérios NICE', level: 'ok' };
  },
});

C({
  id: 'propofol', cat: ['nutri', 'conv'], name: 'Calorias do propofol', desc: 'Aporte calórico do propofol 1% / 2%',
  fields: [num('vel', 'Velocidade de infusão', 'mL/h'), sel('c', 'Concentração', [['Propofol 1%', 1], ['Propofol 2%', 2]])],
  calc: ({ vel }) => {
    if (!ok(vel)) return null;
    const ml = vel * 24;
    return { label: 'Calorias em 24 h', value: f(ml * 1.1, 0), unit: 'kcal/dia', extra: [['Volume em 24 h', f(ml, 0) + ' mL'], ['Lipídios', f(ml * 0.1, 0) + ' g/dia']], interp: 'Emulsão lipídica a 10%: 1,1 kcal/mL', level: 'ok' };
  },
});
