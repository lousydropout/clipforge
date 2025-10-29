import { ResolutionControls } from "./ResolutionControls";
import { ExportDialog } from "./ExportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function SettingsPanel() {
  return (
    <div className="space-y-4">
      {/* Resolution Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Output Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResolutionControls />
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Export Video</CardTitle>
        </CardHeader>
        <CardContent>
          <ExportDialog />
        </CardContent>
      </Card>
    </div>
  );
}
