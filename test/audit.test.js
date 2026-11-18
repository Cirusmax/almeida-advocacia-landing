import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularINSSHistorico, calcularIRRFHistorico } from '../src/calculator/historical-taxes.js';
import { simular } from '../src/calculator/model.js';
const hoje = new Date(2026, 10, 18);
const entrada = extra => new URLSearchParams({ s: '3000', a: '2022-01-01', d: '2026-10-15', m: 'sem_justa_causa', av: 'indenizado', ferias: 'nunca', ad: '0', dp: '0', f: '0', pagamento: 'nao', ...extra });

test('INSS segue truncamento por faixa do eSocial, em 2024, 2025 e 2026', () => {
  // Independent hand calculations: truncate each bracket before summing.
  assert.equal(calcularINSSHistorico(3000, new Date(2024, 5, 1)), 105.90 + 112.92 + 39.99);
  assert.equal(calcularINSSHistorico(3000, new Date(2025, 5, 1)), 253.40);
  assert.equal(calcularINSSHistorico(3000, new Date(2026, 5, 1)), 248.58);
});
test('IRRF respeita as mudanças de fevereiro/2024 e maio/2025', () => {
  assert.equal(calcularIRRFHistorico({ rendimento: 3000, inss: 0 }, new Date(2024, 0, 1)).valor, 27);
  assert.equal(calcularIRRFHistorico({ rendimento: 3000, inss: 0 }, new Date(2024, 1, 1)).valor, 13.20);
  assert.equal(calcularIRRFHistorico({ rendimento: 5000, inss: 0 }, new Date(2025, 3, 1)).valor, 335.15);
  assert.equal(calcularIRRFHistorico({ rendimento: 5000, inss: 0 }, new Date(2025, 4, 1)).valor, 312.89);
  assert.equal(calcularIRRFHistorico({ rendimento: 5000, inss: 0 }, new Date(2026, 4, 1)).valor, 0);
});
test('saída em 2025 é aceita em 2026 e não recebe a isenção de 2026', () => {
  const r = simular(entrada({ s: '5000', a: '2024-01-01', d: '2025-06-30', av: 'trabalhado', ferias: 'quitadas' }), 'acerto', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.tributosCompletos, true);
  assert.ok(r.resultado.descontos.some(v => v.titulo === 'IRRF sobre o saldo de salário' && v.valor > 0));
});
test('nunca tirou férias: sem limite artificial de dois períodos e com dobra pelas datas', () => {
  const r = simular(entrada(), 'registro', hoje);
  assert.equal(r.ferias.completos, 4);
  assert.equal(r.ferias.dobro, 3);
  assert.equal(r.ferias.simples, 1);
  assert.equal(r.ferias.avos, 11);
  assert.equal(r.resultado.verbas.filter(v => v.titulo.startsWith('Férias')).reduce((s, v) => s + v.valor, 0), 31666.67);
});
test('dobra nasce depois do término do prazo concessivo, não só após completar 12 meses', () => {
  const comum = { m: 'pedido_demissao', av: 'dispensado', a: '2022-01-01' };
  const ultimoDia = simular(entrada({ ...comum, d: '2023-12-31' }), 'registro', hoje);
  const diaDepois = simular(entrada({ ...comum, d: '2024-01-01' }), 'registro', hoje);
  assert.equal(ultimoDia.ferias.dobro, 0);
  assert.equal(diaDepois.ferias.dobro, 1);
});
test('férias quitadas não são cobradas novamente; proporcionais continuam presentes', () => {
  const r = simular(entrada({ ferias: 'quitadas' }), 'acerto', hoje);
  assert.equal(r.ferias.simples, 0);
  assert.equal(r.ferias.dobro, 0);
  assert.equal(r.resultado.verbas.filter(v => v.titulo.startsWith('Férias')).length, 1);
  assert.equal(r.ferias.verbas[0].valor, 3666.67);
});
test('férias desconhecidas não geram diferença final enganosa', () => {
  for (const resposta of ['incerto']) {
    const r = simular(entrada({ ferias: resposta }), 'acerto', hoje);
    assert.equal(r.ferias.parcial, true);
    assert.equal(r.comparavel, false);
    assert.equal(r.diferenca, null);
  }
});
test('férias novas completadas na projeção entram mesmo se as anteriores foram quitadas', () => {
  const r = simular(entrada({ a: '2025-03-01', d: '2026-02-10', ferias: 'quitadas' }), 'acerto', hoje);
  assert.equal(r.ferias.simples, 1);
  assert.equal(r.ferias.verbas[0].valor, 4000);
});
test('multa do FGTS exclui aviso indenizado e projeção do 13º (TST Tema 255)', () => {
  const r = simular(entrada({ a: '2022-05-10', d: '2025-08-20', f: '10000', ferias: 'quitadas' }), 'acerto', hoje);
  assert.equal(r.resultado.fgts.find(v => v.titulo.startsWith('Multa')).valor, 4128);
  assert.equal(r.resultado.fgts.find(v => v.titulo.startsWith('FGTS sobre')).valor, 652);
});
test('competência sem tabela não recebe impostos atuais nem comparação com valor líquido', () => {
  const r = simular(entrada({ d: '2023-10-15' }), 'acerto', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.tributosCompletos, false);
  assert.equal(r.resultado.impostos, 0);
  assert.equal(r.diferenca, null);
});
test('13º projetado em outro ano tem INSS separado por ano', () => {
  const r = simular(entrada({ a: '2024-01-01', d: '2025-12-15', ferias: 'quitadas' }), 'acerto', hoje);
  assert.equal(r.ok, true);
  // 12/12 of 3,000 in 2025 (253.40) + 1/12 in 2026 (18.75).
  assert.equal(r.resultado.descontos.find(v => v.titulo === 'INSS sobre o 13º').valor, 272.15);
});
test('projeção em maio/2025 não troca a tabela de IRRF de um acerto nominal de abril', () => {
  const r = simular(entrada({ s: '12000', a: '2024-01-01', d: '2025-04-20', ferias: 'quitadas' }), 'acerto', hoje);
  // 5/12 of 12,000 = 5,000. April simplified deduction 564.80: IRRF 335.15.
  assert.equal(r.resultado.descontos.find(v => v.titulo === 'IRRF sobre o 13º').valor, 335.15);
});
