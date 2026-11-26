# Missão Voz 🌟

Brincadeira de estímulo à fala para crianças pequenas (a partir de uns 2–3 anos). A criança fala, e a voz dela aciona o poder do herói, que transforma a nuvem bagunceira numa nuvem feliz com arco-íris.

O projeto nasceu de uma necessidade real em casa e usa princípios de fonoaudiologia e terapia ocupacional: modelo de fala do adulto, pista visual, causa e efeito imediato e reforço positivo. **Não existe "erro" nem "game over"**: toda tentativa vira poder.

> ⚠️ É um apoio lúdico e não substitui avaliação nem terapia fonoaudiológica. O ideal é montar o banco de palavras junto com a fono que acompanha a criança.

## Como funciona

1. O alvo aparece com uma figura (emoji) e o app fala a palavra-modelo, com a voz gravada pelos pais ou com a voz do celular.
2. O herói fica "escutando" e um brilho reage à voz da criança.
3. Quando ela fala, sai o raio. A força da animação vem da **duração e do número de sílabas**, não do volume.
4. A nuvem fica feliz, toca uma comemoração gravada pelos pais e a missão segue.
5. Em silêncio, o herói incentiva e repete o modelo. Depois de duas tentativas, segue para a próxima palavra sem drama.
6. Cada missão tem de 3 a 5 palavras (cerca de 2 a 3 minutos).

Tocar no alvo repete a palavra. Um botão discreto ✓, no canto, permite ao adulto marcar quando a criança falou certo. Isso alimenta o histórico sem que o app precise "julgar" a fala.

## Decisões de projeto

| Decisão | Por quê |
| --- | --- |
| Detecção de voz em vez de reconhecimento de fala | Modelos como Whisper ou Vosk são treinados com fala adulta e erram muito com crianças de 3 anos, que simplificam sons de forma normal para a idade. Um "erro" do modelo frustraria a criança. Quem valida é o adulto (✓). |
| Força pela duração e pelas sílabas, com teto de volume | Recompensar volume estimula grito, e grito frequente pode causar lesões nas pregas vocais (ex.: nódulos). |
| Limiar relativo ao ruído do ambiente + sensibilidade | Calibração em 1 toque e ajuste fino para criança que fala baixinho. |
| Banco de palavras pela ordem de aquisição fonológica | Vogais e P, B, M, T, D primeiro. LH, NH, R e encontros consonantais ficam para depois. |
| Tudo local (IndexedDB) | Voz de criança é dado sensível (LGPD, art. 14). Nenhum áudio sai do aparelho. |
| Temas plugáveis | O repositório traz só um tema original. Temas pessoais ficam fora do Git. |
| Botões de segurar | A área dos pais (3 s) e a saída (1,5 s) não abrem com toque acidental. |

## Arquitetura

```
src/
  audio/
    context.ts        AudioContext único (desbloqueio no iOS)
    VoiceDetector.ts  Web Audio: passa-faixa 250–3500 Hz, RMS, limiar adaptativo,
                      segmentação de fala e estimativa de sílabas por picos de energia
    playback.ts       reprodução das gravações + voz do celular (speechSynthesis) como reserva
    recorder.ts       MediaRecorder reaproveitando o stream do microfone
    sfx.ts            efeitos sintetizados (sem arquivos de som)
  data/words.ts       banco de palavras por nível + força da animação
  storage/db.ts       IndexedDB sem dependências: configurações, gravações e tentativas
  themes/             tema padrão + carregamento automático de temas locais
  screens/            Início, Missão, Fim e Área dos pais
public/sw.js          service worker: funciona offline depois do primeiro acesso
```

Stack: React 19 + TypeScript + Vite, PWA instalável, sem backend.

## Rodando

```bash
npm install
npm run dev        # no computador: http://localhost:5173
npm run celular    # na rede local, com HTTPS autoassinado (o microfone exige HTTPS)
```

Com `npm run celular`, abra no celular o endereço `https://<ip-do-computador>:5173`, aceite o aviso do certificado e use "Adicionar à tela inicial".

Para usar sempre, publique o build (`npm run build`, pasta `dist/`) em qualquer hospedagem com HTTPS, como GitHub Pages, Vercel ou Netlify.

### Primeiro uso (adulto)

1. Segure ⚙️ por 3 segundos para abrir a área dos pais.
2. Libere o microfone e toque em **Calibrar ruído do ambiente**, em silêncio.
3. Peça para a criança falar e ajuste a sensibilidade até a barra passar da linha com a voz normal dela.
4. Grave algumas **comemorações** e **incentivos** com a voz da família. Opcionalmente, grave você falando cada palavra.
5. Escolha o nível e quantas palavras por missão.

## Criando um tema pessoal (fora do Git)

O zip já vem com um exemplo completo em `src/themes/local/aranha/`: herói com imagens, teia no lugar do raio, rede prendendo o alvo e palavras do tema. Basta colocar as imagens em `imagens/`, seguindo o `COLOQUE-AQUI.md`. Se quiser montar outro do zero:

Crie `src/themes/local/<nome>/theme.tsx`. A pasta `src/themes/local/` está no `.gitignore`.

```tsx
import type { Theme } from '../../../types';
import heroiImg from './heroi.png';
import heroiFelizImg from './heroi-feliz.png';
import alvoImg from './alvo.png';
import alvoPresoImg from './alvo-preso.png';

const theme: Theme = {
  id: 'meu-tema',
  name: 'Meu tema',
  colors: { bg: '#1a1a40', bgAccent: '#c62828', primary: '#c62828', power: '#ffffff', text: '#ffffff' },
  powerWord: 'Fiu!',
  fallbackCheers: ['Isso mesmo!', 'Que poder incrível!'],
  fallbackEncourage: ['Vamos juntos de novo?'],
  extraWords: [{ id: 'pula', text: 'Pula!', emoji: '🦘', level: 2, syllables: 2 }],
  Hero: ({ mood }) => <img src={mood === 'happy' ? heroiFelizImg : heroiImg} alt="" style={{ width: '100%' }} />,
  Target: ({ caught }) => <img src={caught ? alvoPresoImg : alvoImg} alt="" style={{ width: '100%' }} />,
};

export default theme;
```

Depois é só escolher o tema na área dos pais.

## Próximos passos

- [ ] Espelho de praxia: câmera frontal em modo espelho + personagem mostrando o formato da boca
- [ ] Gráfico de evolução por som/fonema
- [ ] Cadastro de palavras novas pela área dos pais
- [ ] Relatório em PDF para a fono
- [ ] Experimento opcional de keyword spotting offline, só como dado para o adulto, nunca para "reprovar"
- [ ] Testes unitários do `VoiceDetector` (sinais sintéticos) e testes E2E com microfone falso (Playwright)

## Privacidade

Nada é enviado para servidores. Gravações, configurações e histórico ficam no IndexedDB do navegador do aparelho. Para apagar tudo, limpe os dados do site nas configurações do navegador.
