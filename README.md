# 타이타닉 생존 예측 연구소

한국어 정적 웹앱. 실제 학습 모델을 JavaScript에서 실행하며 입력은 서버로 전송하지 않습니다. 랜덤 사람 버튼은 891명 중 한 승객의 특징을 채우고 즉시 예측합니다.

## 데이터 및 검증

원본: https://github.com/datasciencedojo/datasets/blob/master/titanic.csv (891명).
목표는 Survived. 승객 ID, 이름, 티켓 번호, 객실 번호는 예측 특징으로 사용하지 않습니다.
Ticket 그룹으로 학습 714명 / 별도 검증 177명을 분리했습니다. 동일 티켓은 각 분리와 CV 폴드 사이에 겹치지 않습니다. 서로 다른 티켓을 가진 가족은 겹칠 수 있습니다.
학습 안에서 StratifiedGroupKFold 5겹, seed 42. 결측값 중앙값 대체와 표준화는 Pipeline 안에서 폴드별 적합합니다. 6개 후보의 CV 로그 손실로 선택하고 검증을 한 번 평가합니다. 최종 배포 모델은 전체 데이터로 재학습하므로 검증 수치는 재학습 전 모델의 결과입니다.

선택: Gradient boosting family. CV 로그 손실 0.4252, CV ROC AUC 0.8650, CV 정확도 82.63%. 별도 검증 정확도 79.10%, ROC AUC 0.8535, 로그 손실 0.4415, Brier 0.1401.
확률 보정은 하지 않았습니다. 작은 역사 표본이며 실제 개인의 결과를 보장하지 않습니다. 동행 가족당 운임은 입력된 가족 수로 나눈 파생 특징이며 실제 티켓 인원당 운임을 의미하지 않습니다.

## 실행과 재현

Python 3와 `numpy pandas scikit-learn`을 설치한 후 `python tools/train.py`로 학습합니다. 재현 환경 버전은 requirements.txt 참조.
`node tools/check.mjs`는 sklearn과 JavaScript 모델 확률 일치(허용 오차 1e-6) 및 결측/경계 입력을 확인합니다.
`python -m http.server 8000` 실행 후 http://localhost:8000 에서 사용합니다. GitHub Pages는 main 브랜치 루트 디렉터리를 공개합니다.

`outputs/titanic.xlsx`는 승객 원본과 모델 비교, 검증 결과를 포함합니다. `report.json`에 데이터 해시, 분리 seed와 검증 승객 ID를 저장합니다.
