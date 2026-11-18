import { calcularRescisao, lerEntrada, mesesCivisComQuinzeDias, saldoDeSalario, MODALIDADES, diasDeAviso, dataEfetiva } from './vendor/rescisao.js';
import { arredondar } from './vendor/tributos.js';
import { calcularFerias } from './vacations.js';
import { tributosPara } from './historical-taxes.js';

export const WHATSAPP = '5532999055427';
export const AVISO_SEM_REGISTRO = {
  sem_justa_causa: [
    ['sem_aviso', 'Não tive aviso', 'Fui dispensado na hora, sem aviso e sem pagamento'],
    ['trabalhado', 'Continuei trabalhando', 'Continuei trabalhando depois que fui avisado'],
    ['indenizado', 'Recebi pelo aviso', 'Recebi pelo aviso sem precisar trabalhar'],
  ],
  acordo: [
    ['sem_aviso', 'Não tive aviso', 'Saí na hora e não recebi pelo aviso'],
    ['trabalhado', 'Continuei trabalhando', 'Continuei trabalhando depois do acordo'],
    ['indenizado', 'Recebi pelo aviso', 'Recebi pelo aviso sem precisar trabalhar'],
  ],
  pedido_demissao: [
    ['nao_cumprido', 'Saí sem cumprir aviso'],
    ['trabalhado', 'Trabalhei o aviso', 'Continuei trabalhando durante o aviso'],
    ['dispensado', 'A empresa me liberou de cumprir o aviso'],
  ],
  justa_causa: [['nenhum', 'Saí sem aviso']],
};

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
  const avisoRelatado = dados.get('av');
  if (modo === 'registro' && avisoRelatado === 'sem_aviso' && ['sem_justa_causa', 'acordo'].includes(dados.get('m'))) {
    // Reported fact: no notice worked and no payment. The engine calculates the
    // indemnity potentially due; it must not treat the lack of notice as zero entitlement.
    dados.set('av', 'indenizado');
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
  const fgtsInformado = (dados.get('f') || '').trim();
  if (modo === 'acerto' && !desconheceFGTS && (!/^\d+([.,]\d{1,2})?$/.test(fgtsInformado) || Number(fgtsInformado.replace(',', '.')) > 10000000)) {
    erros.push('Informe um valor de FGTS válido, entre zero e R$ 10.000.000,00, ou deixe em branco para estimar.');
  }
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
  const pendencias = { completas: 0, dias: 0 };
  if (respostaFerias === 'parte') {
    const completas = (dados.get('ferias_completas') || '').trim();
    const dias = (dados.get('ferias_dias') || '0').trim();
    pendencias.completas = Number(completas);
    pendencias.dias = Number(dias);
    const feriasReferencia = calcularFerias(entrada, 'quitadas');
    const maxCompletas = feriasReferencia.completos - feriasReferencia.simples;
    if (!/^\d+$/.test(completas) || !Number.isSafeInteger(pendencias.completas) || pendencias.completas < 0 || pendencias.completas > maxCompletas) {
      erros.push(`Informe quantas férias completas ainda não foram pagas (de 0 a ${maxCompletas}, conforme o tempo trabalhado).`);
    }
    if (!/^\d+$/.test(dias) || !Number.isInteger(pendencias.dias) || pendencias.dias < 0 || pendencias.dias > 29) {
      erros.push('Informe de 0 a 29 dias adicionais de férias pendentes.');
    }
    if (pendencias.completas * 30 + pendencias.dias > maxCompletas * 30) {
      erros.push('As férias pendentes informadas ultrapassam o total de férias completas adquirido antes da saída. Confira a quantidade.');
    } else if (completas !== '' && pendencias.completas * 30 + pendencias.dias === 0) {
      erros.push('Informe as férias completas pendentes ou os dias que faltam. Se não souber a quantidade, selecione “Não sei informar”.');
    }
  }
  if (erros.length) return { ok: false, erros };
  const fgtsEstimado = modo === 'registro' || desconheceFGTS;
  const fgtsAnterior = fgtsEstimado ? estimarFGTSAnterior(entrada) : Number(fgtsInformado.replace(',', '.'));
  entrada.saldoFGTS = fgtsAnterior;
  const ferias = calcularFerias(entrada, respostaFerias, pendencias);
  const tributos = tributosPara(entrada, dataEfetiva(entrada, diasDeAviso(entrada)));
  const resultado = calcularRescisao(entrada, { ferias: ferias.verbas, tributos });
  if (modo === 'registro' && avisoRelatado === 'sem_aviso') {
    const aviso = resultado.verbas.find(v => v.titulo === 'Aviso prévio indenizado');
    if (aviso) aviso.titulo = 'Aviso não recebido: indenização estimada';
  }
  if (!tributos.completo) {
    resultado.observacoes = resultado.observacoes.filter(texto => !/IRRF|INSS/.test(texto));
    resultado.observacoes.push('Não há tabela de impostos cadastrada para todas as competências deste caso. O resultado é antes de impostos e não é comparado ao líquido recebido.');
  }
  const comparavel = tributos.completo && !ferias.parcial;
  return {
    ok: true, entrada, resultado, modo, pagamento, avisoRelatado,
    recebido: pagamento === 'incerto' ? null : recebido,
    diferenca: pagamento === 'incerto' || !comparavel ? null : arredondar(resultado.total - recebido),
    fgtsAnterior,
    fgtsPeriodo: arredondar(fgtsAnterior + resultado.totalFGTS),
    fgtsEstimado,
    ferias, tributosCompletos: tributos.completo, comparavel,
  };
}

