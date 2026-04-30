import './styles.css';
import { WebsiteLayout } from './components/WebsiteLayout';
import { homePage } from './pages/home';
import { bookPage } from './pages/book';

function getPage() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/book') return bookPage;
  return homePage;
}

export default function App() {
  return <WebsiteLayout page={getPage()} />;
}
