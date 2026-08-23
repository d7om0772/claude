# صورة تشغيل المشروع كاملاً: الواجهة والرندر في عملية واحدة.
FROM node:22-bookworm-slim

# اعتماديات Chrome التي يحتاجها Remotion للرندر بلا واجهة رسومية.
# بدونها يُقلع المتصفح ثم يسقط برسالة غامضة عن مكتبة ناقصة.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
      libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 libdbus-1-3 \
      libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 \
      libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
      libxkbcommon0 libxrandr2 libxshmfence1 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# تنزيل متصفح الرندر وقت البناء لا وقت أول طلب: يجعل أول رندر سريعاً
# ولا يحتاج شبكة أثناء التشغيل.
RUN npx remotion browser ensure

# بناء الواجهة الساكنة التي يقدّمها الخادم
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
