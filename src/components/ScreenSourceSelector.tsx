import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Monitor, ChevronDown } from "lucide-react";
import { ipcClient } from "../services/ipcClient";

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface ScreenSourceSelectorProps {
  selectedSourceId: string | null;
  onSourceChange: (sourceId: string | null) => void;
  disabled?: boolean;
}

export function ScreenSourceSelector({ 
  selectedSourceId, 
  onSourceChange, 
  disabled 
}: ScreenSourceSelectorProps) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available screen sources
  useEffect(() => {
    const loadSources = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const sourceList = await ipcClient.getSources();
        console.log("ScreenSourceSelector: Loaded sources:", sourceList);
        setSources(sourceList);
        
        // Auto-select first source if none selected
        if (sourceList.length > 0 && !selectedSourceId) {
          console.log("ScreenSourceSelector: Auto-selecting first source:", sourceList[0].id);
          onSourceChange(sourceList[0].id);
        }
      } catch (err) {
        console.error("Failed to load screen sources:", err);
        setError("Failed to load screen sources");
        setSources([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSources();
  }, [selectedSourceId, onSourceChange]);

  const handleSourceSelect = (sourceId: string) => {
    console.log("Selecting source:", sourceId);
    onSourceChange(sourceId);
  };

  const getSelectedSourceName = () => {
    if (isLoading) return "Loading sources...";
    if (error) return "Error loading sources";
    if (sources.length === 0) return "No sources available";
    
    const selected = sources.find(s => s.id === selectedSourceId);
    return selected?.name || "Select source";
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sourceList = await ipcClient.getSources();
      setSources(sourceList);
    } catch (err) {
      console.error("Failed to refresh screen sources:", err);
      setError("Failed to refresh sources");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled || isLoading || sources.length === 0}
            variant="outline"
            className="flex items-center gap-2 min-w-[200px] justify-start"
          >
            <Monitor className="h-4 w-4" />
            <span className="truncate">{getSelectedSourceName()}</span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          {sources.map((source) => (
            <DropdownMenuItem
              key={source.id}
              onClick={() => handleSourceSelect(source.id)}
              className="flex items-center gap-3 p-3"
            >
              <img 
                src={source.thumbnail} 
                alt={source.name}
                className="w-12 h-8 object-cover rounded border"
              />
              <span className="truncate flex-1">{source.name}</span>
            </DropdownMenuItem>
          ))}
          {sources.length === 0 && !isLoading && (
            <DropdownMenuItem disabled>
              <Monitor className="h-4 w-4" />
              No screen sources available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={disabled || isLoading}
        className="px-2"
      >
        ↻
      </Button>
    </div>
  );
}
