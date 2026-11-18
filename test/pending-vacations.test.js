import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simular, mensagemWhatsApp } from '../src/calculator/model.js';

const hoje = new Date(2026, 10, 18);
const dados = extra => new URLSearchParams({ s: '3000', a: '2022-01-01', d: '2026-10-15', m: 'sem_justa_causa', av: 'indenizado', ferias: 'parte', ferias_completas: '1', ferias_dias: '0', ad: '0', dp: '0', f: '', pagamento: 'nao', ...extra });
test('uma férias pendente acrescenta salário + 1/3 ao acerto, sem repetir proporcionais', () => {
  const base = simular(dados({ ferias: 'quitadas' }), 'acerto', hoje);
  const r = simular(dados(), 'acerto', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.resultado.total - base.resultado.total, 4000);
  assert.equal(r.ferias.parcial, false);
  assert.equal(r.comparavel, true);
  assert.equal(r.diferenca, r.resultado.total);
  assert.equal(r.resultado.verbas.filter(v => v.titulo === 'Férias proporcionais + 1/3').length, 1);
});
test('duas férias pendentes entram por inteiro; 15 dias adicionais entram proporcionalmente', () => {
  const base = simular(dados({ ferias: 'quitadas' }), 'acerto', hoje);
  const duas = simular(dados({ ferias_completas: '2' }), 'registro', hoje);
  const comDias = simular(dados({ ferias_dias: '15' }), 'acerto', hoje);
  assert.equal(Math.round((duas.resultado.total - base.resultado.total) * 100), 800000);
  assert.equal(Math.round((comDias.resultado.total - base.resultado.total) * 100), 600000);
});
test('somente dias de férias pendentes também são incluídos', () => {
  const r = simular(dados({ ferias_completas: '0', ferias_dias: '15' }), 'acerto', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.ferias.verbas.find(v => v.titulo === 'Férias pendentes informadas + 1/3').valor, 2000);
});
test('não transforma quantidade esquecida em zero e rejeita quantidade incompatível', () => {
  for (const extra of [{ ferias_completas: '' }, { ferias_completas: '0' }, { ferias_completas: '99' }, { ferias_completas: '-1' }, { ferias_completas: '1.5' }, { ferias_dias: '30' }, { ferias_completas: '4', ferias_dias: '1' }]) {
    assert.equal(simular(dados(extra), 'acerto', hoje).ok, false);
  }
});
test('nova férias completada no aviso não permite adicionar de novo como antiga', () => {
  const r = simular(dados({ a: '2025-03-01', d: '2026-02-10', ferias_completas: '1' }), 'acerto', hoje);
  assert.equal(r.ok, false);
});
test('FGTS em branco usa estimativa de seis salários, sem repetir mês rescisório', () => {
  const r = simular(dados({ a: '2026-01-01', d: '2026-07-15', ferias: 'quitadas' }), 'acerto', hoje);
  assert.equal(r.fgtsEstimado, true);
  assert.equal(r.fgtsAnterior, 1440);
  const informado = simular(dados({ a: '2026-01-01', d: '2026-07-15', ferias: 'quitadas', f: '1440' }), 'acerto', hoje);
  assert.equal(r.fgtsPeriodo, informado.fgtsPeriodo);
  assert.equal(r.resultado.total, informado.resultado.total);
});
test('FGTS informado prevalece sobre a estimativa, inclusive zero e pedido de demissão', () => {
  for (const f of ['0', '1000']) {
    const r = simular(dados({ ferias: 'quitadas', m: 'pedido_demissao', av: 'dispensado', f }), 'acerto', hoje);
    assert.equal(r.fgtsEstimado, false);
    assert.equal(r.fgtsAnterior, Number(f));
    assert.equal(r.resultado.fgts.some(v => v.titulo.startsWith('Multa')), false);
  }
});
test('FGTS inválido não vira uma base válida mesmo em modalidade sem multa', () => {
  const r = simular(dados({ ferias: 'quitadas', m: 'pedido_demissao', av: 'dispensado', f: '-3' }), 'acerto', hoje);
  assert.equal(r.ok, false);
});
test('resumo leva férias declaradas e identifica FGTS estimado sem confirmar depósito', () => {
  const r = simular(dados({ ferias_completas: '2' }), 'acerto', hoje);
  const texto = mensagemWhatsApp(r);
  assert.match(texto, /2 férias completas/);
  assert.match(texto, /sem confirmação do saldo existente/);
  assert.match(texto, /separado do acerto/);
});
