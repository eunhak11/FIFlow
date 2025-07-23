    # 1. Node.js 공식 이미지 사용
    FROM node:20

    # 2. 작업 디렉토리 설정
    WORKDIR /usr/src/app

    # 3. package.json, package-lock.json 복사
    COPY package*.json ./

    # 4. 의존성 설치
    RUN npm install

    # 5. 소스 코드 복사
    COPY . .

    # 6. 서버 포트 오픈 (예: 3000)
    EXPOSE 3000

    # 7. 서버 실행 명령
    CMD ["node", "app.js"]