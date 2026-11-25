export function mountWorkspace({ el, copy, notify, choices }) {
  const picker = el("builder-skill");
  const result = el("builder-result");
  const topic = el("builder-topic");
  const builderStatus = el("builder-status");
  for (const [key, item] of choices) picker.add(new Option(item.title, key));

  el("builder-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!topic.value.trim()) { topic.focus(); return; }
    const ratio = el("builder-ratio").value;
    const notes = el("builder-notes").value.trim();
    const text = choices.get(picker.value).prompt(topic.value.trim());
    result.value = [text, ratio && "화면 비율 · " + ratio, notes && "추가 조건 · " + notes].filter(Boolean).join("\n\n");
    builderStatus.textContent = "";
  });

  el("builder-copy").addEventListener("click", () => {
    if (result.value.trim()) void copy(result.value);
  });

  el("builder-save").addEventListener("click", async event => {
    const button = event.currentTarget;
    const prompt = result.value.trim();
    if (!prompt) { builderStatus.textContent = "먼저 프롬프트를 만들어 주세요."; return; }
    const title = topic.value.trim() || choices.get(picker.value).title.slice(0, 80);
    button.disabled = true;
    try {
      await request({ method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt, skill: picker.value }) });
      builderStatus.textContent = "내 작업실에 저장했어요.";
    } catch (error) {
      builderStatus.textContent = error.message;
      if (error.status === 401) builderStatus.append(loginLink());
    } finally {
      button.disabled = false;
    }
  });

  let requestVersion = 0;
  const status = el("workspace-message");
  const list = el("workspace-list");
  const editor = el("studio-editor");
  const logout = el("workspace-logout");

  async function refresh() {
    const version = ++requestVersion;
    list.replaceChildren();
    editor.hidden = true;
    logout.hidden = true;
    status.textContent = "작업실을 불러오는 중이에요.";
    try {
      const { items } = await request();
      if (version !== requestVersion) return;
      editor.hidden = false;
      logout.hidden = false;
      status.textContent = "";
      if (!items.length) list.textContent = "저장한 프롬프트나 초안이 없어요.";
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "row";
        const title = document.createElement("strong");
        title.textContent = item.title;
        row.append(title);
        if (item.kind === "prompt") {
          const action = document.createElement("button");
          action.type = "button";
          action.className = "outline";
          action.textContent = "복사";
          action.addEventListener("click", () => void copy(item.prompt_text));
          row.append(action);
        } else {
          const link = document.createElement("a");
          link.className = "outline";
          link.href = "/api/workspace?asset=" + encodeURIComponent(item.id);
          link.download = item.asset_name;
          link.textContent = "파일 받기";
          row.append(link);
        }
        list.append(row);
      }
    } catch (error) {
      if (version !== requestVersion) return;
      status.textContent = error.message;
      if (error.status === 401) status.append(loginLink());
    }
  }

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error();
      requestVersion++;
      list.replaceChildren();
      location.replace("/");
    } catch {
      status.textContent = "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.";
      logout.disabled = false;
    }
  });

  addEventListener("pageshow", event => {
    if (event.persisted && !el("studio-view").hidden) void refresh();
  });

  async function saveDraft({ file, title, description, skill }) {
    const body = new FormData();
    body.set("title", title);
    body.set("description", description);
    body.set("skill", skill);
    body.set("asset", file);
    await request({ method: "POST", body });
    notify("내 작업실에 비공개 초안을 저장했어요.");
    void refresh();
  }

  return { refresh, saveDraft };
}

function loginLink() {
  const link = document.createElement("a");
  link.href = "/login";
  link.textContent = " 로그인·회원가입";
  return link;
}

async function request(options) {
  const response = await fetch("/api/workspace", { cache: "no-store", ...options });
  let data;
  try { data = await response.json(); } catch { throw new Error("작업실 서버에 연결하지 못했어요."); }
  if (!response.ok) {
    const error = new Error(data.error || "작업실 서버에 연결하지 못했어요.");
    error.status = response.status;
    throw error;
  }
  return data;
}
