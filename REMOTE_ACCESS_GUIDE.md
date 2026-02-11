# 원격 접속 설정 가이드

이 가이드는 **작업용 컴퓨터**에서 **집 컴퓨터의 Ollama**에 접속하여 Research Assistant를 사용하는 방법을 설명합니다.

---

## 📋 개요

### 필요한 것
- **집 컴퓨터**: Ollama가 설치되어 있고 항상 켜져 있어야 함
- **작업 컴퓨터**: 브라우저만 있으면 됨
- **Tailscale**: 두 컴퓨터를 연결하는 개인 VPN (무료)

### 작동 원리
```
작업 컴퓨터 (브라우저)
    ↓
Tailscale VPN (암호화된 터널)
    ↓
집 컴퓨터 (Ollama)
```

---

## 1️⃣ Tailscale 설치

### 집 컴퓨터와 작업 컴퓨터 모두 설치

1. [https://tailscale.com/download](https://tailscale.com/download) 접속
2. Windows용 설치 파일 다운로드
3. 설치 후 실행
4. **같은 계정으로 로그인** (Google/Microsoft 계정 사용 가능)

### 설치 확인

- 트레이에 Tailscale 아이콘이 나타남
- 두 컴퓨터가 모두 "Connected" 상태여야 함

---

## 2️⃣ 집 컴퓨터 설정

### Step 1: Tailscale IP 확인

#### 방법 1: 트레이 아이콘 사용
1. Tailscale 트레이 아이콘 우클릭
2. "Copy my IP address" 클릭
3. 클립보드에 복사됨 (예: `100.x.x.x`)

#### 방법 2: PowerShell 사용
```powershell
tailscale ip -4
```

출력 예시:
```
100.123.45.67
```

이 IP를 **메모**해두세요!

---

### Step 2: Ollama CORS 설정

Ollama가 Tailscale IP와 GitHub Pages에서의 요청을 허용하도록 설정합니다.

#### PowerShell (관리자 권한)에서 실행:

```powershell
[System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', 'http://localhost:*,http://100.*.*.*:*,https://*.github.io', 'Machine')
```

#### Ollama 재시작:

```powershell
# Ollama 프로세스 종료
taskkill /F /IM ollama.exe

# Ollama 재시작
ollama serve
```

#### 설정 확인:

새 PowerShell 창에서:
```powershell
[System.Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS', 'Machine')
```

출력:
```
http://localhost:*,http://100.*.*.*:*,https://*.github.io
```

---

### Step 3: 방화벽 설정 (선택적)

만약 연결이 안 되면 Windows 방화벽에서 포트 11434를 허용해야 할 수 있습니다.

#### PowerShell (관리자 권한):

```powershell
New-NetFirewallRule -DisplayName "Ollama Tailscale" -Direction Inbound -Protocol TCP -LocalPort 11434 -Action Allow
```

---

## 3️⃣ 작업 컴퓨터 설정

### Step 1: Research Assistant 접속

1. 브라우저에서 홈페이지 열기
   - 로컬: `http://localhost:5173?research=true`
   - GitHub Pages: `https://yourusername.github.io/homepage?research=true`

2. 로그인

### Step 2: Settings 탭에서 Ollama URL 설정

1. **Settings (⚙️ Settings)** 탭 클릭

2. **Ollama URL 입력**:
   ```
   http://100.x.x.x:11434
   ```
   (집 컴퓨터의 Tailscale IP 사용)

3. **"저장"** 버튼 클릭

4. **"연결 테스트"** 버튼 클릭

   - 성공 시: `✅ 연결 성공! (N개 모델 발견)`
   - 실패 시: CORS 설정과 Ollama 실행 상태 확인

---

## 4️⃣ 사용하기

이제 Translation, Papers, Related Work 등 모든 기능을 작업 컴퓨터에서 사용할 수 있습니다!

### 테스트 방법

1. **Translation 탭**으로 이동
2. 한글 텍스트 입력
3. "실시간 번역" 버튼 클릭
4. 영어 번역이 스트리밍으로 표시되면 성공!

---

## 🔧 문제 해결

### ❌ "연결 실패: Failed to fetch"

**원인 1: Ollama가 실행 중이 아님**
- 집 컴퓨터에서 `ollama serve` 실행

**원인 2: CORS 설정 미적용**
- PowerShell에서 환경 변수 확인
- Ollama 재시작 확인

**원인 3: 방화벽 차단**
- 방화벽 규칙 추가 (위 Step 3 참조)

**원인 4: Tailscale 미연결**
- 두 컴퓨터 모두 Tailscale이 "Connected" 상태인지 확인

---

### ❌ "연결 실패: HTTP 404"

**원인: Ollama API 경로 오류**
- URL이 정확한지 확인: `http://100.x.x.x:11434` (끝에 슬래시 없음)

---

### ❌ "연결 성공했는데 번역이 안 됨"

**원인: 모델 미설치**
- 집 컴퓨터에서 모델 설치 확인:
  ```powershell
  ollama list
  ```
- 필요한 모델 설치:
  ```powershell
  ollama pull qwen2.5:14b
  ollama pull deepseek-r1:14b
  ```

---

## 💡 유용한 팁

### 1. 자동 시작 설정

**집 컴퓨터에서 Ollama 자동 시작:**

Windows에서 Ollama는 보통 자동으로 시작됩니다. 확인:
- `작업 관리자` → `시작 프로그램` → Ollama가 활성화되어 있는지 확인

### 2. WakeOnLAN 설정 (선택적)

집 컴퓨터를 원격으로 켤 수 있도록 설정:
1. BIOS에서 WakeOnLAN 활성화
2. Tailscale과 함께 WOL 도구 사용

### 3. GitHub Pages 배포

로컬 개발 환경 없이 어디서나 접속하려면:
1. GitHub Pages에 배포
2. `https://yourusername.github.io/homepage?research=true` 접속
3. Settings에서 Tailscale IP 입력

### 4. 모바일에서도 사용 가능

Tailscale 모바일 앱 설치 후:
- iOS: App Store에서 "Tailscale" 검색
- Android: Play Store에서 "Tailscale" 검색

모바일 브라우저에서 `http://100.x.x.x:5173?research=true` 접속

---

## 📊 비용

**완전 무료!**
- Tailscale: 개인 사용자는 무료 (최대 100대 장치)
- Ollama: 로컬 실행이므로 무료
- Firebase: 무료 플랜으로 충분

---

## 🔒 보안

### Tailscale은 안전한가요?

**예**, 매우 안전합니다:
- End-to-end 암호화 (WireGuard 프로토콜)
- Zero Trust 네트워크 아키텍처
- 외부에서 접근 불가 (NAT traversal)
- 오픈 소스 클라이언트

### 추가 보안 팁

1. **Ollama는 Tailscale IP만 허용**:
   - 환경 변수에서 `http://100.*.*.*:*`만 허용
   - 외부 인터넷에서는 접근 불가

2. **Firebase Authentication**:
   - 본인 이메일만 등록
   - 다른 사람은 로그인 불가

3. **방화벽 규칙**:
   - 포트 11434는 Tailscale IP에서만 허용

---

## 📝 요약

### 일회성 설정 (한 번만)

1. **두 컴퓨터 모두**: Tailscale 설치 및 로그인
2. **집 컴퓨터**: Ollama CORS 설정
3. **집 컴퓨터**: Tailscale IP 확인

### 매번 사용 시

1. **작업 컴퓨터**: 브라우저에서 Research Assistant 접속
2. **작업 컴퓨터**: (최초 1회) Settings에서 Tailscale IP 설정
3. 모든 기능 사용 가능!

---

## ❓ 추가 질문

문제가 발생하면:
1. Settings 탭의 "연결 테스트" 버튼으로 진단
2. 브라우저 콘솔 (F12) 확인
3. 집 컴퓨터에서 `ollama serve` 로그 확인

---

**Happy researching! 🎉**
