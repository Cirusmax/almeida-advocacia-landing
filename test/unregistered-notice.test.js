import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simular, mensagemWhatsApp, AVISO_SEM_REGISTRO } from '../src/calculator/model.js';
const hoje = new Date(2026, 10, 18);
const dados = extra => new URLSearchParams({ s: '3000', a: '2025-02-01', d: '2026-10-15', m: 'sem_justa_causa', av: 'sem_aviso', ferias: 'quitadas', ad: '0', dp: '0', f: '', pagamento: 'nao', ...extra });

test('dispensa sem aviso é o primeiro cenário sem registro, em linguagem comum', () => {
  assert.equal(AVISO_SEM_REGISTRO.sem_justa_causa[0][0], 'sem_aviso');
  assert.equal(AVISO_SEM_REGISTRO.sem_justa_causa[0][1], 'Não tive aviso');
  assert.match(AVISO_SEM_REGISTRO.sem_justa_causa[0][2], /sem aviso e sem pagamento/);
});
test('sem aviso não zera a indenização possivelmente devida nem a projeção', () => {
  const r = simular(dados(), 'registro', hoje);
  const equivalente = simular(dados({ av: 'indenizado' }), 'registro', hoje);
  assert.equal(r.ok, true);
  assert.equal(r.avisoRelatado, 'sem_aviso');
  assert.equal(r.resultado.total, equivalente.resultado.total);
  assert.equal(r.resultado.dataEfetiva.getTime(), equivalente.resultado.dataEfetiva.getTime());
  assert.equal(r.resultado.verbas.find(v => v.titulo === 'Aviso não recebido: indenização estimada').valor, 3300);
  assert.equal(r.fgtsPeriodo, equivalente.fgtsPeriodo);
});
test('resumo descreve falta de aviso e não afirma que o trabalhador já recebeu', () => {
  const texto = mensagemWhatsApp(simular(dados(), 'registro', hoje));
  assert.match(texto, /Fui dispensado na hora, sem aviso e sem pagamento/);
  assert.match(texto, /aviso não foi trabalhado nem pago/);
  assert.match(texto, /possivelmente devida/);
});
test('aviso trabalhado e recebimento pelo aviso continuam sendo cenários distintos', () => {
  const trabalhado = simular(dados({ av: 'trabalhado' }), 'registro', hoje);
  const recebido = simular(dados({ av: 'indenizado', pagamento: 'sim', recebido: '3300' }), 'registro', hoje);
  assert.equal(trabalhado.resultado.verbas.some(v => /Aviso/.test(v.titulo)), false);
  assert.equal(recebido.recebido, 3300);
  assert.equal(Math.round((recebido.resultado.total - recebido.diferenca) * 100), 330000);
});
test('sem aviso no acordo calcula a metade aplicável; pedido e justa causa não viram dispensa comum', () => {
  const acordo = simular(dados({ m: 'acordo' }), 'registro', hoje);
  assert.equal(acordo.resultado.verbas.find(v => v.titulo.startsWith('Aviso não recebido')).valor, 1650);
  assert.equal(simular(dados({ m: 'pedido_demissao' }), 'registro', hoje).ok, false);
  assert.equal(simular(dados({ m: 'justa_causa' }), 'registro', hoje).ok, false);
  assert.equal(simular(dados(), 'acerto', hoje).ok, false);
});
