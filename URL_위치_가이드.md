# 🔍 Cloudflare Tunnel URL 찾는 방법

## 방법 1: start-tunnel.bat 사용 (자동 복사) ⭐

### 실행 화면

```
==================================================
  Starting tunnel and extracting URL...
==================================================

📋 Launching cloudflared tunnel...

⏳ Waiting for tunnel URL (this may take 10-15 seconds)...
.....

==================================================
  ✅ TUNNEL CREATED SUCCESSFULLY!
==================================================

📋 Your Cloudflare Tunnel URL:

    https://abc-xyz-123.trycloudflare.com     ← 여기!
                                                 (녹색 배경)

==================================================

✅ URL copied to clipboard automatically!      ← 자동 복사됨!

💾 URL also saved to: C:\Users\...\ollama-tunnel-url.txt
```

### 복사 방법
- **자동으로 클립보드에 복사됨!** → 바로 Ctrl+V 가능
- 바탕화면의 `ollama-tunnel-url.txt` 파일 열어도 됨

---

## 방법 2: start-tunnel-simple.bat 사용 (수동 복사)

### 실행 화면

```
================================================
   LOOK FOR THE URL BELOW!
   It will appear in a few seconds...
================================================

2024-12-20T10:30:15Z INF Thank you for trying Cloudflare Tunnel...
2024-12-20T10:30:16Z INF Requesting new quick Tunnel on trycloudflare.com...
2024-12-20T10:30:18Z INF +--------------------------------------------------------------------------------------------+
2024-12-20T10:30:18Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
2024-12-20T10:30:18Z INF |  https://abc-xyz-123.trycloudflare.com                                                    |  ← 여기!
2024-12-20T10:30:18Z INF +--------------------------------------------------------------------------------------------+                                                      (박스 안)
2024-12-20T10:30:18Z INF Registered tunnel connection
```

### 복사 방법
1. **마우스로 URL 드래그**
2. **마우스 우클릭** (자동으로 복사됨)
3. 또는 **드래그 후 Enter** (복사됨)

---

## 방법 3: 수동 실행

PowerShell에서:
```powershell
C:\cloudflared.exe tunnel --url http://localhost:11434
```

실행하면 위와 같이 박스 안에 URL이 표시됨.

---

## 📋 URL 형식

**정상적인 URL:**
```
https://abc-xyz-123.trycloudflare.com
https://random-words-456.trycloudflare.com
https://funny-name-789.trycloudflare.com
```

**특징:**
- 항상 `https://`로 시작
- 무작위 이름 (랜덤 단어나 문자)
- `.trycloudflare.com`으로 끝남

---

## ⚠️ 문제 해결

### URL이 안 나타나요

**원인 1: Ollama가 실행 중이 아님**
```powershell
ollama serve
```

**원인 2: 방화벽 차단**
- Windows Defender 방화벽에서 `cloudflared.exe` 허용
- 또는 방화벽 일시 비활성화

**원인 3: 인터넷 연결 문제**
- Wi-Fi/인터넷 연결 확인

### URL을 잃어버렸어요

**방법 1: 바탕화면 파일 확인**
```
바탕화면 → ollama-tunnel-url.txt 열기
```

**방법 2: 터널 재시작**
```
창 닫기 → start-tunnel.bat 다시 실행
```
(주의: URL이 바뀜!)

### URL을 복사했는데 붙여넣기가 안 돼요

**Ctrl+V로 붙여넣기:**
- Settings 탭의 입력창에서 `Ctrl+V`

**우클릭으로 붙여넣기:**
- 입력창 우클릭 → "붙여넣기"

---

## 💡 팁

### URL 자동 확인

터널이 실행 중일 때 브라우저에서 URL 접속하면:
```
https://abc-xyz-123.trycloudflare.com
```

다음 중 하나가 나타나야 정상:
- Ollama API 응답 (JSON 형식)
- "404 page not found" (Ollama가 실행 중)
- 연결 오류 (Ollama가 꺼져 있음)

### URL 고정하기

매번 URL이 바뀌는 게 싫다면:
- 영구 터널 설정 (CLOUDFLARE_SETUP.md 참조)
- 고정 URL 받기 (예: `https://ollama.yourdomain.com`)

---

**요약:**
1. `start-tunnel.bat` 실행
2. 10-15초 대기
3. 녹색 배경의 URL이 화면에 표시됨
4. 자동으로 클립보드에 복사됨
5. Ctrl+V로 붙여넣기!
