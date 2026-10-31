/* Registro de calculadoras e utilitários compartilhados */
window.CATS = [
  { id: 'cardio', name: 'Cardiovascular', icon: '❤️' },
  { id: 'digest', name: 'Digestivo', icon: '🫃' },
  { id: 'resp', name: 'Respiratório', icon: '🫁' },
  { id: 'renal', name: 'Renal', icon: '🫘' },
  { id: 'nutri', name: 'Nutrição', icon: '🥗' },
  { id: 'farma', name: 'Fármacos', icon: '💊' },
  { id: 'eletro', name: 'Eletrólitos', icon: '⚡' },
  { id: 'acido', name: 'Ácido-base', icon: '🧪' },
  { id: 'insul', name: 'Insulinoterapia', icon: '💉' },
  { id: 'conv', name: 'Conversores', icon: '🔁' },
  { id: 'indic', name: 'Prognóstico e UTI', icon: '📊' },
  { id: 'neuro', name: 'Neurológico', icon: '🧠' },
  { id: 'func', name: 'Funcional e Dependência', icon: '🧍' },
  { id: 'ped', name: 'Pediatria', icon: '🧸' },
];
window.CALCS = [];

/* Registra uma calculadora */
function C(def) { CALCS.push(def); }

/* Construtores de campos */
const num = (id, label, unit = '', o = {}) => ({ t: 'num', id, label, unit, ...o });
const sel = (id, label, opts, o = {}) => ({ t: 'sel', id, label, opts, ...o });
const chk = (id, label, pts = 1, o = {}) => ({ t: 'chk', id, label, pts, ...o });
const head = (label) => ({ t: 'head', label });
const sexo = (id = 'sexo', o = {}) => sel(id, 'Sexo', [['Masculino', 'M'], ['Feminino', 'F']], o);
/* Opções 0..n numeradas: pts(['texto0','texto1',...]) */
const pts = (arr, start = 0) => arr.map((t, i) => [t, i + start]);

/* Verdadeiro se todos os valores numéricos existem */
const ok = (...xs) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));

/* Pontuação por faixas: lista [[mínimo, pontos], ...] em ordem decrescente */
function band(x, table) {
  for (const [min, p] of table) if (x >= min) return p;
  return table[table.length - 1][1];
}

/* Formatação numérica pt-BR */
function f(x, d = 1) {
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

/* Seleciona interpretação a partir de faixas: [[min, texto, nivel], ...] decrescente */
function interp(x, table) {
  for (const [min, txt, lvl] of table) if (x >= min) return { interp: txt, level: lvl };
  const last = table[table.length - 1];
  return { interp: last[1], level: last[2] };
}

/* Peso predito (ARDSNet / Devine) */
const pesoIdeal = (alt, sx) => (sx === 'F' ? 45.5 : 50) + 0.91 * (alt - 152.4);
const asc = (peso, alt) => Math.sqrt((peso * alt) / 3600);
