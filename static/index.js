document.addEventListener('DOMContentLoaded', () => {
    // ============================
    // State
    // ============================
    let isRunning = false;
    let fontSize = 18;
    let startTime = null;

    // ============================
    // DOM Refs
    // ============================
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const runBtn = $('#run-btn');
    const stopBtn = $('#stop-btn');
    const clearBtn = $('#clear-btn');
    const saveBtn = $('#save-btn');
    const loadBtn = $('#load-btn');
    const downloadBtn = $('#download-btn');
    const examplesBtn = $('#examples-btn');
    const examplesMenu = $('#examples-menu');
    const fullscreenBtn = $('#fullscreen-btn');
    const fsExpand = $('#fs-expand');
    const fsCompress = $('#fs-compress');
    const fontIncrease = $('#font-increase');
    const fontDecrease = $('#font-decrease');
    const fontDisplay = $('#font-size-display');
    const statusText = $('#status-text');
    const execTime = $('#exec-time');
    const cursorPos = $('#cursor-pos');
    const outputContent = $('#output-content');
    const inputArea = $('#input-area');
    const inputField = $('#input-field');
    const inputPrompt = $('#input-prompt');
    const toastEl = $('#toast');
    const resizeHandle = $('#resize-handle');
    const editorPanel = $('#editor-panel');
    const outputPanel = $('#output-panel');

    // ============================
    // CodeMirror Init
    // ============================
    const editor = CodeMirror.fromTextArea($('#python-code'), {
        mode: { name: 'python', version: 3, singleLineStringErrors: false },
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        theme: 'cobalt',
        extraKeys: {
            'Ctrl-Enter': () => runCode(),
            'Cmd-Enter': () => runCode(),
            'Ctrl-S': (cm) => { cm.save; saveCode(); return false; },
            'Cmd-S': (cm) => { cm.save; saveCode(); return false; },
            Tab: (cm) => {
                if (cm.somethingSelected()) {
                    cm.indentSelection('add');
                } else {
                    cm.replaceSelection('    ', 'end');
                }
            }
        }
    });

    editor.getWrapperElement().style.fontSize = fontSize + 'px';

    // Cursor position tracking
    editor.on('cursorActivity', () => {
        const pos = editor.getCursor();
        cursorPos.textContent = `줄 ${pos.line + 1}, 칸 ${pos.ch + 1}`;
    });

    // Load saved code
    const savedCode = localStorage.getItem('python-ide-code');
    if (savedCode) {
        editor.setValue(savedCode);
    }

    // Auto-save every 10 seconds
    setInterval(() => {
        localStorage.setItem('python-ide-autosave', editor.getValue());
    }, 10000);

    // ============================
    // Toast
    // ============================
    let toastTimeout;
    function showToast(msg) {
        clearTimeout(toastTimeout);
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2200);
    }

    // ============================
    // Status
    // ============================
    function setStatus(text, type) {
        statusText.textContent = text;
        statusText.className = type ? `status-${type}` : '';
    }

    // ============================
    // Font Size
    // ============================
    function updateFontSize() {
        fontDisplay.textContent = fontSize;
        editor.getWrapperElement().style.fontSize = fontSize + 'px';
        editor.refresh();
    }

    fontIncrease.addEventListener('click', () => {
        if (fontSize < 32) { fontSize += 1; updateFontSize(); }
    });

    fontDecrease.addEventListener('click', () => {
        if (fontSize > 10) { fontSize -= 1; updateFontSize(); }
    });

    // ============================
    // Fullscreen
    // ============================
    function updateFsIcon() {
        const isFull = !!document.fullscreenElement;
        fsExpand.style.display = isFull ? 'none' : 'block';
        fsCompress.style.display = isFull ? 'block' : 'none';
    }

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    });

    document.addEventListener('fullscreenchange', updateFsIcon);

    // ============================
    // Tab Switching
    // ============================
    $$('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.tab-panel').forEach(p => p.classList.remove('active'));
            $(`#${target}-panel`).classList.add('active');
        });
    });

    function switchTab(tabName) {
        $$('.tab-btn').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        $(`#${tabName}-panel`).classList.add('active');
    }

    // ============================
    // Examples Dropdown
    // ============================
    const EXAMPLES = {
        hello: `# Hello World!\nprint("안녕하세요!")\nprint("Python에 오신 것을 환영합니다!")`,

        input: `# 입력(input) 예제\n이름 = input("이름을 입력하세요: ")\n나이 = input("나이를 입력하세요: ")\nprint(이름 + "님, 안녕하세요!")\nprint("내년에는 " + str(int(나이) + 1) + "살이 되시네요!")`,

        loop: `# 반복문 예제\nfor i in range(1, 10):\n    for j in range(1, 10):\n        print(f"{i} x {j} = {i*j:2d}", end="  ")\n    print()`,

        function: `# 함수 예제\ndef 인사(이름, 횟수=3):\n    for i in range(횟수):\n        print(f"{i+1}번째 인사: 안녕, {이름}!")\n\n인사("파이썬")\nprint("---")\n인사("코딩", 2)`,

        list: `# 리스트 예제\n과일 = ["사과", "바나나", "체리", "딸기", "포도"]\n\nprint("== 과일 목록 ==")\nfor i, 이름 in enumerate(과일, 1):\n    print(f"  {i}. {이름}")\n\nprint(f"\\n총 {len(과일)}개의 과일이 있습니다.")\nprint(f"첫 번째: {과일[0]}")\nprint(f"마지막: {과일[-1]}")\n\n# 리스트 컴프리헨션\n긴과일 = [f for f in 과일 if len(f) >= 2]\nprint(f"\\n2글자 이상 과일: {긴과일}")`,

        turtle: `# 거북이 그래픽 - 다각형\nimport turtle\n\nt = turtle.Turtle()\nt.speed(8)\n\n색깔 = ["red", "blue", "green", "orange", "purple", "cyan"]\n\nfor i in range(6):\n    t.pencolor(색깔[i])\n    t.pensize(3)\n    변 = i + 3  # 삼각형부터 팔각형까지\n    for j in range(변):\n        t.forward(60)\n        t.left(360 / 변)\n    t.penup()\n    t.forward(80)\n    t.pendown()`,

        turtle2: `# 거북이 그래픽 - 컬러 나선\nimport turtle\n\nt = turtle.Turtle()\nt.speed(0)\n\nfor i in range(200):\n    r = i * 255 // 200\n    g = (200 - i) * 255 // 200\n    b = 128\n    t.pencolor(r / 255.0, g / 255.0, b / 255.0)\n    t.pensize(max(1, i // 40))\n    t.forward(i * 0.8)\n    t.left(59)`,

        game: `# 숫자 맞추기 게임\nimport random\n\nprint("=== 숫자 맞추기 게임 ===")\nprint("1부터 20 사이의 숫자를 맞춰보세요!\\n")\n\n정답 = random.randint(1, 20)\n시도 = 0\n\nwhile True:\n    시도 += 1\n    추측 = int(input(f"[{시도}번째 시도] 숫자를 입력하세요: "))\n    \n    if 추측 < 정답:\n        print("  ↑ 더 큰 숫자입니다!")\n    elif 추측 > 정답:\n        print("  ↓ 더 작은 숫자입니다!")\n    else:\n        print(f"\\n🎉 정답! {시도}번 만에 맞추셨습니다!")\n        break`
    };

    examplesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        examplesMenu.classList.toggle('show');
    });

    examplesMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        const key = item.dataset.example;
        if (EXAMPLES[key]) {
            editor.setValue(EXAMPLES[key]);
            editor.focus();
            examplesMenu.classList.remove('show');

            // Auto-switch tab for turtle examples
            if (key === 'turtle' || key === 'turtle2') {
                switchTab('turtle');
            } else {
                switchTab('console');
            }

            showToast('예제를 불러왔습니다');
        }
    });

    document.addEventListener('click', () => {
        examplesMenu.classList.remove('show');
    });

    // ============================
    // Save / Load / Download
    // ============================
    saveBtn.addEventListener('click', saveCode);
    loadBtn.addEventListener('click', loadCode);
    downloadBtn.addEventListener('click', downloadCode);

    function saveCode() {
        localStorage.setItem('python-ide-code', editor.getValue());
        showToast('💾 코드가 저장되었습니다');
    }

    function loadCode() {
        const code = localStorage.getItem('python-ide-code');
        if (code) {
            editor.setValue(code);
            showToast('📂 저장된 코드를 불러왔습니다');
        } else {
            showToast('저장된 코드가 없습니다');
        }
    }

    function downloadCode() {
        const code = editor.getValue();
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'code.py';
        a.click();
        URL.revokeObjectURL(url);
        showToast('📥 파일을 다운로드했습니다');
    }

    // ============================
    // Clear Output
    // ============================
    clearBtn.addEventListener('click', () => {
        outputContent.innerHTML = '';
        inputArea.style.display = 'none';
    });

    // ============================
    // Python Execution
    // ============================
    function appendOutput(text, className) {
        const span = document.createElement('span');
        span.className = className || '';
        span.textContent = text;
        outputContent.appendChild(span);
        // Auto-scroll
        const panel = $('#console-panel');
        panel.scrollTop = panel.scrollHeight;
    }

    function formatError(err) {
        const errStr = err.toString();

        // Try to extract useful info
        const patterns = [
            { regex: /SyntaxError:.*line (\d+)/, msg: (m) => `❌ 문법 오류 (${m[1]}번째 줄): 코드를 다시 확인해보세요` },
            { regex: /NameError: name '(.+?)' is not defined/, msg: (m) => `❌ 이름 오류: '${m[1]}'이(가) 정의되지 않았습니다` },
            { regex: /TypeError: (.+)/, msg: (m) => `❌ 타입 오류: ${m[1]}` },
            { regex: /IndexError: (.+)/, msg: (m) => `❌ 인덱스 오류: ${m[1]}` },
            { regex: /ValueError: (.+)/, msg: (m) => `❌ 값 오류: ${m[1]}` },
            { regex: /ZeroDivisionError/, msg: () => `❌ 0으로 나눌 수 없습니다` },
            { regex: /IndentationError:.*line (\d+)/, msg: (m) => `❌ 들여쓰기 오류 (${m[1]}번째 줄): 들여쓰기를 확인해보세요` },
            { regex: /TimeLimitError|time limit/, msg: () => `⏱️ 실행 시간이 초과되었습니다 (60초 제한)` },
        ];

        for (const p of patterns) {
            const match = errStr.match(p.regex);
            if (match) {
                return p.msg(match) + '\n\n' + errStr;
            }
        }

        return '❌ 오류 발생:\n' + errStr;
    }

    function runCode() {
        if (isRunning) return;

        const code = editor.getValue();
        if (!code.trim()) {
            showToast('실행할 코드가 없습니다');
            return;
        }

        // UI state
        isRunning = true;
        startTime = performance.now();
        runBtn.classList.add('running');
        runBtn.querySelector('.play-icon').style.display = 'none';
        stopBtn.disabled = false;
        setStatus('실행 중...', 'running');
        execTime.textContent = '';

        // Clear output
        outputContent.innerHTML = '';
        inputArea.style.display = 'none';

        // Switch to console tab (or turtle if turtle code)
        const hasTurtle = /import\s+turtle|from\s+turtle\s+import/.test(code);
        switchTab(hasTurtle ? 'turtle' : 'console');

        // Configure Skulpt
        Sk.execLimit = 60 * 1000;

        Sk.configure({
            output: function(text) {
                appendOutput(text);
            },
            read: function(filename) {
                if (Sk.builtinFiles === undefined || Sk.builtinFiles['files'][filename] === undefined) {
                    throw "File not found: '" + filename + "'";
                }
                return Sk.builtinFiles['files'][filename];
            },
            inputfun: function(promptText) {
                return new Promise((resolve) => {
                    // Show in console tab for input
                    switchTab('console');

                    if (promptText) {
                        appendOutput(promptText);
                    }

                    inputArea.style.display = 'flex';
                    inputPrompt.textContent = '▸ ';
                    inputField.value = '';
                    inputField.focus();

                    function onSubmit(e) {
                        if (e.key === 'Enter') {
                            const val = inputField.value;
                            inputField.removeEventListener('keydown', onSubmit);
                            inputArea.style.display = 'none';
                            appendOutput(val + '\n', 'input-echo');
                            resolve(val);
                        }
                    }

                    inputField.addEventListener('keydown', onSubmit);
                });
            },
            inputfunTakesPrompt: true,
        });

        (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'turtle';

        Sk.misceval.asyncToPromise(function() {
            return Sk.importMainWithBody('<stdin>', false, code, true);
        }).then(function() {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            appendOutput('\n', 'info-line');
            appendOutput(`✅ 실행 완료 (${elapsed}초)`, 'info-line');
            setStatus('실행 완료', 'done');
            execTime.textContent = `${elapsed}초`;
            finishRun();
        }).catch(function(err) {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            switchTab('console');
            appendOutput('\n');
            appendOutput(formatError(err), 'error-line');
            setStatus('오류 발생', 'error');
            execTime.textContent = `${elapsed}초`;
            finishRun();
        });
    }

    function finishRun() {
        isRunning = false;
        runBtn.classList.remove('running');
        runBtn.querySelector('.play-icon').style.display = '';
        stopBtn.disabled = true;
        inputArea.style.display = 'none';
    }

    function stopCode() {
        if (!isRunning) return;
        Sk.execLimit = 0;
        appendOutput('\n⛔ 실행이 중지되었습니다\n', 'info-line');
        setStatus('중지됨', '');
        finishRun();
    }

    runBtn.addEventListener('click', runCode);
    stopBtn.addEventListener('click', stopCode);

    // ============================
    // Keyboard Shortcuts
    // ============================
    document.addEventListener('keydown', (e) => {
        // Escape to stop
        if (e.key === 'Escape' && isRunning) {
            stopCode();
        }
        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCode();
        }
    });

    // ============================
    // Resize Handle
    // ============================
    let isResizing = false;
    const isMobile = () => window.innerWidth <= 800;

    resizeHandle.addEventListener('mousedown', startResize);
    resizeHandle.addEventListener('touchstart', startResize, { passive: false });

    function startResize(e) {
        e.preventDefault();
        isResizing = true;
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = isMobile() ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', doResize);
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
    }

    function doResize(e) {
        if (!isResizing) return;
        e.preventDefault();

        const touch = e.touches ? e.touches[0] : e;
        const body = document.querySelector('.ide-body');
        const rect = body.getBoundingClientRect();

        if (isMobile()) {
            const y = touch.clientY - rect.top;
            const pct = (y / rect.height) * 100;
            const clamped = Math.max(20, Math.min(80, pct));
            editorPanel.style.flex = `0 0 ${clamped}%`;
            outputPanel.style.flex = `0 0 ${100 - clamped}%`;
        } else {
            const x = touch.clientX - rect.left;
            const pct = (x / rect.width) * 100;
            const clamped = Math.max(20, Math.min(80, pct));
            editorPanel.style.flex = `0 0 ${clamped}%`;
            outputPanel.style.flex = `0 0 ${100 - clamped}%`;
        }

        editor.refresh();
    }

    function stopResize() {
        isResizing = false;
        resizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
    }

    // ============================
    // Init
    // ============================
    setStatus('준비', '');
    editor.focus();
});
