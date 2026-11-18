import { arredondar } from './vendor/tributos.js';

// Sources and effective dates are recorded in CALCULATION_AUDIT.md.
export const INSS = {
  2024: [1412, 2666.68, 4000.03, 7786.02],
  2025: [1518, 2793.88, 4190.83, 8157.41],
  2026: [1621, 2902.84, 4354.27, 8475.55],
};

export function calcularINSSHistorico(base, data) {
  const faixas = INSS[data.getFullYear()];
  if (!faixas) return null;
  let total = 0, inicio = 0;
  faixas.forEach((fim, i) => {
    const parcela = Math.max(0, Math.min(base, fim) - inicio) * [0.075, 0.09, 0.12, 0.14][i];
    // eSocial MOS S-5001 item 2.13: truncate each bracket to cents, do not round.
    total += Math.floor(Number((parcela * 100).toFixed(6))) / 100;
    inicio = fim;
  });
  return arredondar(total);
}

export function calcularIRRFHistorico({ rendimento, inss, dependentes = 0 }, data) {
  const ano = data.getFullYear(), mes = data.getMonth() + 1;
  if (!INSS[ano]) return null;
  const recente = ano >= 2026 || (ano === 2025 && mes >= 5);
  const janeiro2024 = ano === 2024 && mes === 1;
  const limites = [recente ? 2428.8 : janeiro2024 ? 2112 : 2259.2, 2826.65, 3751.05, 4664.68, Infinity];
  const deducoes = recente ? [0, 182.16, 394.16, 675.49, 908.73]
    : janeiro2024 ? [0, 158.4, 370.4, 651.73, 884.96] : [0, 169.44, 381.44, 662.77, 896];
  const simplificado = recente ? 607.2 : janeiro2024 ? 528 : 564.8;
  const base = arredondar(Math.max(0, rendimento - Math.max(inss + 189.59 * dependentes, simplificado)));
  const faixa = limites.findIndex(limite => base <= limite);
  const imposto = Math.max(0, arredondar(base * [0, 0.075, 0.15, 0.225, 0.275][faixa] - deducoes[faixa]));
  let reducao = 0;
  if (ano >= 2026) {
    reducao = rendimento <= 5000 ? 312.89 : rendimento <= 7350 ? arredondar(Math.max(0, 978.62 - 0.133145 * rendimento)) : 0;
  }
  reducao = Math.min(imposto, reducao);
  return { base, imposto, reducao, valor: arredondar(imposto - reducao) };
}

export function tributosPara(entrada, efetiva) {
  const anos = new Set([entrada.desligamento.getFullYear()]);
  // A projected 13th spanning a new year must not be taxed as one annual base.
  if (efetiva.getFullYear() !== entrada.desligamento.getFullYear()) anos.add(efetiva.getFullYear());
  const completo = [...anos].every(ano => INSS[ano]);
  return {
    completo,
    ano: entrada.desligamento.getFullYear(),
    calcularINSS: (base, data = entrada.desligamento) => completo ? calcularINSSHistorico(base, data) : 0,
    calcularIRRF: (dados, data = entrada.desligamento) => completo ? calcularIRRFHistorico(dados, data) : { base: dados.rendimento, imposto: 0, reducao: 0, valor: 0 },
  };
}
