const { createApp, ref, reactive, computed } = Vue;

createApp({
  components: { PlantCard },
  setup() {
    // ---- 植物列表：篩選（computed）與清單（ref） ----
    const q = ref(''), cat = ref('全部'), onlyOpen = ref(false);
    const cats = ['全部', ...new Set(PLANTS.map(p => p.cat))];
    const list = computed(() => PLANTS.filter(p =>
      (cat.value === '全部' || p.cat === cat.value) &&
      (!onlyOpen.value || p.open) &&
      (p.name + p.desc + p.light + p.level).includes(q.value.trim())));
    const picked = ref([]);
    try { picked.value = JSON.parse(localStorage.getItem('picked') || '[]'); } catch (e) {}
    const toggle = id => {
      picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id];
      try { localStorage.setItem('picked', JSON.stringify(picked.value)); } catch (e) {}
    };
    const pickedPlants = computed(() => PLANTS.filter(p => picked.value.includes(p.id)));
    const total = computed(() => pickedPlants.value.reduce((s, p) => s + p.price, 0));

    // ---- 預購登記表單：驗證、送出中狀態 ----
    const form = reactive({ name: '', phone: '', email: '', env: '', slot: '自取', note: '', agree: false });
    const tried = ref(false), sending = ref(false), result = ref(null);
    const errors = computed(() => {
      const e = {};
      if (!form.name) e.name = '請輸入姓名';
      if (!/^09\d{8}$/.test(form.phone)) e.phone = '手機格式：09 開頭，共 10 碼數字';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email 格式不正確';
      if (!picked.value.length) e.picked = '請至少加入一種植物';
      if (!form.agree) e.agree = '請勾選同意';
      return e;
    });
    async function submit() {
      tried.value = true;
      if (sending.value || Object.keys(errors.value).length) return; // 送出中不重複送出
      sending.value = true;
      await new Promise(r => setTimeout(r, 600)); // 模擬網路延遲（本專題無後端）
      result.value = { no: 'P' + Date.now().toString().slice(-6), name: form.name, slot: form.slot, plants: pickedPlants.value.map(p => p.name) };
      sending.value = false;
    }

    // ---- 本地 AI：LM Studio（OpenAI 相容）或 Ollama ----
    const ai = reactive({ provider: 'lmstudio', base: 'http://127.0.0.1:1234', model: '', models: [], q: '', a: '', err: '', busy: false });
    async function loadModels() {
      ai.err = '';
      try {
        const r = await fetch(ai.base + (ai.provider === 'ollama' ? '/api/tags' : '/v1/models'));
        const j = await r.json();
        ai.models = ai.provider === 'ollama' ? j.models.map(m => m.name) : j.data.map(m => m.id);
        ai.model = ai.models[0] || '';
        if (!ai.model) ai.err = '連線成功，但尚未下載或載入任何模型。';
      } catch (e) { ai.err = '連不到本地 AI：請確認伺服器已啟動、已啟用 CORS，且網址正確。'; }
    }
    async function ask() {
      if (ai.busy || !ai.q.trim() || !ai.model) return;
      ai.busy = true; ai.err = ''; ai.a = '';
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 120000);
      const system = '你是植物店的養護顧問，全程使用台灣繁體中文。只根據下列植物資料回答；資料沒有的資訊，回答「目前資料不足，請洽店家」。不要代為下單，也不要推薦清單以外的植物。\n' + JSON.stringify(PLANTS);
      const messages = [{ role: 'system', content: system }, { role: 'user', content: ai.q + ' /no_think' }];
      try {
        const ollama = ai.provider === 'ollama';
        const r = await fetch(ai.base + (ollama ? '/api/chat' : '/v1/chat/completions'), {
          method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ollama ? { model: ai.model, messages, stream: false }
                                      : { model: ai.model, messages, max_tokens: 512, temperature: 0.3 })
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        const text = ollama ? j.message.content : j.choices[0].message.content;
        ai.a = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      } catch (e) {
        ai.err = e.name === 'AbortError' ? 'AI 超過 120 秒未回應，請重試。' : '呼叫失敗（' + e.message + '），問題已保留，可再按一次送出。';
      } finally { clearTimeout(timer); ai.busy = false; }
    }

    return { q, cat, onlyOpen, cats, list, picked, pickedPlants, total, toggle, form, tried, sending, result, errors, submit, ai, loadModels, ask };
  }
}).mount('#app');
