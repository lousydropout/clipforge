import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface WelcomeScreenProps {
  onNavigate: (workflow: 'import' | 'screen' | 'overlay') => void;
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">ClipForge</h1>
          <p className="text-xl text-gray-300 mb-2">Simple video editing and recording</p>
          <p className="text-gray-400">Choose your workflow to get started</p>
        </div>

        {/* Workflow Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Import Video */}
          <Card className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <CardTitle className="text-2xl text-white">Import Video</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-6">
                Edit an existing video file. Trim, adjust speed, change resolution, and export your clip.
              </p>
              <Button 
                onClick={() => onNavigate('import')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Start Editing
              </Button>
            </CardContent>
          </Card>

          {/* Screen Recording */}
          <Card className="bg-gray-800 border-gray-700 hover:border-green-500 transition-colors cursor-pointer group">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">🖥️</div>
              <CardTitle className="text-2xl text-white">Screen Recording</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-6">
                Record your screen with microphone audio. Perfect for tutorials, presentations, and demos.
              </p>
              <Button 
                onClick={() => onNavigate('screen')}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                Start Recording
              </Button>
            </CardContent>
          </Card>

          {/* Screen + Overlay */}
          <Card className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors cursor-pointer group">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">🎥</div>
              <CardTitle className="text-2xl text-white">Screen + Overlay</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-6">
                Record your screen and webcam simultaneously. Create picture-in-picture videos with ease.
              </p>
              <Button 
                onClick={() => onNavigate('overlay')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                size="lg"
              >
                Start Recording
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            All processing happens locally on your device. No data is sent to external servers.
          </p>
        </div>
      </div>
    </div>
  );
}
