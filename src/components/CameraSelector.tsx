import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Camera, CameraOff } from "lucide-react";

export interface CameraSelectorProps {
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
  disabled?: boolean;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

export function CameraSelector({ 
  selectedDeviceId, 
  onDeviceChange, 
  disabled 
}: CameraSelectorProps) {
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available video input devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // First try to enumerate devices without requesting permission
        let deviceList = await navigator.mediaDevices.enumerateDevices();
        let videoInputs = deviceList
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 8)}`
          }));

        // If no labels (permission not granted), try requesting permission
        if (videoInputs.length > 0 && videoInputs[0].label.includes('Camera')) {
          try {
            // Request permission with a temporary stream
            const tempStream = await navigator.mediaDevices.getUserMedia({ 
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            });
            
            // Stop the temporary stream immediately
            tempStream.getTracks().forEach(track => track.stop());
            
            // Re-enumerate to get proper labels
            deviceList = await navigator.mediaDevices.enumerateDevices();
            videoInputs = deviceList
              .filter(device => device.kind === 'videoinput')
              .map(device => ({
                deviceId: device.deviceId,
                label: device.label || `Camera ${device.deviceId.slice(0, 8)}`
              }));
          } catch (permError) {
            console.warn("Permission denied for camera access:", permError);
            // Continue with generic labels
          }
        }
        
        setDevices(videoInputs);
        
        // Auto-select first device if none selected
        if (videoInputs.length > 0 && !selectedDeviceId) {
          onDeviceChange(videoInputs[0].deviceId);
        }
      } catch (error) {
        console.warn("Failed to enumerate video devices:", error);
        setDevices([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, [selectedDeviceId, onDeviceChange]);

  const getSelectedDeviceLabel = () => {
    if (isLoading) return "Loading cameras...";
    if (devices.length === 0) return "No cameras found";
    
    const selected = devices.find(d => d.deviceId === selectedDeviceId);
    return selected?.label || "Select camera";
  };

  const handleDeviceSelect = (deviceId: string) => {
    onDeviceChange(deviceId);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled || isLoading || devices.length === 0}
            variant="outline"
            className="flex items-center gap-2 min-w-[200px] justify-start"
          >
            <Camera className="h-4 w-4" />
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
              <Camera className="h-4 w-4" />
              <span className="truncate">{device.label}</span>
            </DropdownMenuItem>
          ))}
          {devices.length === 0 && !isLoading && (
            <DropdownMenuItem disabled>
              <CameraOff className="h-4 w-4" />
              No cameras available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
