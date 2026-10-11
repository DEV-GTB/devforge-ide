import { FileNode, flattenFiles } from './filesystem';

export interface LocalAssistantResult {
  text: string;
  file?: { path: string; code: string; language: string };
}

function languageForPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (extension === 'tsx' || extension === 'ts') return 'typescript';
  if (extension === 'jsx' || extension === 'js') return 'javascript';
  if (extension === 'css') return 'css';
  if (extension === 'json') return 'json';
  if (extension === 'md') return 'markdown';
  return extension || 'text';
}

function starterContent(filePath: string): string {
  const name = filePath.split('/').pop() || 'NewFile';
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'html') {
    return '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My page</title>\n</head>\n<body>\n  <main>\n    <h1>Hello, world!</h1>\n  </main>\n</body>\n</html>\n';
  }
  if (extension === 'tsx' || extension === 'jsx') {
    const component = name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_$]/g, '') || 'Component';
    return `export default function ${component}() {\n  return (\n    <main>\n      <h1>${component}</h1>\n    </main>\n  );\n}\n`;
  }
  if (extension === 'json') return '{}\n';
  if (extension === 'css') return '/* Add your styles here */\n';
  if (extension === 'js' || extension === 'ts') return `// ${name}\n\n`;
  if (extension === 'md') return `# ${name.replace(/\.[^.]+$/, '')}\n\n`;
  return '';
}

