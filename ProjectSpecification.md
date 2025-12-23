# Project Specification: Milo Web Interaction (Polyart Ver.)

**Project Name:** Milo Web Interaction (Three.js Porting)  
**Date:** 2025-12-16  
**Asset:** Milo the Cat - Polyart (Unity Asset Store ID: 343080)  
**Target:** Local (Antogravity) / Web Browser  
**Author:** Gemini (Assisted by User)

---

## 1. 개요 (Overview)
본 문서는 Unity Asset Store의 **"Milo the Cat - Polyart"** 에셋을 활용하여, 웹 브라우저 상에서 동작하는 경량화된 3D 인터랙티브 데모를 구현하기 위한 기술 명세서입니다.

* **변경 사항:** "Polyart" 버전을 사용하여 복잡한 쉐이더 제거 공정(Blender Cleaning)을 생략하고, 즉시 웹 표준 포맷(.glb)으로 변환하여 개발 효율을 극대화함.
* **핵심 목표:** **초고속 로딩(1MB 내외)** + **리얼한 고양이 모션** + **Three.js 웹 구동**.

---

## 2. 개발 환경 (Tech Stack)

* **Asset Pipeline:**
    * **Source:** Unity (Milo the Cat - Polyart)
    * **Conversion:** Unity FBX Exporter -> Blender (단순 포맷 변환용)
* **Web Engine:** Three.js (r150+), Vite
* **Deployment:** Antogravity (Local Environment)

---

## 3. 상세 작업 지시 (Tasks)

### Phase 1: 자산 추출 (Asset Preparation) - *대폭 간소화됨*
**목표:** Unity 에셋을 Three.js용 .glb 파일로 변환

- [ ] **Unity Export**
    - `Milo Polyart` 프리팹을 Scene에 배치.
    - `FBX Exporter` 패키지를 사용하여 Mesh와 Animation Clip을 `.fbx`로 추출.
    - **추출 목록:** `Mesh(Body)`, `Animations(Idle, Walk, Run, Turn 등)`
    - *Tip: Polyart 버전은 재질이 단순하므로 텍스처가 깨질 위험이 거의 없음.*
- [ ] **Blender Check & Convert**
    - FBX 임포트 후 애니메이션이 정상 재생되는지 확인.
    - **NLA Editor:** 각 동작(Action)의 이름이 `Idle`, `Walk`, `Run` 인지 확인 및 정리.
    - **GLB Export:** 압축 옵션을 켜고 `.glb` 포맷으로 내보내기.

### Phase 2: 프로젝트 세팅 (Setup)
**목표:** 로컬 개발 환경 구성

- [ ] **디렉토리 구조**
    ```text
    /project-root
      ├── /public
      │    └── milo_poly.glb  (변환된 파일)
      ├── /src
      │    ├── main.js        # Scene 설정
      │    ├── CatBrain.js    # 동작 제어 (FSM)
      │    └── style.css
      ├── index.html
      └── package.json
    ```
- [ ] **패키지 설치:** `npm install three vite`

### Phase 3: 로직 구현 (Implementation)

#### A. 씬 구성 (main.js)
- [ ] **Scene/Camera/Renderer:** 기본 Three.js 보일러플레이트 작성.
- [ ] **Lighting:** Polyart 스타일을 살리기 위해 `AmbientLight`(은은함) + `DirectionalLight`(그림자 강조) 조합 권장.

#### B. 고양이 로직 (CatBrain.js)
- [ ] **GLB Load:** `milo_poly.glb` 로드.
- [ ] **Animation Blending (핵심):**
    - 상태 전환 시 `crossFadeTo(nextAction, 0.5)` 사용하여 부드럽게 연결.
    - *Polyart의 각진 그래픽과 부드러운 모션이 결합되어 독특한 매력을 줌.*
- [ ] **Locomotion:**
    - `lookAt(mousePoint)`: 마우스 방향 바라보기.
    - `translateZ(speed)`: 전진.

#### C. 인터랙션 (Interaction)
- [ ] **Raycasting:** 마우스 커서의 3D 월드 좌표 계산.
- [ ] **Distance Logic:**
    - `Dist > 2.0`: **Run** (Speed: 5.0)
    - `0.5 < Dist <= 2.0`: **Walk** (Speed: 1.5)
    - `Dist <= 0.5`: **Idle** (Speed: 0)

---

## 4. 예상 결과물 (Deliverables)

1.  **초경량 웹 데모:** Polyart 모델 특성상 파일 크기가 매우 작음 (웹 최적화 최상).
2.  **부드러운 모션:** Milo 시리즈 고유의 고품질 애니메이션 데이터는 그대로 유지됨.
3.  **확장성:** 추후 색상 변경(재질 수정)이 코드로도 가능함 (Polyart는 텍스처 대신 머티리얼 컬러를 쓰는 경우가 많음).