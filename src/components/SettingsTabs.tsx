import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TrimControls } from "./TrimControls";
import { ResolutionControls } from "./ResolutionControls";
import { ExportDialog } from "./ExportDialog";

export function SettingsTabs() {
  return (
    <Tabs defaultValue="trim" className="w-full">
      <TabsList className="grid w-full grid-cols-3 pb-8 mb-8">
        <TabsTrigger value="trim" className="cursor-pointer">
          Trim Settings
        </TabsTrigger>
        <TabsTrigger value="resolution" className="cursor-pointer">
          Output Resolution
        </TabsTrigger>
        <TabsTrigger value="export" className="cursor-pointer">
          Export Video
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trim" className="mt-4 border rounded-lg p-4">
        <TrimControls />
      </TabsContent>

      <TabsContent value="resolution" className="mt-4 border rounded-lg p-4">
        <ResolutionControls />
      </TabsContent>

      <TabsContent value="export" className="mt-4 border rounded-lg p-4">
        <ExportDialog />
      </TabsContent>
    </Tabs>
  );
}
