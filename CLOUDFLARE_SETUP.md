# Cloudflare Tunnel 설정 - 간단 가이드 ☁️

**학교/작업 컴퓨터에는 아무것도 설치하지 않고 사용하기!**

---

## 🎯 한 줄 요약

집 컴퓨터에서 **5분 설정** → 학교 컴퓨터에서 **브라우저로 바로 사용**

---

## 📦 집 컴퓨터 설정 (일회성)

### 자동 스크립트 사용 (추천)

1. **PowerShell을 관리자 권한으로 실행**
   - Windows 검색 → "PowerShell" → 우클릭 → "관리자 권한으로 실행"

2. **스크립트 실행**
   ```powershell
   cd C:\Users\신지훈\Desktop\homepage
   .\setup-cloudflare-tunnel.ps1
   ```

3. **URL 복사**
   - 새 창에 표시되는 URL 복사
   - 예시: `https://abc-xyz-123.trycloudflare.com`
   - 📋 **이 URL을 어딘가에 저장해두세요!**

4. **완료!**
   - 창을 닫지 마세요 (터널이 실행 중)
   - 집 컴퓨터를 켜두세요

---

## 💻 학교/작업 컴퓨터에서 사용

### 설치 불필요! 브라우저만 사용

1. **GitHub Pages 접속**
   ```
   https://yourusername.github.io/homepage?research=true
   ```
   (또는 로컬에서 개발 중이면 로컬 주소)

2. **로그인**

3. **⚙️ Settings 탭 클릭**

4. **Ollama URL 입력**
   - 집 컴퓨터에서 복사한 Cloudflare URL 붙여넣기
   - 예: `https://abc-xyz-123.trycloudflare.com`

5. **저장 → 연결 테스트**
   - "✅ 연결 성공!" 메시지 확인

6. **사용!**
   - Translation, Papers, Related Work 모든 기능 사용 가능
   - 마치 집에서 쓰는 것처럼!

---

## 🔄 매번 사용할 때

### 집 컴퓨터

**Quick Tunnel 재시작 (URL 변경됨):**
```powershell
C:\cloudflared.exe tunnel --url http://localhost:11434
```

새 URL이 나타나면 학교 컴퓨터의 Settings에서 업데이트

### 학교 컴퓨터

1. 브라우저에서 페이지 접속
2. 새 URL로 업데이트 (변경된 경우)
3. 사용!

---

## 💡 영구 URL 만들기 (선택적)

매번 URL이 바뀌는 게 귀찮다면:

### 1. Cloudflare 로그인

```powershell
C:\cloudflared.exe tunnel login
```
- 브라우저가 자동으로 열림
- Cloudflare 계정으로 로그인 (무료)

### 2. 영구 터널 생성

```powershell
C:\cloudflared.exe tunnel create ollama-tunnel
```

### 3. DNS 설정

Cloudflare 대시보드에서:
- 도메인이 있다면: 서브도메인 설정 (예: `ollama.yourdomain.com`)
- 없다면: Quick Tunnel 계속 사용

### 4. 설정 파일 생성

`C:\Users\신지훈\.cloudflared\config.yml`:
```yaml
tunnel: <터널ID>
credentials-file: C:\Users\신지훈\.cloudflared\<터널ID>.json

ingress:
  - hostname: ollama.yourdomain.com
    service: http://localhost:11434
  - service: http_status:404
```

### 5. DNS 라우팅

```powershell
C:\cloudflared.exe tunnel route dns ollama-tunnel ollama.yourdomain.com
```

### 6. 터널 실행

```powershell
C:\cloudflared.exe tunnel run ollama-tunnel
```

이제 `https://ollama.yourdomain.com`으로 항상 접속 가능!

---

## 🛠️ 문제 해결

### ❌ "연결 실패"

**집 컴퓨터 확인:**
1. cloudflared 터널이 실행 중인가?
2. Ollama가 실행 중인가? (`ollama serve`)
3. CORS 설정이 되어 있나?

**CORS 재설정:**
```powershell
[System.Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', 'https://*.trycloudflare.com,https://*.github.io', 'Machine')
taskkill /F /IM ollama.exe
ollama serve
```

### ❌ "URL이 안 나와요"

**방화벽 확인:**
- Windows Defender 방화벽에서 `cloudflared.exe` 허용
- 또는 일시적으로 방화벽 비활성화하여 테스트

### ❌ "매번 URL이 바뀌어요"

**해결책:**
1. 영구 터널 설정 (위 참조)
2. 또는 `setup-cloudflare-tunnel.ps1`을 시작 프로그램으로 등록

---

## 📊 비교: Quick Tunnel vs 영구 Tunnel

| 특징 | Quick Tunnel | 영구 Tunnel |
|------|--------------|-------------|
| 설정 시간 | 1분 | 10분 |
| URL 고정 | ❌ (재시작마다 변경) | ✅ (항상 동일) |
| Cloudflare 계정 | 불필요 | 필요 (무료) |
| 추천 대상 | 테스트/임시 사용 | 장기 사용 |

---

## ✨ 장점 요약

✅ **학교 컴퓨터에 설치 불필요** (브라우저만!)
✅ **HTTPS 자동 제공** (안전)
✅ **학교 방화벽 우회** (표준 HTTPS 포트)
✅ **무료**
✅ **빠름** (Cloudflare CDN)
✅ **어디서나 접속** (인터넷만 있으면)

---

## 🎓 학교에서 사용 시 주의사항

- 학교 네트워크 정책을 확인하세요
- 개인 학습/연구 목적으로만 사용
- VPN 차단 정책이 있어도 Cloudflare Tunnel은 표준 HTTPS라 대부분 작동
- 데이터는 암호화되어 전송됨 (안전)

---

**Happy researching from anywhere! 🚀**
