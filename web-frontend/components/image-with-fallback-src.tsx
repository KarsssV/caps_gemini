import Image, {ImageProps} from "next/image";
import { useEffect, useState } from "react";

type ImageWithFallbackSrc = ImageProps & {
  fallbackSrc: string;
};

const ImageWithFallback = ({
  src,
  alt = "",
  fallbackSrc,
  ...props
}: ImageWithFallbackSrc) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  return (
    <Image
      alt={alt}
      onError={() => setError(true)}
      src={error ? fallbackSrc : src}
      {...props}
    />
  )
}

export default ImageWithFallback;