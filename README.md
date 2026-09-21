# HortaLab Escola

Produto educacional estático para apoiar professores e gestores no planejamento pedagógico, agroecológico e organizacional de hortas escolares. O projeto funciona sem backend, cadastro, banco de dados, analytics ou dependências de execução externas.

## Funcionalidades

- jornada guiada em nove etapas;
- diagnóstico sem dados pessoais;
- cenários comparativos de 12, 25 e 50 m²;
- simulador de composição com mapa, lista, arrastar e soltar e comandos equivalentes por botão/teclado;
- total de área validado em tempo real;
- planejamento curricular e atividades selecionáveis;
- oito eventos com decisões, consequências e impactos determinísticos;
- painel ambiental, social, de governança e pedagógico com evidências, riscos, melhorias e confirmações locais;
- relatório final imprimível;
- exportação e importação JSON validadas;
- salvamento em `localStorage` com tratamento de erro;
- cartilha digital completa e imprimível;
- manifest e service worker para cache local quando servido por HTTP(S); o site continua funcional sem o service worker.

## Executar localmente

É necessário Node.js 20 ou superior apenas para o servidor local e os testes. A aplicação em si usa HTML, CSS e JavaScript nativos.

```powershell
cd "C:\Users\gesma\OneDrive\Desktop\Mestrado Luciano\Cartilha\HortaLab-Escola"
npm.cmd start
```

Abra `http://127.0.0.1:4173`. Também é possível copiar a pasta para qualquer servidor estático. O servidor incluído não instala dependências.

## Testes

```powershell
npm.cmd test
npm.cmd run test:e2e
```

Os testes verificam:

- soma exata dos três cenários;
- parcelas de 19,8 + 17,2 + 4,0 + 3,0 + 6,0 = 50,0 m²;
- determinismo e limites dos indicadores;
- impacto previsível dos eventos;
- rejeição de JSON com área impossível;
- presença das nove etapas e controles essenciais;
- cobertura temática da cartilha;
- ausência de scripts, fontes e imagens remotas.

O teste de interface usa `playwright-core` como dependência de desenvolvimento e o Chrome ou Edge já instalado, sem baixar outro navegador. Com o servidor local em execução, ele percorre a jornada, testa persistência, JSON, impressão e quatro larguras, verifica o console e grava as capturas em `screenshots/`.

## Estrutura

- `index.html`: jornada e planejador;
- `cartilha.html`: cartilha digital;
- `js/data.js`: cenários, componentes, atividades e eventos;
- `js/state.js`: estado da aplicação;
- `js/rules.js`: regras determinísticas e explicáveis;
- `js/simulator.js`: composição visual e reorganização;
- `js/storage.js`: persistência e validação de importação;
- `js/charts.js`: indicadores acessíveis;
- `js/export.js`: importação e exportação JSON;
- `css/print.css`: impressão do plano e da cartilha;
- `tests/`: testes automatizados sem dependências;
- `design/`: conceito e registro de procedência visual.

## Publicar

Envie todo o conteúdo desta pasta para a raiz de uma hospedagem estática, por exemplo GitHub Pages, Netlify, Cloudflare Pages, S3 ou um servidor web comum. Não há processo de build. Configure `index.html` como documento inicial e sirva os arquivos com HTTPS para habilitar o service worker.

Se publicar em um subdiretório, mantenha a estrutura relativa de arquivos. O `start_url` do manifest usa `./index.html` e os links são relativos.

## Privacidade e funcionamento offline

Nenhum dado é enviado a servidores. O plano é salvo somente no `localStorage` do navegador. A exportação cria um arquivo JSON no próprio dispositivo. A importação valida versão, tipos, áreas, atividades e decisões antes de aplicar o conteúdo.

Todos os recursos necessários estão no projeto. Após a primeira visita por HTTP(S), o service worker mantém o conjunto principal em cache. Ao abrir por um servidor local, o produto também funciona sem internet. A aplicação não depende do service worker para iniciar.

Ao publicar uma nova versão, incremente `CACHE_NAME` em `service-worker.js` (por exemplo, de `hortalab-escola-v1` para `hortalab-escola-v2`); a ativação remove caches antigos e passa a servir o conjunto atualizado.

## Acessibilidade

A interface utiliza HTML semântico, skip link, foco visível, labels associados, mensagens em `aria-live`, navegação por teclado, alternativas ao drag-and-drop, valores textuais junto aos indicadores, modo lista no simulador, contraste alto, layouts fluidos e respeito a `prefers-reduced-motion`.

## Limitações

O HortaLab é um recurso educacional e não certifica viabilidade. Não substitui avaliação agronômica, análise de solo ou água, orientação nutricional ou sanitária, verificação de acessibilidade e segurança, autorizações, normas locais ou decisão da comunidade escolar. Os indicadores simplificam relações complexas e não garantem produtividade, aprendizagem ou continuidade de uma horta real.
