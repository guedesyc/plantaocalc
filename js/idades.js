/* Faixa etária validada de cada calculadora.
   adulto = só adultos (aviso no modo pediátrico) · ambos = tem ajuste pediátrico no modo pediátrico
   todas = fórmula independente da idade · ped = escala pediátrica (definido no próprio arquivo) */
(() => {
  const ADULTO = {
    // Cardiovascular
    cha2ds2vasc: '', chads2: '', hasbled: '', 'timi-sest': '', 'timi-cest': '', grace: '', crusade: '', euroscore2: '', sgarbossa: '',
    'wells-tep': '', genebra: '', spesi: '', 'wells-tvp': '',
    // Digestivo
    meld: 'Em menores de 12 anos usa-se o PELD.', maddrey: '', lille: '', ranson: '', bisap: '', balthazar: '', fib4: '', forns: '', nfs: '', clifcad: '',
    // Respiratório
    hacor: '', curb65: '', idsa: '', psi: '', cpis: '', lis: '', apps: '', 'resp-ecmo': '', ecmonet: '',
    'mp-vcv': 'Não há limite de poder mecânico validado em crianças.', 'mp-pcv': 'Não há limite de poder mecânico validado em crianças.', ri: '',
    gold: '', cat: '', mmrc: '', 'gold-grupos': '', bode: '',
    // Renal
    cockcroft: '', ckdepi: 'Validada a partir de 18 anos.', mehran: '', 'crrt-dose': 'Em crianças a dose costuma ser prescrita por superfície corporal (~2.000 mL/1,73 m²/h).',
    vpc: 'A volemia da criança é maior por kg (70–80 mL/kg).', bn: '', ica: '',
    // Nutrição
    harris: '', mifflin: '', penn: '', ireton: '', faisy: '', swinamer: '', roza: '', nutric: '', realimentacao: 'Critérios NICE para adultos.', necessidades: 'Metas ASPEN/ESPEN para adultos.',
    // Fármacos e insulina
    tih: '', scorten: '', ccp: '', 'insulina-iv-ajuste': 'Protocolo de adulto.', 'insulina-sc': 'Doses de adulto.', 'insulina-sc-ajuste': 'Protocolo de adulto.',
    // Prognóstico, neuro e funcional
    apache2: 'Em crianças usam-se PRISM ou PIM.', sofa: '', qsofa: '', charlson: '', karnofsky: 'Em menores de 16 anos usa-se a escala de Lansky.',
    nihss: 'Em crianças existe a PedNIHSS.', rankin: '', ich: '', mmse: '', rass: 'Em crianças usam-se SBS ou COMFORT-B.', 'cam-icu': 'Em crianças usam-se pCAM-ICU ou psCAM-ICU.',
    barthel: 'Em crianças usa-se a WeeFIM.', lawton: '', mrc: 'Pouco validado em crianças pequenas.', braden: '', morse: '',
  };
  const ALT = {
    sofa: 'psofa', qsofa: 'psofa', cockcroft: 'schwartz', ckdepi: 'schwartz', braden: 'bradenq', morse: 'humpty',
    harris: 'schofield', mifflin: 'schofield', penn: 'schofield', ireton: 'schofield', faisy: 'schofield', swinamer: 'schofield', roza: 'schofield', necessidades: 'schofield',
    lis: 'pards', apps: 'pards',
  };
  /* Calculadoras com ajuste pediátrico dentro da própria calculadora */
  const AMBOS = {
    pam: 'limite de PAM ajustado à idade (PELOD-2).', qtc: 'QTc prolongado acima de 460 ms.', pafi: 'classificação PALICC-2 (VNI) em vez de Berlim.',
    spfi: 'classificação PALICC-2 (VNI) em vez de Berlim.', oi: 'cortes PALICC-2 (OI ≥ 4 PARDS; ≥ 16 grave).', rox: 'sem ponto de corte pediátrico validado; inclui ROX-HR.',
    tobin: 'Tobin indexado pelo peso (irpm/mL/kg).', pbw: 'volume corrente pelo peso (PALICC-2).', mecanica: 'limite de platô de 28 cmH₂O (PALICC-2).',
    glasgow: 'respostas verbal e motora para lactentes (< 2 anos).', 'insulina-iv': 'cetoacidose: 0,05–0,1 UI/kg/h sem bolus (ISPAD).',
    parkland: 'soma a manutenção de Holliday-Segar.', antropo: 'IMC interpretado por percentil; sem peso ideal de Devine.',
  };
  const PED_ALT = { pafi: 'pards', spfi: 'pards', oi: 'pards' };
  for (const c of CALCS) {
    if (c.ages) continue;
    if (c.id in ADULTO) { c.ages = 'adulto'; if (ADULTO[c.id]) c.pedNote = ADULTO[c.id]; }
    else if (c.id in AMBOS) { c.ages = 'ambos'; c.pedNote = AMBOS[c.id]; }
    else c.ages = 'todas';
    c.pedAlt = c.pedAlt || ALT[c.id] || PED_ALT[c.id];
  }
})();
