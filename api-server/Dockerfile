    # 1. Node.js와 Python을 모두 포함한 이미지 사용
    FROM node:20

    # 2. Python 설치
    RUN apt-get update && apt-get install -y \
        python3 \
        python3-pip \
        python3-venv \
        && rm -rf /var/lib/apt/lists/*

    # 3. 작업 디렉토리 설정
    WORKDIR /usr/src/app

    # 4. package.json, package-lock.json 복사
    COPY package*.json ./

    # 5. Node.js 의존성 설치
    RUN npm install

    # 6. 소스 코드 복사
    COPY . .

    # 7. Python 가상환경 생성 및 의존성 설치
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install requests beautifulsoup4 lxml mysql-connector-python

# 8. 시간대를 한국 시간으로 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

    # 9. 서버 포트 오픈 (예: 3000)
    EXPOSE 3000

    # 10. 서버 실행 명령
    CMD ["node", "app.js"]