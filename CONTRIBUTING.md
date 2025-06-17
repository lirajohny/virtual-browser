# Contribuindo para o Navegador Virtual Multi-Usuário

Obrigado por considerar contribuir para este projeto! 🎉

## Como Contribuir

### 🐛 Reportando Bugs

1. Verifique se o bug já foi reportado nas [Issues](../../issues)
2. Se não encontrar, crie uma nova issue com:
   - Título claro e descritivo
   - Descrição detalhada do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Informações do ambiente (OS, Node.js, navegador)

### 💡 Sugerindo Melhorias

1. Verifique se a sugestão já existe nas [Issues](../../issues)
2. Crie uma nova issue com:
   - Título claro começando com "Feature Request:"
   - Descrição detalhada da funcionalidade
   - Justificativa (por que seria útil)
   - Exemplos de uso
   - Mockups ou diagramas (se aplicável)

### 🔧 Contribuindo com Código

#### Configuração do Ambiente

1. **Fork** o repositório
2. **Clone** seu fork:
   ```bash
   git clone https://github.com/seu-usuario/navegador-virtual.git
   cd navegador-virtual
   ```
3. **Instale** as dependências:
   ```bash
   npm install
   ```
4. **Configure** o ambiente:
   ```bash
   cp .env.example .env
   ```

#### Fluxo de Desenvolvimento

1. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/nome-da-feature
   ```
2. **Faça suas alterações** seguindo os padrões do projeto
3. **Teste** suas alterações:
   ```bash
   npm start
   # Teste manualmente a funcionalidade
   ```
4. **Commit** suas mudanças:
   ```bash
   git add .
   git commit -m "feat: adiciona nova funcionalidade X"
   ```
5. **Push** para seu fork:
   ```bash
   git push origin feature/nome-da-feature
   ```
6. **Abra um Pull Request**

#### Padrões de Código

##### JavaScript
- Use **camelCase** para variáveis e funções
- Use **PascalCase** para classes
- Use **UPPER_CASE** para constantes
- Prefira `const` e `let` ao invés de `var`
- Use template literals ao invés de concatenação
- Adicione comentários JSDoc para funções públicas

##### Commits
Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` mudanças na documentação
- `style:` formatação, ponto e vírgula, etc
- `refactor:` refatoração de código
- `test:` adição ou correção de testes
- `chore:` tarefas de build, configuração, etc

Exemplos:
```
feat: adiciona suporte a múltiplos user-agents
fix: corrige vazamento de memória em sessões
docs: atualiza README com novas instruções
```

##### Estrutura de Arquivos
```
navegador-virtual/
├── server/           # Código do backend
│   ├── app.js       # Servidor principal
│   ├── sessions.js  # Gerenciamento de sessões
│   ├── proxy.js     # Sistema de proxy
│   └── websocket.js # Comunicação WebSocket
├── public/          # Frontend
│   ├── index.html   # Interface principal
│   ├── script.js    # Lógica do cliente
│   └── style.css    # Estilos
├── docs/            # Documentação adicional
└── tests/           # Testes (futuro)
```

#### Testes

Atualmente o projeto não possui testes automatizados, mas você pode testar manualmente:

1. **Teste Básico**:
   - Inicie o servidor
   - Abra múltiplas abas
   - Verifique se cada aba recebe um ID único
   - Navegue para diferentes sites

2. **Teste de Isolamento**:
   - Acesse o mesmo site em múltiplas abas
   - Faça login com contas diferentes
   - Verifique se as sessões estão isoladas

3. **Teste de Performance**:
   - Abra 5+ sessões simultâneas
   - Monitore uso de CPU e memória
   - Verifique se não há vazamentos

### 📋 Checklist para Pull Requests

- [ ] Código segue os padrões do projeto
- [ ] Funcionalidade foi testada manualmente
- [ ] Documentação foi atualizada (se necessário)
- [ ] Commit messages seguem o padrão
- [ ] Não há conflitos com a branch main
- [ ] PR tem título e descrição claros

### 🎯 Áreas que Precisam de Ajuda

#### Alta Prioridade
- 🧪 **Testes Automatizados**: Jest, Mocha, ou similar
- 🔒 **Segurança**: Auditoria de segurança, sanitização
- 📊 **Performance**: Otimizações, profiling
- 🐳 **Docker**: Containerização completa

#### Média Prioridade
- 🎨 **UI/UX**: Melhorias na interface
- 📱 **Mobile**: Otimizações para dispositivos móveis
- 🌍 **i18n**: Internacionalização
- 📖 **Documentação**: Tutoriais, exemplos

#### Baixa Prioridade
- 🎮 **Features**: Novas funcionalidades
- 🎨 **Temas**: Sistema de temas
- 🔌 **Plugins**: Arquitetura de plugins

### 💬 Comunicação

- **Issues**: Para bugs e sugestões
- **Discussions**: Para perguntas gerais
- **Pull Requests**: Para contribuições de código

### 📜 Código de Conduta

Este projeto segue o [Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você concorda em manter um ambiente respeitoso e inclusivo.

### 🏆 Reconhecimento

Todos os contribuidores serão reconhecidos no README e releases. Contribuições significativas podem resultar em acesso de colaborador ao repositório.

### ❓ Dúvidas?

Se tiver dúvidas sobre como contribuir:

1. Verifique a documentação existente
2. Procure em issues fechadas
3. Abra uma nova issue com a tag "question"
4. Entre em contato com os mantenedores

---

**Obrigado por ajudar a tornar este projeto melhor! 🚀**