export function mensagemWhatsApp(simulacao) {
  const { entrada, resultado, modo, recebido, diferenca, pagamento, fgtsPeriodo, fgtsEstimado, ferias, tributosCompletos, avisoRelatado } = simulacao;
  const moeda = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const data = d => d.toLocaleDateString('pt-BR');
  const relatoAviso = AVISO_SEM_REGISTRO[entrada.modalidade].find(([valor]) => valor === avisoRelatado);
  return [
    'Olá! Usei a calculadora do site Almeida Advocacia e gostaria de uma análise.',
    `Situação: ${modo === 'registro' ? 'trabalho sem carteira assinada (possível vínculo)' : 'conferência de acerto'}.`,
    `Período: ${data(entrada.admissao)} a ${data(entrada.desligamento)}.`,
    `Último salário bruto: ${moeda(entrada.salario)}.`,
    `Saída informada: ${MODALIDADES[entrada.modalidade].rotulo}.`,
    `Aviso relatado: ${modo === 'registro' ? relatoAviso?.[2] || relatoAviso?.[1] || entrada.tipoAviso : entrada.tipoAviso}.`,
    ...(avisoRelatado === 'sem_aviso' ? ['O aviso não foi trabalhado nem pago. A simulação inclui a indenização possivelmente devida.'] : []),
    `Férias: ${ferias.descricao}`,
    `${ferias.parcial ? 'Estimativa parcial' : 'Acerto estimado'} ${tributosCompletos ? 'após descontos estimados' : 'antes de impostos'}: ${moeda(resultado.total)}.`,
    pagamento === 'incerto' ? 'Não sei informar o valor líquido recebido.' : pagamento === 'nao' ? 'Ainda não recebi o acerto.' : `Acerto líquido recebido: ${moeda(recebido)}.`,
    diferenca === null ? '' : `Diferença estimada (pode ser negativa): ${moeda(diferenca)}.`,
    `FGTS ${fgtsEstimado ? 'estimado pelo tempo de trabalho e último salário; sem confirmação do saldo existente' : 'informado, com depósitos rescisórios e eventual multa'}: ${moeda(fgtsPeriodo)} (separado do acerto).`,
    'Os valores são uma simulação, sujeitos à conferência dos documentos e das premissas.',
    'Estimativa nominal na saída, sem atualização judicial. Pagamento em outro mês/ano exige revisão dos descontos.',
  ].filter(Boolean).join('\n');
}
