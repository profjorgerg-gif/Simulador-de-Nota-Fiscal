# Simulador Fiscal Didático — CEDUP Hermann Hering

Plataforma de emissão simulada de NF-e e NFS-e para uso em lançamentos
contábeis (Contabilidade Básica, Intermediária e Avançada), com regime
tributário parametrizável acompanhando a transição da Reforma Tributária.

Nenhum documento gerado tem validade fiscal nem é transmitido a órgão oficial.

## Checklist de configuração inicial

1. **Preencher `src/firebase.js`** com o `firebaseConfig` copiado do Console
   do Firebase (Configurações do projeto → Geral → Seus apps).
2. **Preencher o campo `homepage` em `package.json`** com o endereço real:
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO`
3. **Subir os arquivos para o repositório** (branch `main`).
4. **Ativar o GitHub Pages via Actions**: no repositório, vá em
   *Settings → Pages → Build and deployment → Source* e selecione
   **"GitHub Actions"** (não "Deploy from a branch"). O workflow em
   `.github/workflows/deploy.yml` publica automaticamente a cada push.
5. **Liberar o domínio no Firebase**: depois que o site publicar (aba
   *Actions* com bolinha verde), copie o endereço `https://seu-usuario.github.io`
   e adicione em *Authentication → Settings → Domínios autorizados*.
6. **Configurar as regras do Firestore** (Firestore Database → Regras):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

   Isso exige login para qualquer leitura/escrita — mesmo padrão de
   segurança usado no projeto Plataforma do Plano Financeiro.

## Como pedir alterações depois

Igual ao fluxo já usado no outro projeto: descreva a mudança em português
(de preferência anexando o `App.jsx` atual), o Claude edita e valida a
sintaxe, você sobe o(s) arquivo(s) alterado(s) pelo navegador
(`src → Add file → Upload files`), confirma o commit, e o GitHub Actions
publica sozinho em 1 a 3 minutos. Teste sempre em aba anônima/InPrivate
para evitar cache do navegador.

## Estrutura do projeto

```
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.jsx        ← toda a lógica e telas da plataforma
│   ├── App.css         ← estilos
│   ├── firebase.js     ← configuração do Firebase (preencher!)
│   ├── index.js
│   └── index.css
├── .github/workflows/deploy.yml   ← publicação automática
├── package.json        ← preencher o campo "homepage"
└── README.md
```
