/**
 * Корневой экран SPA. Сейчас открывает мероприятие «Окна»; в дальнейшем здесь
 * будет навигация по списку мероприятий (см. /api/measures/).
 */
import './App.css'
import { WindowsMeasure } from './measures/windows/WindowsMeasure'

function App() {
  return <WindowsMeasure />
}

export default App
