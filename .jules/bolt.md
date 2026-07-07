## 2026-07-07 - React.memo for Large Calendar Table
**Learning:** Calendar components with extensive nested loops and prop drilling cause severe performance issues in React due to unnecessary re-renders of the large CalendarTable component when a parent state updates (like navigating between months or selecting filters).
**Action:** Use React.memo on large child components, especially components rendering tables with many rows and cells, to prevent them from re-rendering unless their specific props change.
