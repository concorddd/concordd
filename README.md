# Crystal Stream

Crie uma aplicação web moderna estilo Discord Minimalista chamada "StreamCore", focada em chamadas de áudio de baixa latência e compartilhamento de tela em alta definição (suportando até 4K/60fps se o hardware e conexão permitirem).
### 1. DESIGN SYSTEM & UI/UX
- Tema Escuro Obrigatório: Paleta baseada em Zinc/Slate escuro (#0f172a, #1e293b, #334155) com acentos em Roxo/Violeta (#7c3aed).
- Layout Principal (3 colunas estilo Discord):
  1. Barra Lateral de Servidores/Salas: Ícones circulares com estado ativo/hover.
  2. Lista de Canais: Separados em "Canais de Voz/Vídeo" e "Texto". Botão para criar nova sala.
  3. Área Central (Palco Principal): 
     - Quando desconectado: Visão geral da sala e participantes.
     - Quando em chamada: Grade de participantes com indicador visual de quem está falando (borda verde/violeta animada).
     - Quando transmitindo tela: Player de vídeo em destaque com opção de tela cheia, modo PiP (Picture-in-Picture) e seletor de resolução de visualização.
  4. Barra Inferior do Usuário: Avatar, nome, botões de Mutar Microfone, Desativar Áudio (Deafen), Transmitir Tela e Configurações de Mídia.
### 2. CONFIGURAÇÃO DE TRANSMISSÃO DE TELA & ÁUDIO (4K READY)
- Implemente a captura de tela usando a API getDisplayMedia do navegador com suporte a constraints avançadas:
  - Resolução dinâmica ajustável: 720p, 1080p, 1440p e 4K (3840x2160).
  - Taxa de quadros selecionável: 30 FPS e 60 FPS.
  - Opção para ativar/desativar áudio do sistema na transmissão.
- Modal de Configurações de Mídia:
  - Seleção de Microfone e Alto-falante.
  - Teste de áudio em tempo real (barra de nível de áudio).
  - Seleção de qualidade padrão da transmissão de tela (com aviso de consumo de banda para 4K).
### 3. ARQUITETURA DE REDE E CONEXÃO
- Utilize integração com WebRTC para conexão de áudio e vídeo de baixa latência.
- Prepare a estrutura frontend para integração flexível com LiveKit SDK ou WebRTC P2P (Simple-Peer/PeerJS).
- Controle de estado da chamada:
  - Entrar/Sair do canal de voz com 1 clique.
  - Detecção automática de voz (VAD) para iluminar a borda do usuário ativo.
  - Suporte a múltiplos usuários visualizando a mesma transmissão.
### 4. RECURSOS COMPLEMENTARES
- Chat de texto simples integrado ao lado do painel de transmissão para mensagens rápidas durante a call.
- Autenticação e persistência de salas via Supabase.
- Design totalmente responsivo e otimizado para desktop.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://concordd.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/977c3bc9-461b-452f-9503-a71c78c01c7c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
