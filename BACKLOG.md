# Бэклог задач (Backlog)

## 1. ~~Баг: Deadlock при комбинации Skip + Join~~ — ИСПРАВЛЕНО

**Тип:** Bug / Critical
**Статус:** Роутер репортит невыбранные источники join как `skipped` (`reportingSkippedBranches` в `build.ts`), тесты: `tests/graph/fork-join/skip-join.test.ts`.
**Остаток:** явный `Skip` (`skip-wrap`) теперь перенаправляет выполнение во все барьеры, устраняя зависание.
**Описание:** Если роутер пропускает агента (например, через `routeManyOrSkip`), узел `skip-wrap` проглатывает выполнение. Если после этого стоит строгий барьер `.join()`, граф зависает навсегда, ожидая пропущенного агента.
**Задача:** Научить `skip-wrap` корректно рапортовать барьеру (через `state.forks`), что ветка пропущена, чтобы барьер мог сняться.
**Локация:** `packages/graphcompose/src/graph/build.ts` (см. комментарий `TODO: we should report to the corresponding barrier`).

## 2. ~~Фича: Human-in-the-loop (Интерактивные паузы)~~ — ИСПРАВЛЕНО

**Тип:** Feature
**Описание:** Поддержка интерактивной паузы внутри графа. Агент должен уметь заморозить выполнение и запросить ввод пользователя (например, разрешение на деплой).
**Задача:** Вывести API-метод (например, `WorkflowContext.askHuman()`), обрабатывать его через `app.pause` и дождаться `app.resume` с ответом пользователя.

## 3. ~~Фича: Токеновое стриминг-вещание (Real-time Streaming)~~ — ИСПРАВЛЕНО

**Тип:** Feature
**Описание:** Сейчас агенты возвращают ответ только после полной генерации (что долго).
**Задача:** Прокинуть поддержку `textDelta` и `toolCall` стримов из LangChain/LangGraph наружу через `app.execute()`, чтобы UI или CLI могли печатать ответ агента посимвольно в реальном времени.

## 4. ~~Улучшение: CLI-команда `gc run`~~ — ИСПРАВЛЕНО

**Тип:** Feature / DX
**Описание:** Сейчас CLI позволяет чатиться (`gc chat`) или генерировать код (`gc generate`).
**Задача:** Добавить команду `gc run my-workflow.ts --input "Start text"`, которая собирает граф on-the-fly, прогоняет его и выводит итоговый лог/результат прямо в терминал.

## 5. ~~Рефакторинг: Унификация API Декораторов и Роутера (DSL Phase 3)~~ — ИСПРАВЛЕНО

**Тип:** Refactoring / DX
**Описание:** Привести все декораторы к единому стандарту конфигурации (без магических функций и вложенных вызовов).
**Задачи:**

- **PromptOptions:** Внедрить единый интерфейс `{ prompt?: string; promptUrls?: readonly string[]; }` для `@Agent`, `@Router`, `@Tool` и `@Rag`.
- **Router API:** Убрать статическую функцию `route(A, "B")`. Массив `routes` в `@Router` должен принимать простые объекты `{ target: Agent, prompt: "...", promptUrls: [] }`.
- **Rag Config:** Переименовать `k` в `topK` внутри конфигурации `@Rag`.
- **Workflow Defaults:** В схеме `AgentsConfigSchema` переименовать `defaults.chat` в `defaults.models`. (Формат: `defaults: { models: { temperature: 0.5 }, history: { limit: 10 } }`).

## 6. ~~Улучшение: Angular-like Environments~~ — ИСПРАВЛЕНО

**Тип:** Feature / DX
**Описание:** Внедрить паттерн работы с окружениями, идентичный Angular (`src/environments/environment.ts`, `environment.prod.ts`, `environment.staging.ts`).
**Задачи:**

- Описать в документации и примерах стандартную структуру папок `environments/`.
- Использовать встроенный токен `ENV` для инъекции типизированного контракта окружения (например, `AppEnvironment`) внутрь тулов и агентов через `@Injectable({ deps: [ENV] })`.
- Сделать пример `Job Scout` референсным для этого подхода.

- Добавить флаг `--env` (или `-e`) во все CLI команды (`gc chat`, `gc run`, `gc check` и т.д.). Например: `gc chat --env=staging`.
- Этот флаг будет прокидывать переменную окружения (например, `process.env.GC_ENV = 'staging'` или стандартный `NODE_ENV`), на основе которой разработчик сможет переключать контракты.

- Загрузка будет происходить **через Dependency Injection** (DI). CLI автоматически ищет папку `environments`, загружает нужный файл (например, `environment.staging.ts` для `--env=staging`) и провайдит найденный объект `environment` в токен `ENV`. Пользователю достаточно заинжектить `ENV` в свои компоненты без прямых статических импортов, что избавит от необходимости писать кастомные лоадеры и хардкодить `import`.

## 7. Рефакторинг: Модульность импортов (Subpath Exports)

**Тип:** Refactoring / Architecture
**Описание:** Разделить единый корень `"graphcompose"` на строгие логические пакеты по аналогии с Angular (`@angular/core`, `@angular/router`). Это избавит от "свалки" импортов и сделает API интуитивно понятным.
**Задачи:**

- Настроить `exports` в `package.json` и разнести индексные файлы по саб-пакетам:
  - `graphcompose/core` — `Agent`, `Workflow`, `Injectable`, `ENV`.
  - `graphcompose/router` (или `/graph`) — `Router`, `WorkflowStart`, `WorkflowFinish`, `from`, `chain`, `Skip`, `Self`.
  - `graphcompose/tool` — `Tool`, `ToolHandler`, `ToolContext`.
  - `graphcompose/rag` — `Rag`, `RagConnector`.
  - `graphcompose/mcp` — `McpServer`, `McpTool`, `McpServerClient`.
  - `graphcompose/testing` — утилиты для тестов (`workflowOf`, `toolOf`).
  - `graphcompose/dto` — (уже существует).
