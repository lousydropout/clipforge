import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { Mic, MicOff } from "lucide-react";

export interface MicrophoneSelectorProps {
  enabled: boolean;
  selectedDeviceId: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onDeviceChange: (deviceId: string | null) => void;
  disabled?: boolean;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

export function MicrophoneSelector({ 
  enabled, 
  selectedDeviceId, 
  onEnabledChange, 
  onDeviceChange, 
  disabled 
}: MicrophoneSelectorProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available audio input devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // First try to enumerate devices without requesting permission
        let deviceList = await navigator.mediaDevices.enumerateDevices();
        let audioInputs = deviceList
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`
          }));

        // If no labels (permission not granted), try requesting permission
        if (audioInputs.length > 0 && audioInputs[0].label.includes('Microphone')) {
          try {
            // Request permission with a temporary stream
            const tempStream = await navigator.mediaDevices.getUserMedia({ 
              audio: { 
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              } 
            });
            
            // Stop the temporary stream immediately
            tempStream.getTracks().forEach(track => track.stop());
            
            // Re-enumerate to get proper labels
            deviceList = await navigator.mediaDevices.enumerateDevices();
            audioInputs = deviceList
              .filter(device => device.kind === 'audioinput')
              .map(device => ({
                deviceId: device.deviceId,
                label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`
              }));
          } catch (permError) {
            console.warn("Permission denied for microphone access:", permError);
            // Continue with generic labels
          }
        }
        
        setDevices(audioInputs);
        
        // Auto-select first device if none selected
        if (audioInputs.length > 0 && !selectedDeviceId) {
          onDeviceChange(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.warn("Failed to enumerate audio devices:", error);
        setDevices([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, [selectedDeviceId, onDeviceChange]);

  const getSelectedDeviceLabel = () => {
    if (!enabled) return "Microphone disabled";
    if (isLoading) return "Loading devices...";
    if (devices.length === 0) return "No microphones found";
    
    const selected = devices.find(d => d.deviceId === selectedDeviceId);
    return selected?.label || "Default Microphone";
  };

  const handleDeviceSelect = (deviceId: string) => {
    onDeviceChange(deviceId);
  };

  const handleToggleEnabled = (checked: boolean) => {
    onEnabledChange(checked);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggleEnabled}
          disabled={disabled || devices.length === 0}
          className="data-[state=checked]:bg-green-600"
        />
        <span className="text-sm text-gray-300">
          {enabled ? "On" : "Off"}
        </span>
      </div>

      {/* Device Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled || !enabled || devices.length === 0}
            variant="outline"
            className="flex items-center gap-2 min-w-[200px] justify-start"
          >
            {enabled ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
            <span className="truncate">{getSelectedDeviceLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {devices.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => handleDeviceSelect(device.deviceId)}
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              <span className="truncate">{device.label}</span>
            </DropdownMenuItem>
          ))}
          {devices.length === 0 && (
            <DropdownMenuItem disabled>
              <MicOff className="h-4 w-4" />
              No microphones available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