function createAppPage(prompt: string): string {
  const title = prompt
    .replace(/\b(create|make|build|generate|design|a|an|me|please|for me)\b/gi, ' ')
    .replace(/\b(website|web app|app|game|page|application|interactive|to[- ]?do|task list)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'My new project';
  const displayTitle = /\b(to[- ]?do|task list)\b/i.test(prompt)
    ? 'My Tasks'
    : /\b(game|clicker|reaction)\b/i.test(prompt)
      ? 'Quick Game'
      : title;
  const safeTitle = displayTitle.replace(/[&<>"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[character] || character);

  if (/\b(to[- ]?do|task list|tasks)\b/i.test(prompt)) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:48px 20px;background:linear-gradient(135deg,#101827,#26365b);color:#eef2ff;font:16px system-ui,sans-serif}
    main{width:min(560px,100%);margin:auto;padding:32px;border:1px solid #ffffff26;border-radius:24px;background:#121a2de8;box-shadow:0 24px 80px #0005}
    h1{margin:0 0 8px;font-size:clamp(28px,6vw,42px)}p{color:#aebbd4}.add{display:flex;gap:10px;margin:24px 0}
    input{min-width:0;flex:1;padding:13px 14px;border:1px solid #ffffff30;border-radius:12px;background:#0b1220;color:white;font:inherit}
    button{padding:12px 16px;border:0;border-radius:12px;background:#7189ff;color:white;font:inherit;font-weight:700;cursor:pointer}
    ul{display:grid;gap:10px;padding:0;list-style:none}.task{display:flex;align-items:center;gap:12px;padding:13px;background:#ffffff0c;border:1px solid #ffffff17;border-radius:12px}
    .task span{flex:1;overflow-wrap:anywhere}.task.done span{text-decoration:line-through;color:#8793ab}.remove{padding:6px 10px;background:#ffffff12}
  </style>
</head>
<body><main><h1>${safeTitle}</h1><p>Your tasks stay saved in this browser.</p>
  <form class="add" id="form"><input id="entry" placeholder="Add a task…" aria-label="New task" required><button>Add</button></form>
  <ul id="tasks"></ul>
</main>
<script>
  const key='local-tasks-v1', list=document.querySelector('#tasks'), form=document.querySelector('#form'), input=document.querySelector('#entry');
  let tasks=[];try{tasks=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  function render(){list.replaceChildren();tasks.forEach((task,index)=>{const row=document.createElement('li');row.className='task'+(task.done?' done':'');const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=task.done;toggle.setAttribute('aria-label','Mark task complete');toggle.onchange=()=>{tasks[index].done=toggle.checked;save()};const text=document.createElement('span');text.textContent=task.text;const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='Delete';remove.onclick=()=>{tasks.splice(index,1);save()};row.append(toggle,text,remove);list.append(row)})}
  function save(){try{localStorage.setItem(key,JSON.stringify(tasks))}catch{}render()}
  form.onsubmit=event=>{event.preventDefault();const text=input.value.trim();if(text){tasks.push({text,done:false});input.value='';save()}};render();
</script></body></html>`;
  }

  if (/\b(game|clicker|reaction)\b/i.test(prompt)) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at top,#312e81,#090b18 65%);color:#f8fafc;font:16px system-ui,sans-serif}
    main{width:min(620px,100%);padding:30px;text-align:center;border:1px solid #ffffff2b;border-radius:24px;background:#111426d9;box-shadow:0 25px 90px #0008}
    h1{margin:0;font-size:clamp(28px,6vw,44px)}p{color:#b5bdd4}.stats{display:flex;justify-content:center;gap:30px;margin:22px}.stats strong{display:block;font-size:28px;color:#a5b4fc}
    #arena{position:relative;height:260px;overflow:hidden;border:1px solid #ffffff26;border-radius:18px;background:linear-gradient(145deg,#171d38,#0c1021)}
    #target{position:absolute;width:58px;height:58px;border:0;border-radius:50%;background:linear-gradient(135deg,#f0abfc,#818cf8);box-shadow:0 0 30px #a78bfa99;cursor:pointer}
    button#start{margin-top:18px;padding:12px 20px;border:0;border-radius:12px;background:#6366f1;color:white;font:inherit;font-weight:700;cursor:pointer}
  </style>
</head>
<body><main><h1>${safeTitle}</h1><p>Hit the glowing target before time runs out.</p>
  <div class="stats"><div>Score<strong id="score">0</strong></div><div>Time<strong id="time">20</strong></div></div>
  <div id="arena"><button id="target" aria-label="Hit target" hidden></button></div><button id="start">Start game</button>
</main>
<script>
  const arena=document.querySelector('#arena'),target=document.querySelector('#target'),scoreNode=document.querySelector('#score'),timeNode=document.querySelector('#time'),start=document.querySelector('#start');let score=0,timer;
  function move(){const maxX=arena.clientWidth-target.offsetWidth,maxY=arena.clientHeight-target.offsetHeight;target.style.left=Math.random()*Math.max(0,maxX)+'px';target.style.top=Math.random()*Math.max(0,maxY)+'px'}
  target.onclick=()=>{score++;scoreNode.textContent=score;move()};
  start.onclick=()=>{clearInterval(timer);score=0;let remaining=20;scoreNode.textContent=score;timeNode.textContent=remaining;target.hidden=false;start.disabled=true;move();timer=setInterval(()=>{remaining--;timeNode.textContent=remaining;if(remaining<=0){clearInterval(timer);target.hidden=true;start.disabled=false;start.textContent='Play again' }},1000)};
</script></body></html>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0a1020;color:#eef2ff;font:16px/1.6 system-ui,sans-serif}
    .glow{position:fixed;inset:-30%;background:radial-gradient(ellipse at 72% 20%,#5b5bd255,transparent 45%),radial-gradient(ellipse at 20% 80%,#0e749055,transparent 42%);pointer-events:none}
    main{position:relative;max-width:1000px;margin:auto;padding:8vh 24px}.nav{display:flex;justify-content:space-between;align-items:center;color:#cbd5e1}
    .brand{font-weight:800;letter-spacing:.08em}.pill{padding:8px 12px;border:1px solid #ffffff30;border-radius:999px;font-size:13px}
    section{padding:13vh 0 10vh;max-width:740px}.eyebrow{color:#a5b4fc;text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:700}
    h1{margin:18px 0;font-size:clamp(44px,9vw,88px);line-height:1.02;letter-spacing:-.06em}section p{max-width:580px;color:#aab6d0;font-size:18px}
    .actions{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap}.actions button{padding:13px 18px;border:1px solid #ffffff28;border-radius:12px;background:#ffffff10;color:white;font:inherit;cursor:pointer}
    .actions button:first-child{background:#6366f1;border-color:#818cf8}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
    article{padding:20px;border:1px solid #ffffff1c;border-radius:16px;background:#ffffff09}article h2{font-size:16px}article p{color:#aab6d0;font-size:14px}
  </style>
</head>
<body><div class="glow"></div><main><nav class="nav"><span class="brand">${safeTitle.toUpperCase()}</span><span class="pill">Made with Nexus AI · local</span></nav>
  <section><div class="eyebrow">A fresh start</div><h1>${safeTitle}</h1><p>A responsive starting point you can customize. Edit this file in the Studio and watch your changes come to life.</p>
    <div class="actions"><button id="action">Get started</button><button onclick="document.querySelector('#details').scrollIntoView({behavior:'smooth'})">Explore</button></div>
  </section>
  <div class="cards" id="details"><article><h2>Designed for you</h2><p>Change the content, colors, and layout to match your idea.</p></article><article><h2>Works on every screen</h2><p>A responsive layout that adapts from phones to desktops.</p></article><article><h2>Ready to edit</h2><p>Everything lives in this file, so you can start building immediately.</p></article></div>
</main><script>document.querySelector('#action').onclick=()=>alert('Your project is ready to customize!');</script></body></html>`;
}

export function answerLocally(
  prompt: string,
  activeFile: FileNode | null,
  files: FileNode[]
): LocalAssistantResult {
  const trimmed = prompt.trim();
  const codeMatch = trimmed.match(/```([a-zA-Z0-9_-]*)\s*(?:filename=["']?([^"'\s]+)["']?)?\n([\s\S]*?)```/);
  const explicitPathMatch = trimmed.match(/\b(?:create|make|add|generate|new)\b[^\n]*?([\w./-]+\.(?:html|css|tsx?|jsx?|json|md|svg))\b/i);
  const appRequest = /\b(website|web app|app|to[- ]?do|task list|game|clicker|landing page|portfolio|application)\b/i.test(trimmed);
  const asksToCreate = /\b(create|make|build|generate|new|add)\b/i.test(trimmed);

  if (codeMatch?.[3] && asksToCreate) {
    const filePath = (codeMatch[2] || activeFile?.path || 'new-file.txt').replace(/^\.\//, '');
    return {
      text: `I prepared the code you provided for \`${filePath}\`. Review it, then apply it to your local workspace.`,
      file: { path: filePath, code: codeMatch[3].trim(), language: codeMatch[1] || languageForPath(filePath) }
    };
  }

  if (asksToCreate && (explicitPathMatch || appRequest || /\b(file|component|page|document)\b/i.test(trimmed))) {
    const filePath = appRequest && !explicitPathMatch
      ? 'index.html'
      : (explicitPathMatch?.[1] || 'untitled.txt').replace(/^\.\//, '');
    if (filePath.split('/').some((part) => part === '..') || filePath.startsWith('/')) {
      return { text: 'Use a workspace-relative file path; paths outside the workspace are not allowed.' };
    }
    const code = appRequest && filePath.endsWith('.html')
      ? createAppPage(trimmed)
      : starterContent(filePath);
    return {
      text: `Created a local starter for \`${filePath}\`. This runs entirely in your browser with no API request or usage charge. Apply it to add it to this workspace; you can continue editing it yourself.`,
      file: { path: filePath, code, language: languageForPath(filePath) }
    };
  }

  const listedFiles = flattenFiles(files);
  if (/\b(explain|what files|workspace|project|list files)\b/i.test(trimmed)) {
    return {
      text: listedFiles.length
        ? `This workspace currently contains ${listedFiles.length} file${listedFiles.length === 1 ? '' : 's'}: ${listedFiles.map((file) => `\`${file.path}\``).join(', ')}. The open file is ${activeFile ? `\`${activeFile.path}\`` : 'none'}. I can create starter files locally, or you can use New File/New Folder in the Explorer.`
        : 'This workspace is empty by design. Use New File or New Folder in the Explorer, or ask Nexus AI to create a file, website, to-do app, or simple game. Your work is stored in this browser.',
    };
  }

  return {
    text: 'I am running in no-cost local mode: no paid AI service or network request is used. I can scaffold a file or a small standalone website, to-do app, or click game from templates. For general open-ended code reasoning, this local helper is limited; use the editor directly or configure a separate AI service if you choose.'
  };
}
