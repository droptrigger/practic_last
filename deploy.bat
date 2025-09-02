@echo off
echo 🚀 Начинаем деплой приложения...

REM Проверяем, что мы в правильной директории
if not exist "package.json" (
    echo ❌ Ошибка: package.json не найден. Запустите скрипт из корневой директории проекта.
    pause
    exit /b 1
)

REM Собираем React приложение
echo 📦 Собираем React приложение...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Ошибка при сборке React приложения
    pause
    exit /b 1
)

echo ✅ React приложение успешно собрано

REM Проверяем, что build директория создана
if not exist "build" (
    echo ❌ Ошибка: директория build не создана
    pause
    exit /b 1
)

echo 🎉 Приложение готово к деплою!
echo.
echo 📋 Следующие шаги:
echo 1. Загрузите код в GitHub репозиторий
echo 2. Выберите хостинг из DEPLOYMENT.md
echo 3. Следуйте инструкциям для выбранного хостинга
echo.
echo 💡 Рекомендуемые хостинги:
echo    - Railway (railway.app) - самый простой
echo    - Render (render.com) - бесплатный
echo    - Heroku (heroku.com) - классический
echo.
pause
