import { useProjectStore } from "./store/useProjectStore";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ImportVideoEditor } from "./components/ImportVideoEditor";
import { ScreenRecordingEditor } from "./components/ScreenRecordingEditor";
import { ScreenOverlayEditor } from "./components/ScreenOverlayEditor";
import "./App.css";

function App() {
  const { currentWorkflow, setWorkflow } = useProjectStore();

  const handleNavigate = (workflow: 'import' | 'screen' | 'overlay') => {
    setWorkflow(workflow);
  };

  const handleBackToWelcome = () => {
    setWorkflow('welcome');
  };

  // Render appropriate component based on current workflow
  switch (currentWorkflow) {
    case 'import':
      return <ImportVideoEditor onBackToWelcome={handleBackToWelcome} />;
    case 'screen':
      return <ScreenRecordingEditor onBackToWelcome={handleBackToWelcome} />;
    case 'overlay':
      return <ScreenOverlayEditor onBackToWelcome={handleBackToWelcome} />;
    case 'welcome':
    default:
      return <WelcomeScreen onNavigate={handleNavigate} />;
  }
}

export default App;
