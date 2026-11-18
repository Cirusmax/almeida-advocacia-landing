# Revisão dos cálculos — 18/11/2026

## Origem e escopo

Foi integrado o motor MIT de [AstralunaProject/calculadora-rescisao-clt](https://github.com/AstralunaProject/calculadora-rescisao-clt),
commit `2dfd76ebf8b971cd056bf804ce4968673e6c3b83`. A licença permanece em
`src/calculator/vendor/LICENSE` e em `/licencas/calculadora.txt` no site publicado.
A interface, comparação de pagamento e estimativa do FGTS histórico são adaptações
para a Almeida Advocacia. Não foi integrado o PJe-Calc.

Esta revisão é técnica e normativa por cenários; não equivale à homologação de
um cálculo judicial nem à análise de todos os fatos de cada contrato.

## Problemas encontrados e corrigidos

1. A integração bloqueava saídas fora de 2026. A limitação foi removida e há tabelas
   de INSS/IRRF para 2024, 2025 e 2026, respeitando mudanças mensais de IRRF. Para
   competências sem tabela cadastrada, não são usados impostos atuais: apresenta-se
   estimativa antes de impostos e não se compara ao líquido recebido. Contratos
   encerrados antes de 2018 exigem análise histórica fora deste módulo.
2. O motor incluía FGTS do aviso indenizado e seus reflexos projetados na base da
   multa. A base agora exclui essa projeção, conforme TST Tema 255/OJ 42 II. O depósito
   de 8% do aviso continua sendo calculado: depósito e base da multa são conceitos distintos.
3. O INSS original arredondava a soma final. A integração e o cálculo padrão passaram
   a truncar cada faixa em centavos, conforme MOS/eSocial, S-5001 item 2.13.
4. A pergunta por 0/1/2 períodos de férias não identificava a idade das pendências e
   limitava contratos longos. A pergunta agora usa situações comuns. Para quem nunca
   tirou nem recebeu, contam-se todos os períodos desde a admissão, os prazos concessivos
   e a projeção do aviso. A dobra só entra após expirar o prazo concessivo. O limite
   artificial de dois períodos foi removido. A estimativa presume 30 dias por ano.
5. Quando não se sabe quais férias foram pagas, ou resta parte pendente, os períodos
   antigos não são tratados como quitados: o resultado é parcial e não gera uma
   diferença final automática.
6. O 13º projetado em outro ano é separado por ano para apuração da contribuição,
   em vez de misturar as bases numa só. Sem tabela para alguma competência, não se
   apresenta um líquido com falsa precisão.
7. O texto do aviso trabalhado deixou de inferir um intervalo de trabalho sem que
   o visitante tenha informado suas datas. Eventuais parcelas mistas exigem conferência.

## Validação independente acrescentada

- Saída de 2025 calculada em 2026, sem aplicar isenção de 2026 ao valor histórico.
- Mudanças de IRRF em fevereiro/2024, maio/2025 e janeiro/2026.
- INSS por faixa: salário de R$ 3.000 resulta em R$ 258,81 em 2024, R$ 253,40 em
  2025 e R$ 248,58 em 2026, pela soma das parcelas truncadas.
- Admissão em 01/01/2022, saída em 15/10/2026, salário R$ 3.000, aviso indenizado:
  nunca tirou nem recebeu férias → três períodos em dobro, um simples e 11/12
  proporcionais, total de férias com terço R$ 31.666,67. Sem avaliação de prescrição.
- Limite do prazo concessivo: até o último dia não há dobra; a partir do dia seguinte há.
- Férias quitadas não são cobradas novamente; novo período completado pela projeção é incluído.
- Base da multa do FGTS separada do depósito de FGTS do aviso.
- Férias incertas e tabela tributária ausente não geram comparação enganosa com líquido.
- Separação do FGTS e do pagamento líquido da rescisão.

## Limitações materiais

O cálculo é nominal na data da saída. Não há atualização judicial, correção, juros,
avaliação de prescrição ou apuração de RRA. Retenções dependem também do efetivo
pagamento e de outros rendimentos: pagamento em outro mês/ano exige revisão.
Não se determina automaticamente a existência do vínculo, rescisão indireta ou
reversão de justa causa. Considera empregado CLT comum e contrato por prazo indeterminado.
Não calcula médias variáveis, adicionais, horas extras, convenções, afastamentos,
faltas que alterem férias, salários nem 13º antigos atrasados. O FGTS sem registro
presume salário constante e nenhum depósito anterior; não inclui correção.
Férias parcialmente gozadas, férias antecipadas/coletivas, pagamento sem gozo e
outras combinações precisam de documentos. Não são convertidas em certeza pelo formulário.

## Fontes verificadas

- [TST — Tema 255](https://www.tst.jus.br/documents/d/guest/irr255-pdf)
- [TST — livro de Súmulas/OJs, OJ 42 II](https://www.tst.jus.br/documents/d/guest/livrointernet-12-pdf)
- [eSocial — MOS S-1.3, S-5001 item 2.13](https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-08-2026-com-marcacoes.pdf)
- [eSocial — INSS 2024](https://www.gov.br/esocial/pt-br/noticias/liberado-o-envio-de-eventos-de-folha-para-o-esocial-apos-publicacao-de-portaria-que-reajusta-valores-previdenciarios-em-2024)
- [eSocial — INSS 2025](https://www.gov.br/esocial/pt-br/noticias/liberado-o-envio-de-eventos-de-folha-para-o-esocial-apos-publicacao-de-portaria-que-reajusta-valores-previdenciarios-em-2025/)
- [INSS — 2026](https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal/)
- [Receita — IRRF 2024](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/copy_of_2024)
- [Receita — IRRF 2025](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025)
- [Receita — IRRF 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026)
- CLT, arts. 130, 134, 137, 146, 147 e 487; Lei 12.506/2011.

Comando de testes: `node --test test/*.test.js`. Os testes adaptados do projeto
original foram corrigidos onde as expectativas conflitavam com o Tema 255 ou com
o truncamento do eSocial; `test/audit.test.js` documenta os cenários independentes.
