const fs = require('fs');
const file = '/Users/pavelravvich/projects/langgraph-ts-template/EXAMPLES_IDEAS.md';
let code = fs.readFileSync(file, 'utf-8');

const newExample = `
## Архитектурные паттерны (Core Patterns)

- **Trip Booking Workflow (SAGA)**: Демонстрация паттерна SAGA и Subgraphs. Многошаговый процесс (бронь отеля, перелета, машины). При сбое на любом шаге (например, ошибка оплаты или отмена билета) срабатывает оркестратор, который проходит по истории выполнения (state.path) в обратном порядке и вызывает компенсирующие транзакции (отмена брони отеля, если не удалось купить билет).`;

code = code + newExample;
fs.writeFileSync(file, code);
