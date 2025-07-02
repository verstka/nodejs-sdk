# Verstka SDK Demo

Простое Express приложение для демонстрации работы с Verstka Node.js SDK.

## Запуск

1. Установить зависимости:
```bash
cd example
npm install
```

2. Настроить переменные окружения:
```bash
cp .env.example .env
# Отредактировать .env файл с вашими API ключами Verstka
```

3. Запустить сервер:

```bash
# Запуск с туннелем verstka-demo.loca.lt
npm start

# Разработка с автоперезагрузкой и туннелем
npm run dev
```

4. Открыть в браузере:
```
http://localhost:3000
```

## 🌐 Работа с туннелем

**По умолчанию** все команды используют туннель с поддоменом `verstka-demo.loca.lt`:

- **`npm run dev`** - автоматически создает туннель `https://verstka-demo.loca.lt`
- **Кастомный поддомен**: изменить можно в `.env` файле через `TUNNEL_SUBDOMAIN`
- **Отключить туннель**: закомментировать строку `import localtunnel` в `server.js`

### Пример вывода:
```
🚀 Local server running at http://localhost:3000
⏳ Setting up tunnel...
🌐 Tunnel created: https://verstka-demo.loca.lt
📧 Callback URL: https://verstka-demo.loca.lt/api/verstka/callback

🎯 Ready to receive callbacks from Verstka!
```

### Дополнительные команды:
```bash
# Только создать туннель на порт 3000
npm run tunnel

# Создать туннель с кастомным поддоменом verstka-demo
npm run tunnel:custom
```

## Что демонстрирует

- ✅ Интеграция Verstka SDK в Express приложение
- ✅ Открытие редактора для Desktop и Mobile версий
- ✅ Автоматическое открытие редактора в новой вкладке
- ✅ Обработка callback'ов от Verstka при сохранении
- ✅ Проверка подписей для безопасности
- ✅ **Автоматическое скачивание и сохранение картинок**
- ✅ **Публичный доступ через туннель для callback'ов**
- ✅ Показ результатов на странице

## Структура

```
example/
├── server.js             # 🚀 Express сервер с автоматическим туннелем
├── public/
│   ├── index.html        # Главная страница
│   └── script.js         # Логика кнопок
├── uploads/              # 📁 Сохраненные файлы из Verstka
│   ├── demo-article-desktop/  # Файлы desktop версии
│   └── demo-article-mobile/   # Файлы mobile версии
├── data.json             # Демо данные
└── package.json          # Зависимости
```

## 🚀 Быстрый старт

```bash
cd example
npm install
cp .env.example .env
# Заполнить API ключи в .env
npm run dev
```

Готово! Теперь по адресу `https://verstka-demo.loca.lt` доступен твой локальный сервер. 