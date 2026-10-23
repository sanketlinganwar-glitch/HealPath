/**
 * MediCare AI Health Chatbot & Voice Assistant (Web Speech API)
 */

let isVoiceListening = false;
let speechRecognizer = null;

document.addEventListener('DOMContentLoaded', () => {
  initChatWidget();
});

function initChatWidget() {
  const fab = document.getElementById('chat-fab-btn');
  const widget = document.getElementById('chat-widget-box');
  const closeBtn = document.getElementById('chat-close-btn');
  const sendBtn = document.getElementById('chat-send-btn');
  const input = document.getElementById('chat-input-text');
  const micBtn = document.getElementById('chat-mic-btn');

  if (fab && widget) {
    fab.addEventListener('click', () => {
      widget.classList.toggle('active');
      if (widget.classList.contains('active') && input) {
        input.focus();
      }
    });
  }

  if (closeBtn && widget) {
    closeBtn.addEventListener('click', () => {
      widget.classList.remove('active');
    });
  }

  if (sendBtn && input) {
    sendBtn.addEventListener('click', () => sendUserMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendUserMessage();
    });
  }

  // Setup Web Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && micBtn) {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = false;

    speechRecognizer.onstart = () => {
      isVoiceListening = true;
      micBtn.style.color = '#E5484D';
      micBtn.classList.add('fa-beat');
      if (input) input.placeholder = 'Listening to your voice...';
    };

    speechRecognizer.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) {
        input.value = transcript;
        sendUserMessage(true); // send and speak reply
      }
    };

    speechRecognizer.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoiceListening();
    };

    speechRecognizer.onend = () => {
      stopVoiceListening();
    };

    micBtn.addEventListener('click', () => {
      if (!isVoiceListening) {
        // Set speech language based on app language
        const lang = window.medicareI18n ? window.medicareI18n.getLang() : 'en';
        speechRecognizer.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-US';
        speechRecognizer.start();
      } else {
        speechRecognizer.stop();
        stopVoiceListening();
      }
    });
  } else if (micBtn) {
    micBtn.title = 'Web Speech Recognition not supported in this browser';
    micBtn.style.opacity = '0.5';
  }
}

function stopVoiceListening() {
  isVoiceListening = false;
  const micBtn = document.getElementById('chat-mic-btn');
  const input = document.getElementById('chat-input-text');
  if (micBtn) {
    micBtn.style.color = 'var(--teal)';
    micBtn.classList.remove('fa-beat');
  }
  if (input) input.placeholder = 'Type a message or symptom...';
}

async function sendUserMessage(speakAnswer = false) {
  const input = document.getElementById('chat-input-text');
  const messagesBox = document.getElementById('chat-messages-container');
  if (!input || !messagesBox || !input.value.trim()) return;

  const userText = input.value.trim();
  input.value = '';

  // Append User message
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'chat-msg chat-msg-user';
  userMsgEl.textContent = userText;
  messagesBox.appendChild(userMsgEl);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  // Typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg chat-msg-bot';
  typingEl.innerHTML = '<i class="fas fa-ellipsis-h fa-beat" style="color: var(--teal);"></i> MediCare is answering...';
  messagesBox.appendChild(typingEl);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  try {
    const lang = window.medicareI18n ? window.medicareI18n.getLang() : 'en';
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, lang })
    });

    const data = await res.json();
    typingEl.remove();

    const botMsgEl = document.createElement('div');
    botMsgEl.className = 'chat-msg chat-msg-bot';
    botMsgEl.textContent = data.reply;
    messagesBox.appendChild(botMsgEl);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    // Speak answer aloud if triggered via voice or requested
    if (speakAnswer && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(data.reply);
      utterance.rate = 1.0;
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    typingEl.remove();
    const errorEl = document.createElement('div');
    errorEl.className = 'chat-msg chat-msg-bot';
    errorEl.style.color = '#E5484D';
    errorEl.textContent = 'Sorry, could not process request right now.';
    messagesBox.appendChild(errorEl);
  }
}

function askQuickQuestion(query) {
  const input = document.getElementById('chat-input-text');
  if (input) {
    input.value = query;
    sendUserMessage();
  }
}

window.askQuickQuestion = askQuickQuestion;
