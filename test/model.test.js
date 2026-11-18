import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simular, mensagemWhatsApp } from '../src/calculator/model.js';

const hoje = new Date(2026, 10, 18);
const dados = extra => new URLSearchParams({ s: '3000', a: '2025-02-01', d: '2026-10-15', m: 'sem_justa_causa', av: 'indenizado', fv: '0', ad: '0', dp: '0', f: '5000', pagamento: 'sim', recebido: '8000', ...extra });
test('compara somente o líquido do acerto, sem somar FGTS à diferença', () => {
  const r = simular(dados(), 'acerto', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.resultado.total, 10547.64);
  assert.equal(r.diferenca, 2547.64);
  assert.ok(r.fgtsPeriodo > 5000);
});
test('FGTS desconhecido fica explicitamente incompleto, não cria depósitos anteriores', () => {
  const r = simular(dados({ f: '' }), 'acerto', hoje);
  assert.equal(r.fgtsIncompleto, true);
  assert.equal(r.fgtsAnterior, 0);
});
test('sem registro estima depósitos anteriores e 13º sem contar a rescisão duas vezes', () => {
  const r = simular(dados({ a: '2026-01-01', d: '2026-07-15', fv: '0', f: '999999' }), 'registro', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.fgtsAnterior, 1440); // Six complete salary months at 3,000 × 8%.
  const multa = r.resultado.fgts.find(v => v.titulo.startsWith('Multa'));
  assert.ok(multa.valor > 576);
});
test('sem registro inclui FGTS sobre 13º de anos anteriores', () => {
  const r = simular(dados({ a: '2025-01-01', d: '2026-01-15' }), 'registro', hoje);
  assert.equal(r.fgtsAnterior, 3120); // 12 salaries + full 13th, all at 8%.
});
test('pagamento desconhecido não é interpretado como zero', () => {
  const r = simular(dados({ pagamento: 'incerto', recebido: '' }), 'acerto', hoje);
  assert.equal(r.recebido, null);
  assert.equal(r.diferenca, null);
});
test('acerto ainda não pago compara com zero e recebido maior preserva diferença negativa', () => {
  const nenhum = simular(dados({ pagamento: 'nao', recebido: '' }), 'acerto', hoje);
  assert.equal(nenhum.diferenca, nenhum.resultado.total);
  assert.equal(simular(dados({ recebido: '20000' }), 'acerto', hoje).diferenca, -9452.36);
});
test('rejeita datas futuras, ano sem tabela, salário inválido e pagamento inválido', () => {
  for (const extra of [{ d: '2026-12-01' }, { d: '2025-10-15' }, { s: 'NaN' }, { recebido: 'Infinity' }, { recebido: '' }, { m: 'rescisao_indireta' }]) {
    assert.equal(simular(dados(extra), 'acerto', hoje).ok, false);
  }
});
test('resumo do WhatsApp identifica a simulação e separa FGTS', () => {
  const r = simular(dados(), 'registro', hoje);
  const mensagem = mensagemWhatsApp(r);
  assert.match(mensagem, /possível vínculo/);
  assert.match(mensagem, /separado do acerto/);
  assert.match(mensagem, /sujeitos à conferência/);
});
