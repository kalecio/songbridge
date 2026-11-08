# Songbridge website

Landing page em português, independente do aplicativo Tauri. HTML e CSS estáticos,
fontes Inter locais e logo original: sem serviços externos ou JavaScript no visitante.

## Identidade

A logo original combina uma ponte, ondas e barras de áudio em azul e branco.
O site estende essa linguagem com azul elétrico, lavanda e os fundos do tema
Midnight do aplicativo. A prévia é uma captura dos componentes reais do aplicativo, renderizados com
uma biblioteca de exemplo em `src/test/visual/`. Recursos descritos seguem o README do app.

## Desenvolvimento e publicação

- `npm run website:dev`: prévia local.
- `npm run website:build`: copia o site para `dist-website/`, separado do `dist/` desktop.
- `npm run website:deploy`: compila e publica usando a sessão Cloudflare do Wrangler.
- `npx wrangler login`: autenticação local, quando necessária.

O site é publicado no projeto Cloudflare Pages `songbridge-website`, com branch
de produção `main` e domínio personalizado `songbridge.kalec.io`.
A associação do domínio e o DNS são configurações iniciais no Cloudflare Pages;
o deploy publica os arquivos sem precisar de permissões de Workers ou DNS.

O workflow `.github/workflows/website.yml` publica alterações da pasta do site
na branch `main`, ou por execução manual da mesma branch. Usa os secrets
`CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` do repositório GitHub.
O token precisa somente de **Account / Cloudflare Pages / Edit**, restrito à conta
do projeto. Nenhum token deve ser adicionado ao repositório.

Os downloads estão fixados na versão pública 0.6.0, validada durante a criação.
Ao publicar uma nova versão, atualizar os links e o número em `index.html`.
Os links de outros formatos e notas apontam para a release mais recente.

Configuração de domínio: https://developers.cloudflare.com/pages/configuration/custom-domains/
