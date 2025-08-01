#!/bin/bash

# 크롤러 가상환경 설정 스크립트

echo "크롤러 가상환경 설정을 시작합니다..."

# 가상환경이 없으면 생성
if [ ! -d "venv" ]; then
    echo "가상환경을 생성합니다..."
    python3 -m venv venv
fi

# 가상환경 활성화
echo "가상환경을 활성화합니다..."
source venv/bin/activate

# 필요한 패키지 설치
echo "필요한 패키지들을 설치합니다..."
pip install -r requirements.txt

echo "크롤러 설정이 완료되었습니다!"
echo "가상환경을 활성화하려면: source venv/bin/activate" 