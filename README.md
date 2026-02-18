# 🚀 Gerenciador REP - Control iD 

* **💻 Terminal de Debug Integrado:** A interface possui um prompt em tempo real que detalha cada comando e resposta da API. Isso garante um feedback claro para o usuário, permitindo entender exatamente o que está acontecendo em cada etapa.
* **🔌 Arquitetura REST:** Comunicação moderna utilizando padrões API REST entre o Frontend e o Backend (Node.js), e entre o servidor e a API nativa do hardware.

## 🛠️ Tecnologias Utilizadas

* **Linguagens:** JavaScript (ES6+), HTML5 e CSS3.
* **Backend:** [Node.js](https://nodejs.org/) com [Express](https://expressjs.com/).
* **Processamento de Imagem:** [Jimp](https://www.npmjs.com/package/jimp).
* **Comunicação:** [Axios](https://axios-http.com/) (Consumo de API REST).
* **Manipulação de Dados:** [Adm-Zip](https://www.npmjs.com/package/adm-zip) e [Multer](https://www.npmjs.com/package/multer).

---

## 📦 Como Utilizar o Executável (.exe)

Para quem deseja apenas utilizar a ferramenta sem configurar o ambiente de desenvolvimento:

1.  Acesse a aba [Releases](https://github.com/fxlcaovini/Gerenciador/releases).
2.  Baixe o arquivo `.zip` da versão mais recente.
3.  **Importante:** Extraia todos os arquivos na mesma pasta. O executável depende dos arquivos de interface para funcionar.
    ```text
    📂 Gerenciador-REP/
    ├── 📄 Gerenciador REP.exe
    ├── 📄 index.html
    └── 📄 script.js
    ```
4.  Execute o `Gerenciador REP.exe` e acesse `http://localhost:3000` no seu navegador.

---

## 👨‍💻 Para Desenvolvedores

Se quiser rodar o código fonte ou contribuir:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/fxlcaovini/Gerenciador.git](https://github.com/fxlcaovini/Gerenciador.git)
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Inicie o servidor:**
    ```bash
    node server.js
    ```

