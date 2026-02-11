# 🚀 Research Assistant - Quick Start

## 집 컴퓨터에서 (한 번만)

### 방법 1: 자동 스크립트 (추천)
```
1. start-tunnel.bat 더블클릭
2. 10-15초 대기
3. URL이 자동으로 화면에 표시되고 클립보드에 복사됨!
4. 바탕화면의 ollama-tunnel-url.txt 파일에도 저장됨
5. 창 닫지 말고 두기
```

### 방법 2: 간단 버전
```
1. start-tunnel-simple.bat 더블클릭
2. 검은 창에서 URL 찾기 (녹색 박스 안)
3. URL 복사 (드래그 후 Enter)
4. 창 닫지 말고 두기
```

**URL 예시:**
```
https://abc-xyz-123.trycloudflare.com
         ↑ 이런 형식!
```

---

## 학교/작업 컴퓨터에서

```
1. https://yourusername.github.io/homepage?research=true
2. Settings 탭
3. Cloudflare URL 입력
4. 저장 → 연결 테스트
5. 사용!
```

---

## 매번 사용 시

**집:** `start-tunnel.bat` 실행
**학교:** 브라우저로 접속

---

## 문제 발생 시

**연결 안 됨:**
```powershell
# Ollama 재시작
taskkill /F /IM ollama.exe
ollama serve

# 터널 재시작
C:\cloudflared.exe tunnel --url http://localhost:11434
```

**URL 찾기:**
- cloudflared 창에서 `https://` 로 시작하는 URL 찾기

---

## 📞 자주 쓰는 명령어

| 명령 | 용도 |
|------|------|
| `start-tunnel.bat` | 터널 시작 (자동) |
| `ollama serve` | Ollama 시작 |
| `ollama list` | 설치된 모델 확인 |

---

## 파일 위치

- **스크립트**: `setup-cloudflare-tunnel.ps1`
- **실행파일**: `C:\cloudflared.exe`
- **상세 가이드**: `CLOUDFLARE_SETUP.md`

---

**That's it! 즐거운 연구 되세요! 🎓**
