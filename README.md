# HortaLab Escola

Produto educacional estático para apoiar professores e gestores no planejamento pedagógico, agroecológico e organizacional de hortas escolares. O projeto funciona sem backend, cadastro, banco remoto, analytics ou dependências de execução externas.

## Versão oficial e histórico

O produto possui uma única entrada oficial em `index.html`. A jornada foi simplificada para seis etapas e inclui a aba `Layout` logo depois de `Composição`, com montagem isométrica interativa, seleção, remoção, rotação, zoom e reposicionamento acessível por teclado.

A versão anterior não foi apagada do histórico: a tag Git `v1-atual` aponta para o estado anterior do projeto. Assim, o GitHub mantém versionamento real sem criar duas aplicações concorrentes no site publicado.

## Funcionalidades

- jornada guiada em seis etapas;
- diagnóstico sem dados pessoais;
- cenários comparativos de 12, 25 e 50 m²;
- simulador de composição com mapa, lista, arrastar e soltar e comandos equivalentes por botão/teclado;
- total de área validado em tempo real;
- layout isométrico de alta qualidade gráfica com zonas selecionáveis;
- planejamento curricular e atividades selecionáveis;
- resumo imprimível do plano;
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

Os testes verificam:

- soma exata dos três cenários;
- parcelas de 19,8 + 17,2 + 4,0 + 3,0 + 6,0 = 50,0 m²;
- determinismo e limites dos indicadores;
- impacto previsível dos eventos;
- rejeição de JSON com área impossível;
- presença das seis etapas e controles essenciais;
- schema e persistência SQLite local;
- exportação/importação JSON e SQLite;
- cobertura temática da cartilha;
- ausência de scripts, fontes e imagens remotas;
- jornada no navegador, console, impressão e responsividade em 360, 768, 1024 e 1440 px.

O teste de interface usa `playwright-core` como dependência de desenvolvimento e o Chrome ou Edge já instalado, sem baixar outro navegador. Ele percorre a jornada, valida a persistência após recarregar, gera os arquivos de exportação e salva capturas de QA em `%TEMP%\hortalab-escola-qa`.

As capturas revisadas também ficam versionadas em `screenshots/layout-desktop-v2.png` e `screenshots/layout-mobile-v2.png`.

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

Ao publicar uma nova versão, incremente `CACHE_NAME` em `service-worker.js` (por exemplo, de `hortalab-escola-v1` para `hortalab-escola-v2`); a ativação remove caches antigos e passa a servir o conjunto atualizado.

## Acessibilidade

A interface utiliza HTML semântico, skip link, foco visível, labels associados, mensagens em `aria-live`, navegação por teclado, alternativas ao drag-and-drop, valores textuais junto aos indicadores, modo lista no simulador, contraste alto, layouts fluidos e respeito a `prefers-reduced-motion`.

## Limitações

O HortaLab é um recurso educacional e não certifica viabilidade. Não substitui avaliação agronômica, análise de solo ou água, orientação nutricional ou sanitária, verificação de acessibilidade e segurança, autorizações, normas locais ou decisão da comunidade escolar. Os indicadores simplificam relações complexas e não garantem produtividade, aprendizagem ou continuidade de uma horta real. O SQLite é local ao navegador/dispositivo: para transportar o plano entre dispositivos, use a exportação JSON ou SQLite.
