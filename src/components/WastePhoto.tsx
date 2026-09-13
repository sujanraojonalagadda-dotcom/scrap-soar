import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getWastePhotoUrl } from "@/lib/photo.functions";

/** Shows a stored waste photo through a short-lived private link. */
export function WastePhoto({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const fetchUrl = useServerFn(getWastePhotoUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) return;
    let active = true;
    fetchUrl({ data: { path } })
      .then((result) => {
        if (active) setUrl(result.url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [fetchUrl, path]);

  if (!path) return null;
  if (failed) return <p className="text-xs text-muted-foreground">Photo could not be loaded.</p>;
  if (!url) return <div className={`animate-pulse rounded-lg bg-muted ${className ?? "h-40 w-full"}`} />;
  return <img src={url} alt={alt} className={className ?? "h-40 w-full rounded-lg object-cover"} />;
}
