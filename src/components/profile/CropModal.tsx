import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';

interface CropModalProps {
  imageSrc: string;
  type: 'avatar' | 'cover';
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  isUploading: boolean;
}

// Helper to extract cropped image as Blob
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImageBitmap(await fetch(imageSrc).then(r => r.blob()));
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/jpeg', 0.92);
  });
}

export default function CropModal({ imageSrc, type, onCropComplete, onCancel, isUploading }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const aspect = type === 'avatar' ? 1 : 3;
  const cropShape = type === 'avatar' ? 'round' : 'rect';

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedBlob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCropComplete(file);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pf-modal-overlay">
      <div className="pf-modal" style={{ maxWidth: 500 }}>
        <div className="pf-modal-h">
          <div className="pf-modal-title">Adjust {type === 'avatar' ? 'Profile Photo' : 'Cover Image'}</div>
          <button className="pf-modal-close" onClick={onCancel} disabled={isUploading}>×</button>
        </div>
        
        <div className="pf-modal-body" style={{ padding: 0 }}>
          <div style={{ position: 'relative', width: '100%', height: 300, background: '#111' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--lime)', height: 4, borderRadius: 2 }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                className="pf-cancel-btn" 
                onClick={onCancel}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                className="pf-save-btn" 
                onClick={handleCropAndUpload}
                disabled={isUploading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isUploading ? (
                  <><span className="pf-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading...</>
                ) : (
                  "Crop & Upload"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
