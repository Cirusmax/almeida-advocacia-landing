import { calcularRescisao, lerEntrada, mesesCivisComQuinzeDias, saldoDeSalario, MODALIDADES, diasDeAviso, dataEfetiva } from './vendor/rescisao.js';
import { arredondar } from './vendor/tributos.js';
import { calcularFerias } from './vacations.js';
import { tributosPara } from './historical-taxes.js';

export const WHATSAPP = '5532999055427';

// Constant salary, ordinary CLT employee (8%). No correction, interest or variable pay.
// Termination-month salary and termination 13th are already counted by the vendor.
export function estimarFGTSAnterior(entrada) {
  const { salario, admissao, desligamento } = entrada;
  let salarioBase = 0;
  for (let mes = new Date(admissao.getFullYear(), admissao.getMonth(), 1);
    mes < new Date(desligamento.getFullYear(), desligamento.getMonth(), 1);
    mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)) {
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    salarioBase += saldoDeSalario(salario, admissao > mes ? admissao : mes, fim).valor;
  }
  let decimosBase = 0;
  for (let ano = admissao.getFullYear(); ano < desligamento.getFullYear(); ano++) {
    const inicio = ano === admissao.getFullYear() ? admissao : new Date(ano, 0, 1);
    decimosBase += salario / 12 * mesesCivisComQuinzeDias(inicio, new Date(ano, 11, 31));
  }
  return arredondar((salarioBase + decimosBase) * 0.08);
}

export function simular(campos, modo = 'acerto', hoje = new Date()) {
  const dados = new URLSearchParams(campos);
  if (!['acerto', 'registro'].includes(modo)) return { ok: false, erros: ['Escolha o tipo de simulação.'] };
  // The visible form supports ordinary indefinite-term contracts only.
  if (!['sem_justa_causa', 'pedido_demissao', 'acordo', 'justa_causa'].includes(dados.get('m'))) {
    return { ok: false, erros: ['Escolha como terminou o trabalho.'] };
  }
  const desconheceFGTS = modo === 'acerto' && !(dados.get('f') || '').trim();
  if (modo === 'registro' || desconheceFGTS) dados.set('f', '0');
  dados.set('p', 'on');
  // Pending complete vacations are derived from the plain-language answer below.
  dados.set('fv', '0');
  const leitura = lerEntrada(dados);
  if (!leitura.ok) return leitura;
  const entrada = leitura.entrada;
  const erros = [];
  if (entrada.desligamento.getFullYear() < 2018) erros.push('Para uma saída anterior a 2018, é necessária análise das regras históricas do contrato. Fale com o escritório.');
  const respostaFerias = dados.get('ferias');
  if (!['nunca', 'quitadas', 'parte', 'incerto'].includes(respostaFerias)) erros.push('Informe se tirou e recebeu férias durante esse trabalho.');
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (entrada.desligamento > limite) erros.push('Informe uma data de saída que não esteja no futuro.');
  const pagamento = dados.get('pagamento');
  if (!['sim', 'nao', 'incerto'].includes(pagamento)) erros.push('Informe se recebeu o acerto.');
  const textoRecebido = (dados.get('recebido') || '').trim();
  const recebido = pagamento === 'nao' ? 0 : Number(textoRecebido.replace(',', '.'));
  if (pagamento === 'sim' && (!/^\d+([.,]\d{1,2})?$/.test(textoRecebido) || !Number.isFinite(recebido) || recebido < 0 || recebido > 10000000)) {
    erros.push('Informe o valor líquido recebido, entre zero e R$ 10.000.000,00.');
  }
  if (erros.length) return { ok: false, erros };
  const fgtsAnterior = modo === 'registro' ? estimarFGTSAnterior(entrada) : entrada.saldoFGTS;
  entrada.saldoFGTS = fgtsAnterior;
  const ferias = calcularFerias(entrada, respostaFerias);
  const tributos = tributosPara(entrada, dataEfetiva(entrada, diasDeAviso(entrada)));
  const resultado = calcularRescisao(entrada, { ferias: ferias.verbas, tributos });
  if (!tributos.completo) {
    resultado.observacoes = resultado.observacoes.filter(texto => !/IRRF|INSS/.test(texto));
    resultado.observacoes.push('Não há tabela de impostos cadastrada para todas as competências deste caso. O resultado é antes de impostos e não é comparado ao líquido recebido.');
  }
  const comparavel = tributos.completo && !ferias.parcial;
  return {
    ok: true, entrada, resultado, modo, pagamento,
    recebido: pagamento === 'incerto' ? null : recebido,
    diferenca: pagamento === 'incerto' || !comparavel ? null : arredondar(resultado.total - recebido),
    fgtsAnterior,
    fgtsPeriodo: arredondar(fgtsAnterior + resultado.totalFGTS),
    fgtsIncompleto: desconheceFGTS && MODALIDADES[entrada.modalidade].multaFGTS > 0,
    ferias, tributosCompletos: tributos.completo, comparavel,
  };
}

export function mensagemWhatsApp(simulacao) {
  const { entrada, resultado, modo, recebido, diferenca, pagamento, fgtsPeriodo, fgtsIncompleto, ferias, tributosCompletos } = simulacao;
  const moeda = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const data = d => d.toLocaleDateString('pt-BR');
  return [
    'Olá! Usei a calculadora do site Almeida Advocacia e gostaria de uma análise.',
    `Situação: ${modo === 'registro' ? 'trabalho sem carteira assinada (possível vínculo)' : 'conferência de acerto'}.`,
    `Período: ${data(entrada.admissao)} a ${data(entrada.desligamento)}.`,
    `Último salário bruto: ${moeda(entrada.salario)}.`,
    `Saída informada: ${MODALIDADES[entrada.modalidade].rotulo}.`,
    `Aviso: ${entrada.tipoAviso}. Férias: ${ferias.descricao}`,
    `${ferias.parcial ? 'Estimativa parcial' : 'Acerto estimado'} ${tributosCompletos ? 'após descontos estimados' : 'antes de impostos'}: ${moeda(resultado.total)}.`,
    pagamento === 'incerto' ? 'Não sei informar o valor líquido recebido.' : pagamento === 'nao' ? 'Ainda não recebi o acerto.' : `Acerto líquido recebido: ${moeda(recebido)}.`,
    diferenca === null ? '' : `Diferença estimada (pode ser negativa): ${moeda(diferenca)}.`,
    `FGTS ${modo === 'registro' ? 'estimado do período, com depósitos rescisórios e eventual multa' : fgtsIncompleto ? 'parcial: base anterior desconhecida, multa e total incompletos' : 'informado, com depósitos rescisórios e eventual multa'}: ${moeda(fgtsPeriodo)} (separado do acerto).`,
    'Os valores são uma simulação, sujeitos à conferência dos documentos e das premissas.',
    'Estimativa nominal na saída, sem atualização judicial. Pagamento em outro mês/ano exige revisão dos descontos.',
  ].filter(Boolean).join('\n');
}
