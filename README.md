# Rodízio de Mirantes — site e painel administrativo

## O que está incluído

- Site público responsivo, com menu dinâmico, categorias e formulário de reserva.
- Botão WhatsApp para +244 923 639 940.
- Contacto de email reservas@rodizio.co.ao.
- Painel privado `admin.html` para um administrador gerir pratos, imagens, preços em Kz e reservas.
- SQL com tabelas, políticas de segurança (RLS) e bucket de imagens do Supabase.

## 1. Criar o projeto Supabase

1. Entre em https://supabase.com e crie um projeto.
2. Abra SQL Editor e execute todo o ficheiro `supabase/schema.sql`.
3. Em Project Settings > API, copie Project URL e a chave pública `anon` (ou publishable).
4. Cole esses dois valores em `config.js`. Nunca use `service_role` ou secret key no site.

## 2. Criar o administrador

1. Em Authentication > Users, crie/invite a conta do proprietário com email e palavra-passe.
2. No SQL Editor, execute a instrução comentada no final de `schema.sql`, substituindo EMAIL_DO_PROPRIETARIO pelo email exato.
3. Aceda a `admin.html` e entre com essa conta.
4. Não partilhe a palavra-passe. Ative MFA no Supabase, se disponível.

## 3. Testar localmente

Abra a pasta no Visual Studio Code. Instale a extensão e escolha “Open with Live Server” no `index.html`. Não abra os ficheiros diretamente com `file://`.

## 4. Publicar no GitHub Pages

1. Crie um repositório público no GitHub, por exemplo `rodizio-de-mirantes`.
2. Envie todos os ficheiros e pastas desta pasta para a raiz do repositório.
3. No GitHub, abra Settings > Pages.
4. Em Build and deployment, escolha Deploy from a branch, branch `main`, pasta `/ (root)`, e guarde.
5. Aguarde a publicação. O endereço será semelhante a `https://SEU-USUARIO.github.io/rodizio-de-mirantes/`.

## 5. Email de reservas

O formulário grava o pedido na tabela `reservations` e o administrador consulta-o no painel. Para enviar também uma notificação automática para reservas@rodizio.co.ao, é necessário configurar uma função server-side (por exemplo Supabase Edge Function + fornecedor de email) e guardar a chave do fornecedor como secret. Não coloque chaves privadas no JavaScript público. Até essa integração estar configurada, o site não deve prometer envio automático de email.

## Notas

- O horário e o preço por pessoa devem ser confirmados pelo restaurante antes de publicar.
- Troque a imagem de demonstração do banner por uma fotografia autorizada do restaurante.
- GitHub Pages é hospedagem estática; Supabase faz autenticação, base de dados e armazenamento.

## 6. Notificação automática por email (opcional, requer configuração)

O projeto inclui `supabase/functions/notify-reservation/index.ts` como ponto de partida para a notificação por email via Resend. Para ativar:

1. Crie uma conta no Resend e configure/verifique um domínio de envio.
2. Instale e configure a Supabase CLI no seu computador.
3. Configure os secrets `RESEND_API_KEY` e `RESERVATION_EMAIL` no projeto Supabase.
4. Publique a função `notify-reservation`.
5. Ligue a chamada da função após a gravação da reserva em `site.js`.
   A função não fica ativa apenas por estar no GitHub. O endereço de destino é `reservas@rodizio.co.ao`; o domínio de envio precisa de ser verificado no fornecedor. Não use `onboarding@resend.dev` em produção.
