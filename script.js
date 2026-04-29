// JavaScript 逻辑: 页面切换、API 调用及交互

// 页面元素缓存
const navLinks = document.getElementById('nav-links');
const toggleMenuBtn = document.getElementById('toggle-menu');
const pages = document.querySelectorAll('.page');

const baseUrlInput = document.getElementById('base-url');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');

// 初始化页面切换
document.querySelectorAll('#nav-links a').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('data-target');
    showPage(targetId);
    // 如果在移动端折叠状态下点击，则关闭菜单
    if (navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
    }
  });
});

// 显示指定页面
function showPage(id) {
  pages.forEach((p) => {
    p.classList.remove('active');
  });
  const page = document.getElementById(id);
  if (page) {
    page.classList.add('active');
  }
}

// 手机端导航切换
toggleMenuBtn.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// 获取模型列表
document.getElementById('fetch-models').addEventListener('click', async () => {
  const base = baseUrlInput.value.trim().replace(/\/$/, '');
  if (!base) {
    alert('请先填写基础地址');
    return;
  }
  try {
    const url = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
    const headers = {};
    const key = apiKeyInput.value.trim();
    if (key) headers['Authorization'] = `Bearer ${key}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('无法获取模型');
    const data = await res.json();
    const models = data.data || data.models || [];
    modelSelect.innerHTML = '';
    if (!Array.isArray(models)) {
      // 如果返回的是对象的数组在 data.items
      const arr = models.items || [];
      arr.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id || m;
        opt.textContent = m.id || m;
        modelSelect.appendChild(opt);
      });
    } else {
      models.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id || m;
        opt.textContent = m.id || m;
        modelSelect.appendChild(opt);
      });
    }
    if (modelSelect.options.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '未找到模型';
      modelSelect.appendChild(opt);
    }
  } catch (err) {
    console.error(err);
    alert('获取模型列表失败');
  }
});

/**
 * 调用聊天模型生成回复
 * @param {Array<{role:string, content:string}>} messages
 * @returns {Promise<string>}
 */
async function callChat(messages) {
  const base = baseUrlInput.value.trim().replace(/\/$/, '');
  if (!base) throw new Error('基础地址未设置');
  const key = apiKeyInput.value.trim();
  const model = modelSelect.value || 'gpt-3.5-turbo';
  // 根据地址拼接端点
  const endpoint = base.includes('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
  const body = { model, messages };
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`请求失败: ${res.status} ${errText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || '接口错误');
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return reply || '';
}

// 自述生成
document.getElementById('generate-self').addEventListener('click', async () => {
  const world = document.getElementById('self-world').value.trim();
  const personality = document.getElementById('self-personality').value.trim();
  const scene = document.getElementById('self-scene').value.trim();
  const firstMsg = document.getElementById('self-first-message').value.trim();
  if (!world && !personality && !scene) {
    alert('请至少填写一项内容');
    return;
  }
  const prompt =
    `请根据以下描述生成一个适合 SillyTavern 的角色卡 json，字段包括 name, description, personality, scenario, first_person_message：\n` +
    `世界观: ${world}\n性格特征: ${personality}\n场景: ${scene}\n第一句话: ${firstMsg}`;
  const messages = [
    { role: 'system', content: '你是一位角色卡设计助手，返回的内容请直接输出 JSON，包含name, description, personality, scenario, first_person_message 等字段' },
    { role: 'user', content: prompt },
  ];
  const resultPre = document.getElementById('self-result');
  resultPre.textContent = '生成中...';
  try {
    const reply = await callChat(messages);
    resultPre.textContent = reply;
  } catch (err) {
    resultPre.textContent = '生成失败：' + err.message;
  }
});

// 聊天生成
const chatMessagesDiv = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
let chatHistory = [];

function appendChatMessage(role, content) {
  const div = document.createElement('div');
  div.classList.add('message', role === 'user' ? 'user' : 'ai');
  div.textContent = content;
  chatMessagesDiv.appendChild(div);
  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

document.getElementById('chat-send').addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  chatHistory.push({ role: 'user', content: text });
  appendChatMessage('user', text);
  // 调用 AI 回复
  try {
    const messages = [...chatHistory];
    const reply = await callChat(messages);
    chatHistory.push({ role: 'assistant', content: reply });
    appendChatMessage('ai', reply);
  } catch (err) {
    appendChatMessage('ai', '出错了: ' + err.message);
  }
});

// 完成生成角色卡
document.getElementById('chat-finish').addEventListener('click', async () => {
  if (chatHistory.length === 0) {
    alert('请先与 AI 进行一些交流');
    return;
  }
  const messages = [...chatHistory];
  messages.push({ role: 'user', content: '根据我们之间的对话，请生成适合 SillyTavern 的角色卡 JSON，包括 name, description, personality, scenario, first_person_message 字段。请直接以 JSON 格式输出。' });
  const resultPre = document.getElementById('chat-result');
  resultPre.textContent = '生成中...';
  try {
    const reply = await callChat(messages);
    resultPre.textContent = reply;
  } catch (err) {
    resultPre.textContent = '生成失败：' + err.message;
  }
});

// 标签生成
document.getElementById('generate-from-tags').addEventListener('click', async () => {
  const selectedTags = Array.from(document.querySelectorAll('.tag-input:checked')).map((el) => el.value);
  if (selectedTags.length === 0) {
    alert('请至少选择一个标签');
    return;
  }
  const prompt =
    `根据以下标签生成一个角色设定并输出 JSON 格式：${selectedTags.join(', ')}。字段包括 name, description, personality, scenario, first_person_message。`;
  const messages = [
    { role: 'system', content: '你是一位角色卡设计助手，返回的内容请直接输出 JSON，包含name, description, personality, scenario, first_person_message 等字段' },
    { role: 'user', content: prompt },
  ];
  const resultPre = document.getElementById('tags-result');
  resultPre.textContent = '生成中...';
  try {
    const reply = await callChat(messages);
    resultPre.textContent = reply;
  } catch (err) {
    resultPre.textContent = '生成失败：' + err.message;
  }
});

// 模板填写/润色
document.getElementById('template-submit').addEventListener('click', async () => {
  const name = document.getElementById('template-name').value.trim();
  const description = document.getElementById('template-description').value.trim();
  const extra = document.getElementById('template-extra').value.trim();
  if (!name || !description) {
    alert('请填写名称和描述');
    return;
  }
  const prompt =
    `以下为用户手写的角色设定，请将描述润色并补全，输出 JSON 格式，字段包括 name, description, personality, scenario, first_person_message：\n` +
    `name: ${name}\ndescription: ${description}\nfirst_person_message: ${extra}`;
  const messages = [
    { role: 'system', content: '你是一位角色卡润色助手，返回的内容请直接输出 JSON，包含 name, description, personality, scenario, first_person_message 等字段' },
    { role: 'user', content: prompt },
  ];
  const resultPre = document.getElementById('template-result');
  resultPre.textContent = '生成中...';
  try {
    const reply = await callChat(messages);
    resultPre.textContent = reply;
  } catch (err) {
    resultPre.textContent = '生成失败：' + err.message;
  }
});

// 上传 / 二改
document.getElementById('upload-submit').addEventListener('click', async () => {
  const fileInput = document.getElementById('upload-file');
  const modifyText = document.getElementById('upload-modify').value.trim();
  const file = fileInput.files[0];
  if (!file) {
    alert('请先选择 JSON 文件');
    return;
  }
  try {
    const text = await file.text();
    const prompt =
      `以下是已有的 SillyTavern 角色卡 JSON：${text}\n用户希望进行如下修改：${modifyText}。请根据要求更新并输出新的 JSON 角色卡。`;
    const messages = [
      { role: 'system', content: '你是一位角色卡修改助手，返回的内容请直接输出 JSON，包含 name, description, personality, scenario, first_person_message 等字段' },
      { role: 'user', content: prompt },
    ];
    const resultPre = document.getElementById('upload-result');
    resultPre.textContent = '生成中...';
    const reply = await callChat(messages);
    resultPre.textContent = reply;
  } catch (err) {
    document.getElementById('upload-result').textContent = '生成失败：' + err.message;
  }
});

// 全局 AI 助手
const assistantButton = document.getElementById('assistant-button');
const assistantModal = document.getElementById('assistant-modal');
const assistantClose = document.getElementById('assistant-close');
const assistantMessagesDiv = document.getElementById('assistant-messages');
const assistantInput = document.getElementById('assistant-input');

assistantButton.addEventListener('click', () => {
  assistantModal.style.display = 'flex';
});

assistantClose.addEventListener('click', () => {
  assistantModal.style.display = 'none';
});

// 点击模态框外部关闭
assistantModal.addEventListener('click', (e) => {
  if (e.target === assistantModal) {
    assistantModal.style.display = 'none';
  }
});

function appendAssistantMessage(role, content) {
  const div = document.createElement('div');
  div.classList.add('message', role === 'user' ? 'user' : 'ai');
  div.textContent = content;
  assistantMessagesDiv.appendChild(div);
  assistantMessagesDiv.scrollTop = assistantMessagesDiv.scrollHeight;
}

document.getElementById('assistant-send').addEventListener('click', async () => {
  const text = assistantInput.value.trim();
  if (!text) return;
  assistantInput.value = '';
  appendAssistantMessage('user', text);
  try {
    const messages = [ { role: 'user', content: text } ];
    const reply = await callChat(messages);
    appendAssistantMessage('ai', reply);
  } catch (err) {
    appendAssistantMessage('ai', '出错了: ' + err.message);
  }
});

// 默认显示首页
showPage('settings');