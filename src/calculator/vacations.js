import { somarAnos, somarDias, avosDeServico, diasDeAviso, dataEfetiva, MODALIDADES } from './vendor/rescisao.js';
import { arredondar } from './vendor/tributos.js';

export function calcularFerias(entrada, resposta, pendencias = { completas: 0, dias: 0 }) {
  const efetiva = dataEfetiva(entrada, diasDeAviso(entrada));
  const periodos = [];
  let indice = 0;
  // Use the original admission anniversary, not the date of the last holiday.
  while (somarDias(somarAnos(entrada.admissao, indice + 1), -1) <= efetiva) {
    const fim = somarDias(somarAnos(entrada.admissao, indice + 1), -1);
    const limiteConcessao = somarDias(somarAnos(entrada.admissao, indice + 2), -1);
    periodos.push({ fim, limiteConcessao, novoPeloAviso: fim > entrada.desligamento });
    indice++;
  }
  const verbas = [];
  const pendentes = resposta === 'nunca' ? periodos : periodos.filter(p => p.novoPeloAviso);
  let simples = 0, dobro = 0;
  for (const periodo of pendentes) {
    if (efetiva > periodo.limiteConcessao) dobro++;
    else simples++;
  }
  if (simples) verbas.push({ titulo: 'Férias completas + 1/3', detalhe: `${simples} período(s) completo(s) ainda dentro do prazo de concessão`, valor: arredondar(entrada.salario * 4 / 3 * simples) });
  if (dobro) verbas.push({ titulo: 'Férias não concedidas no prazo, em dobro + 1/3', detalhe: `${dobro} período(s) com prazo de concessão encerrado`, valor: arredondar(entrada.salario * 8 / 3 * dobro) });
  if (resposta === 'parte') {
    const diasPendentes = pendencias.completas * 30 + pendencias.dias;
    if (diasPendentes > 0) verbas.push({
      titulo: 'Férias pendentes informadas + 1/3',
      detalhe: `${pendencias.completas} férias completas e ${pendencias.dias} dia(s) ainda não pagos; sem presumir dobra`,
      valor: arredondar(entrada.salario / 30 * diasPendentes * 4 / 3),
    });
  }
  const inicioAtual = somarAnos(entrada.admissao, indice);
  const avos = Math.min(12, avosDeServico(inicioAtual, efetiva));
  if (MODALIDADES[entrada.modalidade].proporcionais && avos > 0) {
    verbas.push({ titulo: 'Férias proporcionais + 1/3', detalhe: `${avos}/12 do período em curso`, valor: arredondar(entrada.salario / 12 * avos * 4 / 3) });
  }
  return {
    verbas,
    parcial: resposta === 'incerto',
    pendenciasInformadas: resposta === 'parte' ? pendencias : null,
    completos: periodos.length,
    simples, dobro, avos,
    descricao: {
      nunca: 'Nunca tirei férias nem recebi o pagamento correspondente.',
      quitadas: 'Tirei e recebi todas as férias completas já adquiridas antes da saída.',
      parte: `${pendencias.completas} férias completas e ${pendencias.dias} dia(s) de férias ainda não pagos. Incluídos com 1/3, sem presumir dobra por atraso na concessão.`,
      incerto: 'Não sei informar as férias. A estimativa não inclui os períodos antigos sem informação.',
    }[resposta],
  };
}
