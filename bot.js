require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { calculatePosition, formatResultMessage } = require('./calculator');

// 환경 변수에서 토큰 가져오기
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN이 설정되지 않았습니다.');
  console.error('📝 .env 파일에 TELEGRAM_BOT_TOKEN을 설정해주세요.');
  process.exit(1);
}

// 봇 생성
const bot = new TelegramBot(token, { polling: true });

console.log('✅ 텔레그램 봇이 시작되었습니다!');

// /start 명령어
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
👋 *3분할 리스크 계산기 봇에 오신 것을 환영합니다!*

이 봇은 진입가와 손절가를 입력하면 자동으로 포지션 사이즈를 계산해줍니다.

📖 *사용 방법:*

1️⃣ *1개 진입가 계산*
\`/calc e1:0.5 stop:0.52\`

2️⃣ *2개 진입가 계산*
\`/calc e1:0.5 e2:0.48 stop:0.52\`

3️⃣ *3개 진입가 계산*
\`/calc e1:0.5 e2:0.48 e3:0.46 stop:0.52\`

💡 *간편 입력* (공백으로 구분)
\`0.5 0.48 0.46 0.52\`
→ 마지막 숫자가 자동으로 손절가로 인식됩니다.

⚙️ *설정 정보:*
• 시드: 2000 USDT (고정)
• 레버리지: 100배 (고정)
• 리스크: 2% (고정)

❓ 도움말: /help
`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// /help 명령어
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📚 *도움말*

*명령어 형식:*
\`/calc e1:진입가1 e2:진입가2 e3:진입가3 stop:손절가\`

*예제:*
• \`/calc e1:0.5 stop:0.52\`
• \`/calc e1:0.5 e2:0.48 stop:0.52\`
• \`/calc e1:0.5 e2:0.48 e3:0.46 stop:0.52\`

*간편 입력:*
숫자들을 공백으로 구분하여 입력하면 됩니다.
마지막 숫자가 손절가로 자동 인식됩니다.

예: \`0.5 0.48 0.46 0.52\`
→ E1: 0.5, E2: 0.48, E3: 0.46, Stop: 0.52

*주의:*
• 최소 1개, 최대 3개의 진입가를 입력할 수 있습니다.
• 손절가는 필수입니다.
• 모든 값은 양수여야 합니다.
`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// /calc 명령어 처리
bot.onText(/\/calc(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim();

  if (!input) {
    bot.sendMessage(chatId,
      '❌ 입력이 없습니다.\n\n예: `/calc e1:0.5 e2:0.48 stop:0.52`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const result = parseCalcInput(input);
    const calculation = calculatePosition(result.entries, result.stop);
    const message = formatResultMessage(calculation);

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ 오류: ${error.message}`);
  }
});

// 일반 메시지 처리 (숫자만 입력한 경우)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // 명령어로 시작하면 무시
  if (text.startsWith('/')) return;

  // 숫자로만 이루어진 메시지인지 확인
  const numbers = text.trim().split(/\s+/).map(n => parseFloat(n)).filter(n => !isNaN(n) && n > 0);

  if (numbers.length >= 2 && numbers.length <= 4) {
    try {
      // 마지막 숫자를 손절가로 처리
      const stop = numbers.pop();
      const entries = numbers;

      const calculation = calculatePosition(entries, stop);
      const message = formatResultMessage(calculation);

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, `❌ 오류: ${error.message}`);
    }
  }
});

/**
 * /calc 명령어 입력 파싱
 * @param {string} input - 사용자 입력
 * @returns {Object} { entries: [], stop: number }
 */
function parseCalcInput(input) {
  const entries = [];
  let stop = null;

  // e1:값, e2:값, e3:값, stop:값 형식 파싱
  const parts = input.split(/\s+/);

  for (const part of parts) {
    const match = part.match(/^(e[123]|stop):([0-9.]+)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      const value = parseFloat(match[2]);

      if (isNaN(value) || value <= 0) {
        throw new Error(`${key}의 값이 유효하지 않습니다: ${match[2]}`);
      }

      if (key === 'stop') {
        stop = value;
      } else {
        entries.push(value);
      }
    }
  }

  if (entries.length === 0) {
    throw new Error('최소 1개의 진입가(e1, e2, e3)를 입력해주세요.');
  }

  if (stop === null) {
    throw new Error('손절가(stop)를 입력해주세요.');
  }

  return { entries, stop };
}

// 에러 처리
bot.on('polling_error', (error) => {
  console.error('Polling 오류:', error.message);
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n👋 봇을 종료합니다...');
  bot.stopPolling();
  process.exit(0);
});
