# HortaLab Escola

Produto educacional estático para apoiar professores e gestores no planejamento pedagógico, agroecológico e organizacional de hortas escolares. O projeto funciona sem backend, cadastro, banco remoto, analytics ou dependências de execução externas.

## Versão oficial e histórico

O produto possui uma única entrada oficial em `index.html`. Na versão `2.4.0`, a linguagem foi revisada para professores da educação básica e a jornada passou a acompanhar as tarefas previstas no projeto acadêmico: conhecer a realidade da escola, comparar tamanhos, escolher os espaços, organizar a maquete 3D, planejar aulas e cuidados, testar imprevistos e preparar o plano final. Termos técnicos de informática foram retirados da interface principal, sem eliminar o salvamento local, as exportações ou as regras determinísticas. A cena continua usando onze peças 3D originais em PNG transparente e o controle direcional acompanha a direção visual da tela, inclusive após girar a vista.

A versão anterior continua disponível na tag Git `v2.3.0`; versões ainda mais antigas permanecem no histórico do repositório. Assim, o GitHub mantém uma única aplicação publicada e permite voltar a qualquer versão marcada.

## Funcionalidades

- jornada guiada em sete etapas, com linguagem voltada a professores;
- diagnóstico sem dados pessoais sobre espaço, sol, água, solo, acesso, equipe, férias, orçamento e ferramentas;
- cenários comparativos de 12, 25 e 50 m²;
- simulador de composição 2D com catálogo, mapa proporcional, lista, grade, inspetor, desfazer/refazer, arrastar e soltar e comandos equivalentes por botão/teclado;
- total de área validado em tempo real;
- layout isométrico de alta qualidade gráfica com zonas selecionáveis;
- planejamento curricular, rotina de cuidados, substitutos, gastos e critérios de pausa;
- imprevistos com escolhas explicadas e revisão do plano em quatro dimensões;
- plano final imprimível com condições, espaços, atividades, cuidados, decisões, alertas e próximos ajustes;
- exportação e importação JSON validadas;
- salvamento local em banco SQLite no navegador, persistido no IndexedDB do próprio dispositivo;
- exportação e importação de backup `.sqlite`;
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

Para o teste de navegador, mantenha `npm.cmd start` executando em outro terminal (ou use `npm.cmd start` antes da rodada).

Os testes verificam:

- soma exata dos três cenários;
- parcelas de 19,8 + 17,2 + 4,0 + 3,0 + 6,0 = 50,0 m²;
- determinismo e limites dos indicadores;
- impacto previsível dos eventos;
- rejeição de JSON com área impossível;
- presença das sete etapas e controles essenciais;
- schema e persistência SQLite local;
- exportação/importação JSON e SQLite;
- cobertura temática da cartilha;
- ausência de scripts, fontes e imagens remotas;
- composição 2D, inspetor, mapa/lista, grade, desfazer/refazer e arrastar e soltar;
- passagem do conjunto escolhido para o layout isométrico;
- linguagem simples na interface, sem termos de banco de dados ou formatos de programação como rótulos principais;
- integração entre diagnóstico, cuidados, imprevistos, indicadores explicados e plano final;
- jornada no navegador, console, impressão e responsividade em 360, 768, 1024 e 1440 px.

O teste de interface usa `playwright-core` como dependência de desenvolvimento e o Chrome ou Edge já instalado, sem baixar outro navegador. Ele percorre a jornada, valida a persistência após recarregar, gera os arquivos de exportação e salva capturas de QA em `%TEMP%\hortalab-escola-qa`.

As capturas revisadas também ficam versionadas em `screenshots/`: início da jornada, escolha dos espaços, maquete 3D e revisão dos imprevistos, em desktop e celular.

## Estrutura

- `index.html`: jornada oficial e planejador;
- `cartilha.html`: cartilha digital;
- `js/data.js`: cenários, componentes, atividades e eventos;
- `js/state.js`: estado e regras do produto acadêmico original;
- `js/rules.js`: regras determinísticas e explicáveis;
- `js/local-db.js`: SQLite local em WebAssembly, persistido no IndexedDB;
- `js/planner.js`: interface oficial, composição, layout e exportações;
- `js/storage.js`: validador legado mantido para os testes dos módulos acadêmicos anteriores (não é usado pela aplicação oficial);
- `css/planner.css`: identidade visual e layout do planejador;
- `css/print.css`: impressão do plano e da cartilha;
- `assets/vendor/sql-wasm.js` e `assets/vendor/sql-wasm.wasm`: motor SQLite incorporado localmente;
- `tests/`: testes automatizados de regras, estrutura, SQLite e jornada visual;
- `design/`: conceito e registro de procedência visual.

## Publicar

Envie todo o conteúdo desta pasta para a raiz de uma hospedagem estática, por exemplo GitHub Pages, Netlify, Cloudflare Pages, S3 ou um servidor web comum. Não há processo de build. Configure `index.html` como documento inicial e sirva os arquivos com HTTPS para habilitar o service worker.

Se publicar em um subdiretório, mantenha a estrutura relativa de arquivos. O `start_url` do manifest usa `./index.html` e os links são relativos.

## Privacidade e funcionamento offline

Nenhum dado é enviado a servidores. O plano é salvo em um banco SQLite no próprio dispositivo; o arquivo binário fica persistido no IndexedDB do navegador. A exportação cria um JSON e também permite baixar um backup `.sqlite`. A importação valida cenário, tipos, áreas e estrutura antes de aplicar o conteúdo.

Todos os recursos necessários estão no projeto. Após a primeira visita por HTTP(S), o service worker mantém o conjunto principal em cache. Ao abrir por um servidor local, o produto também funciona sem internet. A aplicação não depende do service worker para iniciar.

Ao publicar uma nova versão, incremente `CACHE_NAME` em `service-worker.js` e a versão nos URLs de `css/planner.css` e `js/planner.js`; a ativação remove caches antigos e os URLs versionados impedem que HTML novo seja combinado com recursos antigos.

## Acessibilidade

A interface utiliza HTML semântico, skip link, foco visível, labels associados, mensagens em `aria-live`, navegação por teclado, alternativas ao drag-and-drop, valores textuais junto aos indicadores, modo lista no simulador, contraste alto, layouts fluidos e respeito a `prefers-reduced-motion`.

## Limitações

O HortaLab é um recurso educacional e não certifica viabilidade. Não substitui avaliação agronômica, análise de solo ou água, orientação nutricional ou sanitária, verificação de acessibilidade e segurança, autorizações, normas locais ou decisão da comunidade escolar. Os indicadores simplificam relações complexas e não garantem produtividade, aprendizagem ou continuidade de uma horta real. O SQLite é local ao navegador/dispositivo: para transportar o plano entre dispositivos, use a exportação JSON ou SQLite.
