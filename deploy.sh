#!/bin/bash

# Скрипт для быстрого деплоя приложения

echo "🚀 Начинаем деплой приложения..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

# Собираем React приложение
echo "📦 Собираем React приложение..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке React приложения"
    exit 1
fi

echo "✅ React приложение успешно собрано"

# Проверяем, что build директория создана
if [ ! -d "build" ]; then
    echo "❌ Ошибка: директория build не создана"
    exit 1
fi

echo "🎉 Приложение готово к деплою!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Загрузите код в GitHub репозиторий"
echo "2. Выберите хостинг из DEPLOYMENT.md"
echo "3. Следуйте инструкциям для выбранного хостинга"
echo ""
echo "💡 Рекомендуемые хостинги:"
echo "   - Railway (railway.app) - самый простой"
echo "   - Render (render.com) - бесплатный"
echo "   - Heroku (heroku.com) - классический"
