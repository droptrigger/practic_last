# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем React приложение
RUN npm run build

# Устанавливаем рабочую директорию для backend
WORKDIR /app/backend

# Устанавливаем зависимости для backend
RUN npm install express cors sqlite3

# Открываем порт
EXPOSE 4000

# Устанавливаем переменную окружения
ENV NODE_ENV=production

# Запускаем приложение
CMD ["node", "index.js"]
