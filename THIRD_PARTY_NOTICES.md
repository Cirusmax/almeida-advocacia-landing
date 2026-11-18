# Calculadora trabalhista

O motor em `src/calculator/vendor/rescisao.js` e `tributos.js`, e os testes
`test/rescisao.test.js` e `tributos.test.js`, vêm de
[AstralunaProject/calculadora-rescisao-clt](https://github.com/AstralunaProject/calculadora-rescisao-clt),
commit `2dfd76ebf8b971cd056bf804ce4968673e6c3b83`, sob licença MIT.
O texto completo da licença está em `src/calculator/vendor/LICENSE` e é
distribuído com o site em `/licencas/calculadora.txt`.

Interface e integração adaptadas à identidade visual existente da Almeida Advocacia.
Os valores são estimativas; as modalidades visíveis são contratos comuns sem prazo
determinado. As tabelas tributárias disponíveis nesta versão são as de 2026.

O modo sem registro estima FGTS anterior usando salário constante e ausência de
depósitos. Não determina vínculo e não soma novamente salários já recebidos. Não
calcula salários ou 13º de anos anteriores ainda não pagos, juros e correção,
prescrição, adicionais, médias ou convenções coletivas. Férias pendentes têm limite
de dois períodos; outros casos dependem de análise.

## Verificação das tabelas (18/11/2026)

- [INSS: tabela de contribuição mensal 2026](https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal/)
- [Receita Federal: tributação 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026)
- [Receita Federal: exemplos da redução do IR](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025)
- [CLT](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm)

## Publicação existente

O domínio `almeidaescritorio.com` usa DNS administrado no Wix e aponta para o GitHub
Pages. O conteúdo compilado de `gh-pages` é a publicação; `main` mantém o fonte.
Preservar `public/CNAME` e a configuração do domínio.

Validação: `node --test test/*.test.js` e `node node_modules/vite/bin/vite.js build`.
