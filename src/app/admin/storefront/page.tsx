"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StorefrontSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  
  const [reels, setReels] = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        try {
          if (data.reels_array) setReels(JSON.parse(data.reels_array));
          if (data.testimonials_array) setTestimonials(JSON.parse(data.testimonials_array));
        } catch(e) {}
        setLoading(false);
      });
  }, []);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'reels' | 'testimonials') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(type);

    try {
      // 1. Get Signature
      const sigRes = await fetch("/api/admin/cloudinary-signature");
      if (!sigRes.ok) throw new Error("Signature failed");
      const { signature, timestamp, cloudName, apiKey } = await sigRes.json();

      // 2. Upload direct to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "rebel-season/storefront");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      
      const data = await uploadRes.json();
      if (!data.secure_url) {
        console.error("Cloudinary Error Details:", data);
        throw new Error(data.error?.message || "Upload failed");
      }

      if (type === 'reels') {
        setReels(prev => [...prev, data.secure_url]);
      } else {
        setTestimonials(prev => [...prev, data.secure_url]);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Make sure the file is not corrupted.");
    } finally {
      setUploading(null);
    }
  };

  const removeMedia = (index: number, type: 'reels' | 'testimonials') => {
    if (type === 'reels') {
      setReels(prev => prev.filter((_, i) => i !== index));
    } else {
      setTestimonials(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        reels_array: JSON.stringify(reels),
        testimonials_array: JSON.stringify(testimonials)
      };
      
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) alert("Settings saved!");
      else alert("Failed to save.");
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>;

  const renderMediaGrid = (items: string[], type: 'reels' | 'testimonials') => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((url, i) => (
        <div key={i} className="relative border border-gray-200 rounded-md bg-gray-50 aspect-[9/16] overflow-hidden group">
          {url.match(/\.(mp4|webm|ogg)$/i) ? (
            <video src={url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : (
            <img src={url} className="w-full h-full object-cover" alt="Media" />
          )}
          <button 
            onClick={() => removeMedia(i, type)}
            className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      
      <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-md bg-gray-50 aspect-[9/16] flex flex-col items-center justify-center hover:bg-gray-100 transition-colors">
        {uploading === type ? <Loader2 size={24} className="animate-spin text-gray-400" /> : <Plus size={24} className="text-gray-400" />}
        <span className="text-sm font-medium text-gray-500 mt-2">Add {type === 'reels' ? 'Reel' : 'Image'}</span>
        <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => handleMediaUpload(e, type)} disabled={uploading !== null} />
      </label>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Storefront Media Settings</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-black text-white px-6">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Reels Section Media</h2>
          {renderMediaGrid(reels, 'reels')}
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Testimonials Section Media</h2>
          {renderMediaGrid(testimonials, 'testimonials')}
        </div>
      </div>
    </div>
  );
}
